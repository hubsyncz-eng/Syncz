import express from 'express';
import { createServer as createHttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import {
  Agency,
  TimeSlot,
  Booking,
  Consultant,
  PartnerProfile,
  ActivityEvent,
  BatchGenerationParams,
  AppStatePayload,
  PropertyType,
} from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();
app.use(express.json());

// Helper to format ISO date YYYY-MM-DD
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get Monday of current week
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

// Global mutable state
let agencies: Agency[] = [];
let consultants: Consultant[] = [];
let partners: PartnerProfile[] = [];
let slots: TimeSlot[] = [];
let bookings: Booking[] = [];
let activities: ActivityEvent[] = [];
let connectedSockets = new Set<WebSocket>();

const agencyInfo = {
  name: 'Central Agência de Negócios & Parcerias',
  description: 'Unidade Centralizadora de Agendas Institucionais e Negociações Corporativas',
  autoConfirmEnabled: true,
  maxBookingsPerPartnerPerWeek: 5,
};

function initSeedData() {
  agencies = [];
  consultants = [];
  partners = [];
  slots = [];
  bookings = [];
  activities = [];
}

let db: any = null;
try {
  const configPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const fbApp = initializeApp(firebaseConfig, 'syncz-server-fb');
    db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
    console.log('[Firestore] Database connected on server:', firebaseConfig.firestoreDatabaseId);
  }
} catch (err) {
  console.warn('[Firestore] Initialization warning:', err);
}

async function persistDoc(collectionName: string, id: string, data: any) {
  if (!db || !id) return;
  try {
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(doc(db, collectionName, id), cleanData);
  } catch (err) {
    console.warn(`[Firestore] Failed to save ${collectionName}/${id}:`, err);
  }
}

async function removeDoc(collectionName: string, id: string) {
  if (!db || !id) return;
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (err) {
    console.warn(`[Firestore] Failed to delete ${collectionName}/${id}:`, err);
  }
}

let firestoreListenersAttached = false;

async function loadPersistedData() {
  if (!db) {
    return;
  }
  try {
    const [agSnap, ptSnap, csSnap, slSnap, bkSnap, actSnap] = await Promise.all([
      getDocs(collection(db, 'agencies')),
      getDocs(collection(db, 'partners')),
      getDocs(collection(db, 'consultants')),
      getDocs(collection(db, 'slots')),
      getDocs(collection(db, 'bookings')),
      getDocs(collection(db, 'activities')),
    ]);

    agencies = agSnap.docs.map((d: any) => d.data() as Agency);
    partners = ptSnap.docs.map((d: any) => d.data() as PartnerProfile);
    consultants = csSnap.docs.map((d: any) => d.data() as Consultant);
    slots = slSnap.docs.map((d: any) => d.data() as TimeSlot);
    bookings = bkSnap.docs.map((d: any) => d.data() as Booking);
    activities = actSnap.docs
      .map((d: any) => d.data() as ActivityEvent)
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    if (!firestoreListenersAttached) {
      firestoreListenersAttached = true;
      onSnapshot(
        collection(db, 'agencies'),
        (snap) => {
          agencies = snap.docs.map((d: any) => d.data() as Agency);
        },
        () => {}
      );
      onSnapshot(
        collection(db, 'partners'),
        (snap) => {
          partners = snap.docs.map((d: any) => d.data() as PartnerProfile);
        },
        () => {}
      );
      onSnapshot(
        collection(db, 'consultants'),
        (snap) => {
          consultants = snap.docs.map((d: any) => d.data() as Consultant);
        },
        () => {}
      );
      onSnapshot(
        collection(db, 'slots'),
        (snap) => {
          slots = snap.docs.map((d: any) => d.data() as TimeSlot);
        },
        () => {}
      );
      onSnapshot(
        collection(db, 'bookings'),
        (snap) => {
          bookings = snap.docs.map((d: any) => d.data() as Booking);
        },
        () => {}
      );
      onSnapshot(
        collection(db, 'activities'),
        (snap) => {
          activities = snap.docs
            .map((d: any) => d.data() as ActivityEvent)
            .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        },
        () => {}
      );
    }

    console.log(`[Firestore] Loaded definitive state: ${agencies.length} agencies, ${partners.length} partners, ${slots.length} slots, ${bookings.length} bookings.`);
  } catch (err) {
    console.error('[Firestore] Error loading persisted data:', err);
  }
}


function getFullState(): AppStatePayload {
  return {
    agencies,
    slots,
    bookings,
    consultants,
    partners,
    activities,
    onlineCount: Math.max(1, connectedSockets.size),
    agencyInfo,
  };
}

function broadcast(data: { type: string; payload: any }, excludeWs?: WebSocket) {
  const jsonStr = JSON.stringify(data);
  for (const client of connectedSockets) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(jsonStr);
      } catch (e) {
        console.error('Error broadcasting to client:', e);
      }
    }
  }
}

// REST API Endpoints
app.get('/api/state', (_req, res) => {
  res.json(getFullState());
});

// Authentication endpoint (Login com Usuário e Senha)
app.post('/api/auth/login', (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Por favor, informe o usuário e a senha.' });
  }

  const cleanUser = username.trim();
  const cleanPass = password.trim();

  // 1. Administrador: Usuário: Syncz | Senha: @dmin
  if (cleanUser.toLowerCase() === 'syncz' || (role === 'admin' && cleanUser.toLowerCase() === 'syncz')) {
    if (cleanPass !== '@dmin') {
      return res.status(401).json({
        error: 'Senha incorreta para o usuário Syncz. Senha correta: @dmin',
      });
    }
    return res.json({
      success: true,
      session: {
        role: 'admin',
        id: 'admin_syncz',
        name: 'Administrador Syncz',
        email: 'admin@syncz.com.br',
      },
    });
  }

  // 2. Agência: Login com E-mail, CNPJ, Nome, Responsável, ID ou Username
  const lowerUser = cleanUser.toLowerCase();
  const agency = agencies.find(
    (a) =>
      (a.email && a.email.toLowerCase() === lowerUser) ||
      (a.name && a.name.toLowerCase() === lowerUser) ||
      (a.name && `agência ${a.name.toLowerCase()}` === lowerUser) ||
      (a.name && `agencia ${a.name.toLowerCase()}` === lowerUser) ||
      (a.managerName && a.managerName.toLowerCase() === lowerUser) ||
      (a.cnpj && a.cnpj === cleanUser) ||
      (a.id && a.id.toLowerCase() === lowerUser) ||
      (a.username && a.username.toLowerCase() === lowerUser)
  );

  if (agency) {
    const validAgencyPass = agency.password || 'agencia123';
    if (cleanPass !== validAgencyPass) {
      return res.status(401).json({
        error: 'Senha incorreta para a agência informada.',
      });
    }
    return res.json({
      success: true,
      session: {
        role: 'agency',
        id: agency.id,
        name: agency.name,
        email: agency.email,
        agencyId: agency.id,
        representative: agency.managerName,
        cnpj: agency.cnpj,
        badgeColor: agency.badgeColor,
      },
    });
  }

  // 2.5. Usuário da Agência (Consultor): Login com E-mail Corporativo, Nome ou ID
  const consultant = consultants.find(
    (c) =>
      (c.email && c.email.toLowerCase() === lowerUser) ||
      (c.name && c.name.toLowerCase() === lowerUser) ||
      (c.id && c.id.toLowerCase() === lowerUser)
  );

  if (consultant) {
    const validConsultantPass = consultant.password || 'usuario123';
    if (cleanPass !== validConsultantPass) {
      return res.status(401).json({
        error: 'Senha incorreta para o usuário da agência informado.',
      });
    }
    const consultantAgency = agencies.find((a) => a.id === consultant.agencyId) || agencies[0];
    return res.json({
      success: true,
      session: {
        role: 'agency',
        id: consultant.id,
        name: consultant.name,
        email: consultant.email,
        agencyId: consultant.agencyId || consultantAgency?.id || 'ag_1',
        representative: consultant.name,
        badgeColor: consultant.avatarColor || consultantAgency?.badgeColor,
        isAgencyUser: true,
      },
    });
  }

  // 3. Parceiro Negocial: Login com E-mail, CNPJ, Nome, Representante, ID ou Username
  const partner = partners.find(
    (p) =>
      (p.email && p.email.toLowerCase() === lowerUser) ||
      (p.name && p.name.toLowerCase() === lowerUser) ||
      (p.representative && p.representative.toLowerCase() === lowerUser) ||
      (p.cnpj && p.cnpj === cleanUser) ||
      (p.id && p.id.toLowerCase() === lowerUser) ||
      (p.username && p.username.toLowerCase() === lowerUser)
  );

  if (partner) {
    const validPartnerPass = partner.password || 'parceiro123';
    if (cleanPass !== validPartnerPass) {
      return res.status(401).json({
        error: 'Senha incorreta para o parceiro informado.',
      });
    }
    return res.json({
      success: true,
      session: {
        role: 'partner',
        id: partner.id,
        name: partner.name,
        email: partner.email,
        partnerId: partner.id,
        representative: partner.representative,
        cnpj: partner.cnpj,
        badgeColor: partner.badgeColor,
      },
    });
  }

  return res.status(401).json({
    error: 'Usuário não localizado. Verifique se o usuário ou e-mail foi digitado corretamente.',
  });
});

// Admin registers a new Agency
app.post('/api/agencies', (req, res) => {
  const { name, legalName, cnpj, address, email, phone, city, state, managerName, description, password } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Preencha os campos obrigatórios da agência.' });
  }

  const newAgency: Agency = {
    id: `ag_${Date.now()}`,
    name,
    legalName: legalName || '',
    cnpj: cnpj || '',
    address: address || '',
    email,
    phone: phone || '',
    city: city || 'São Paulo',
    state: state || 'SP',
    managerName: managerName || 'Responsável Técnico',
    description: description || 'Centralizadora de Agendas e Negociações',
    badgeColor: 'bg-blue-600',
    status: 'active',
    password: password || 'agencia123',
    createdAt: new Date().toISOString(),
  };

  agencies.push(newAgency);
  persistDoc('agencies', newAgency.id, newAgency);

  broadcast({
    type: 'AGENCY_REGISTERED',
    payload: { agency: newAgency, agencies },
  });

  return res.status(201).json(newAgency);
});

// Admin updates an existing Agency
app.put('/api/agencies/:id', (req, res) => {
  const { id } = req.params;
  const { name, legalName, cnpj, address, email, phone, city, state, managerName, description, password } = req.body;

  const idx = agencies.findIndex((a) => a.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Agência não encontrada.' });
  }

  if (!name || !email) {
    return res.status(400).json({ error: 'Preencha os campos obrigatórios da agência.' });
  }

  const updatedAgency: Agency = {
    ...agencies[idx],
    name: name.trim(),
    legalName: legalName !== undefined ? legalName.trim() : agencies[idx].legalName,
    cnpj: cnpj !== undefined ? cnpj.trim() : agencies[idx].cnpj,
    address: address !== undefined ? address.trim() : agencies[idx].address,
    email: email.trim(),
    phone: phone !== undefined ? phone.trim() : agencies[idx].phone,
    city: city || agencies[idx].city,
    state: state || agencies[idx].state,
    managerName: managerName || agencies[idx].managerName,
    description: description !== undefined ? description : agencies[idx].description,
    password: password || agencies[idx].password || 'agencia123',
  };

  agencies[idx] = updatedAgency;
  persistDoc('agencies', updatedAgency.id, updatedAgency);

  broadcast({
    type: 'AGENCY_REGISTERED',
    payload: { agency: updatedAgency, agencies },
  });

  return res.json(updatedAgency);
});

// Admin deletes an Agency
app.delete('/api/agencies/:id', (req, res) => {
  const { id } = req.params;
  const idx = agencies.findIndex((a) => a.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Agência não encontrada.' });
  }

  agencies = agencies.filter((a) => a.id !== id);
  removeDoc('agencies', id);

  broadcast({
    type: 'AGENCY_REGISTERED',
    payload: { agencies },
  });

  return res.json({ success: true });
});

// Admin or partner registers a new Partner
app.post('/api/partners', (req, res) => {
  const { name, segment, representative, email, phone, cnpj, password, allowedAgencyIds } = req.body;

  if (!name || !representative || !email) {
    return res.status(400).json({ error: 'Preencha os campos obrigatórios do parceiro.' });
  }

  const colors = ['bg-orange-500', 'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-indigo-500'];
  const newPartner: PartnerProfile = {
    id: `p_${Date.now()}`,
    name,
    segment: segment || 'Comércio & Serviços',
    representative,
    email,
    phone: phone || '',
    cnpj: cnpj || '',
    badgeColor: colors[Math.floor(Math.random() * colors.length)],
    password: password || 'parceiro123',
    allowedAgencyIds: Array.isArray(allowedAgencyIds) ? allowedAgencyIds : [],
    createdAt: new Date().toISOString(),
  };

  partners.push(newPartner);
  persistDoc('partners', newPartner.id, newPartner);

  broadcast({
    type: 'PARTNER_REGISTERED',
    payload: { partner: newPartner, partners },
  });

  return res.status(201).json(newPartner);
});

// Admin or partner updates an existing Partner
app.put('/api/partners/:id', (req, res) => {
  const { id } = req.params;
  const { name, segment, representative, email, phone, cnpj, password, allowedAgencyIds } = req.body;

  const idx = partners.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Parceiro não encontrado.' });
  }

  if (!name || !email || !cnpj) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios do parceiro.' });
  }

  const updatedPartner: PartnerProfile = {
    ...partners[idx],
    name: name.trim(),
    segment: segment || partners[idx].segment || 'Parceiro Negocial',
    representative: representative || name.trim(),
    email: email.trim(),
    phone: phone !== undefined ? phone.trim() : partners[idx].phone,
    cnpj: cnpj.trim(),
    password: password || partners[idx].password || 'parceiro123',
    allowedAgencyIds: Array.isArray(allowedAgencyIds)
      ? allowedAgencyIds
      : partners[idx].allowedAgencyIds || [],
  };

  partners[idx] = updatedPartner;
  persistDoc('partners', updatedPartner.id, updatedPartner);

  // Replicate updated partner details to all bookings of this partner
  let hasUpdatedBookings = false;
  bookings = bookings.map((b) => {
    if (b.partnerId === updatedPartner.id) {
      hasUpdatedBookings = true;
      const updatedB = {
        ...b,
        partnerName: updatedPartner.name,
        partnerRepresentative: updatedPartner.representative,
        partnerEmail: updatedPartner.email,
        partnerPhone: updatedPartner.phone || b.partnerPhone,
        partnerCnpj: updatedPartner.cnpj,
      };
      persistDoc('bookings', updatedB.id, updatedB);
      return updatedB;
    }
    return b;
  });

  broadcast({
    type: 'PARTNER_REGISTERED',
    payload: {
      partner: updatedPartner,
      partners,
      bookings: hasUpdatedBookings ? bookings : undefined,
    },
  });

  return res.json(updatedPartner);
});

// Admin deletes a Partner
app.delete('/api/partners/:id', (req, res) => {
  const { id } = req.params;
  const idx = partners.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Parceiro não encontrado.' });
  }

  partners = partners.filter((p) => p.id !== id);
  removeDoc('partners', id);

  broadcast({
    type: 'PARTNER_REGISTERED',
    payload: { partners },
  });

  return res.json({ success: true });
});

// Create Agency User (Consultant)
app.post('/api/consultants', (req, res) => {
  const { agencyId, name, role, department, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios do usuário.' });
  }

  const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-indigo-600', 'bg-amber-600', 'bg-cyan-600'];
  const newConsultant: Consultant = {
    id: `c_${Date.now()}`,
    agencyId: agencyId || agencies[0]?.id || 'ag_1',
    name: name.trim(),
    role: (role || 'Usuário da Agência').trim(),
    department: (department || 'Atendimento & Negócios').trim(),
    email: email.trim(),
    password: password.trim(),
    avatarColor: colors[Math.floor(Math.random() * colors.length)],
    specialties: ['Atendimento', 'Negócios'],
  };

  consultants.push(newConsultant);
  persistDoc('consultants', newConsultant.id, newConsultant);

  broadcast({
    type: 'CONSULTANTS_UPDATED',
    payload: { consultant: newConsultant, consultants },
  });

  return res.status(201).json(newConsultant);
});

// Update Agency User (Consultant)
app.put('/api/consultants/:id', (req, res) => {
  const { id } = req.params;
  const { name, role, department, email, password } = req.body;

  const idx = consultants.findIndex((c) => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios do usuário.' });
  }

  const updated: Consultant = {
    ...consultants[idx],
    name: name.trim(),
    role: (role || consultants[idx].role || 'Usuário da Agência').trim(),
    department: (department || consultants[idx].department || 'Atendimento & Negócios').trim(),
    email: email.trim(),
    password: password.trim(),
  };

  consultants[idx] = updated;
  persistDoc('consultants', updated.id, updated);

  broadcast({
    type: 'CONSULTANTS_UPDATED',
    payload: { consultant: updated, consultants },
  });

  return res.json(updated);
});

// Delete Agency User (Consultant)
app.delete('/api/consultants/:id', (req, res) => {
  const { id } = req.params;
  const idx = consultants.findIndex((c) => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  consultants = consultants.filter((c) => c.id !== id);
  removeDoc('consultants', id);

  broadcast({
    type: 'CONSULTANTS_UPDATED',
    payload: { consultants },
  });

  return res.json({ success: true });
});

// Create single slot
app.post('/api/slots', (req, res) => {
  const {
    agencyId,
    date,
    startTime,
    endTime,
    durationMinutes,
    consultantId,
    serviceCategory,
    modality,
    locationOrLink,
    notes,
  } = req.body;

  if (!date || !startTime || !endTime || !consultantId) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
  }

  const targetAgencyId = agencyId || agencies[0]?.id || 'ag_1';
  const targetAgency = agencies.find((a) => a.id === targetAgencyId) || agencies[0];
  const consultant = consultants.find((c) => c.id === consultantId) ||
    consultants[0] || {
      id: consultantId || 'equipe_central',
      name: targetAgency?.managerName || targetAgency?.name || 'Equipe da Agência',
      role: 'Atendimento & Negócios',
    };
  const newSlot: TimeSlot = {
    id: `slot_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    agencyId: targetAgencyId,
    date,
    startTime,
    endTime,
    durationMinutes: Number(durationMinutes) || 60,
    consultantId: consultant.id,
    consultantName: consultant.name,
    consultantRole: consultant.role,
    serviceCategory: serviceCategory || 'Alinhamento Estratégico',
    modality: modality || 'online',
    locationOrLink:
      locationOrLink ||
      (modality === 'online'
        ? `Google Meet: meet.google.com/hub-${Date.now().toString(36)}`
        : 'Sala de Reuniões da Agência Central'),
    status: 'available',
    notes,
    createdAt: new Date().toISOString(),
  };

  slots.unshift(newSlot);
  persistDoc('slots', newSlot.id, newSlot);

  broadcast({
    type: 'SLOTS_UPDATED',
    payload: { slots },
  });

  return res.status(201).json(newSlot);
});

// Batch generate slots
app.post('/api/slots/batch', (req, res) => {
  const params: BatchGenerationParams = req.body;
  const {
    agencyId,
    startDate,
    endDate,
    selectedDays,
    startTime,
    endTime,
    durationMinutes,
    lunchBreakStart,
    lunchBreakEnd,
    consultantId,
    serviceCategory,
    modality,
    locationOrLink,
  } = params;

  if (!startDate || !endDate || !selectedDays || !startTime || !endTime) {
    return res.status(400).json({ error: 'Parâmetros de geração em lote incompletos.' });
  }

  const targetAgencyId = agencyId || agencies[0]?.id || 'ag_1';
  const targetAgency = agencies.find((a) => a.id === targetAgencyId) || agencies[0];
  const consultant = consultants.find((c) => c.id === consultantId) ||
    consultants[0] || {
      id: consultantId || 'equipe_central',
      name: targetAgency?.managerName || targetAgency?.name || 'Equipe da Agência',
      role: 'Atendimento & Negócios',
    };
  const startD = new Date(startDate + 'T00:00:00');
  const endD = new Date(endDate + 'T23:59:59');
  const newSlots: TimeSlot[] = [];

  const toMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };
  const toTimeString = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);
  const dur = Number(durationMinutes) || 60;

  const lunchStartMin = lunchBreakStart ? toMinutes(lunchBreakStart) : -1;
  const lunchEndMin = lunchBreakEnd ? toMinutes(lunchBreakEnd) : -1;

  for (let cur = new Date(startD); cur <= endD; cur.setDate(cur.getDate() + 1)) {
    const dayOfWeek = cur.getDay(); // 0-6
    if (!selectedDays.includes(dayOfWeek)) continue;

    const dateStr = formatDate(cur);

    for (let curMin = startMin; curMin + dur <= endMin; curMin += dur) {
      if (lunchStartMin !== -1 && lunchEndMin !== -1) {
        if (curMin < lunchEndMin && curMin + dur > lunchStartMin) {
          continue;
        }
      }

      const slotStart = toTimeString(curMin);
      const slotEnd = toTimeString(curMin + dur);

      const exists = slots.some(
        (s) => s.date === dateStr && s.startTime === slotStart && s.consultantId === consultant.id
      );
      if (exists) continue;

      const slotId = `slot_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const slot: TimeSlot = {
        id: slotId,
        agencyId: targetAgencyId,
        date: dateStr,
        startTime: slotStart,
        endTime: slotEnd,
        durationMinutes: dur,
        consultantId: consultant.id,
        consultantName: consultant.name,
        consultantRole: consultant.role,
        serviceCategory: serviceCategory || 'Alinhamento Estratégico',
        modality: modality || 'online',
        locationOrLink:
          locationOrLink ||
          (modality === 'online'
            ? `Google Meet: meet.google.com/hub-${slotId.slice(-6)}`
            : 'Sala de Reuniões da Agência Central'),
        status: 'available',
        createdAt: new Date().toISOString(),
      };

      newSlots.push(slot);
    }
  }

  slots.push(...newSlots);
  for (const s of newSlots) {
    persistDoc('slots', s.id, s);
  }

  broadcast({
    type: 'SLOTS_UPDATED',
    payload: { slots },
  });

  return res.status(201).json({ createdCount: newSlots.length, slots: newSlots });
});

// Toggle slot status (available <-> locked)
app.patch('/api/slots/:id/toggle', (req, res) => {
  const { id } = req.params;
  const slot = slots.find((s) => s.id === id);

  if (!slot) {
    return res.status(404).json({ error: 'Horário não encontrado.' });
  }

  if (slot.status === 'booked') {
    return res.status(400).json({ error: 'Não é possível alterar um horário que já foi confirmado por um parceiro.' });
  }

  slot.status = slot.status === 'available' ? 'locked' : 'available';
  persistDoc('slots', slot.id, slot);

  broadcast({
    type: 'SLOT_STATUS_TOGGLED',
    payload: { slotId: slot.id, status: slot.status },
  });

  return res.json(slot);
});

// Delete unbooked slot
app.delete('/api/slots/:id', (req, res) => {
  const { id } = req.params;
  const index = slots.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Horário não encontrado.' });
  }

  if (slots[index].status === 'booked') {
    return res.status(400).json({ error: 'Não é possível excluir um horário que já possui agendamento confirmado.' });
  }

  slots.splice(index, 1);
  removeDoc('slots', id);

  broadcast({
    type: 'SLOTS_UPDATED',
    payload: { slots },
  });

  return res.json({ success: true, id });
});

// Book a slot (AUTOMATIC CONFIRMATION)
app.post('/api/bookings', (req, res) => {
  const {
    slotId,
    partnerId,
    partnerName,
    partnerRepresentative,
    partnerEmail,
    partnerPhone,
    partnerCnpj,
    clientName,
    clientCpf,
    propertyType,
    fidelizacaoValor,
    fidelizacaoResponsavel,
    isConstrutora,
    agendaTopic,
    dealEstimate,
    additionalAttendees,
    partnerNotes,
  } = req.body;

  if (!slotId) {
    return res.status(400).json({ error: 'Horário selecionado inválido.' });
  }

  if (!clientName || !clientCpf) {
    return res.status(400).json({ error: 'Preencha os campos obrigatórios do agendamento (Cliente e CPF).' });
  }

  const slot = slots.find((s) => s.id === slotId);
  if (!slot) {
    return res.status(404).json({ error: 'Horário selecionado não existe mais.' });
  }

  if (slot.status !== 'available') {
    return res.status(409).json({
      error: 'Este horário acabou de ser reservado por outro parceiro negocial ou foi bloqueado pela agência.',
    });
  }

  const bookingId = `bk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const protocol = `AGB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const securityCode = `SEC-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const finalPropertyType: PropertyType = propertyType === 'Empreendimento' ? 'Empreendimento' : 'Imóvel Individual';
  const finalAgendaTopic = agendaTopic || `${finalPropertyType}: ${clientName}`;

  const booking: Booking = {
    id: bookingId,
    protocol,
    agencyId: slot.agencyId || 'ag_1',
    slotId: slot.id,
    slotDate: slot.date,
    slotStartTime: slot.startTime,
    slotEndTime: slot.endTime,
    consultantName: slot.consultantName,
    serviceCategory: slot.serviceCategory,
    modality: slot.modality,
    locationOrLink: slot.locationOrLink,
    partnerId: partnerId || `p_custom_${Date.now()}`,
    partnerName: partnerName || 'Parceiro Negocial',
    partnerRepresentative: partnerRepresentative || partnerName || 'Representante',
    partnerEmail: partnerEmail || 'contato@parceiro.com.br',
    partnerPhone: partnerPhone || '',
    partnerCnpj,
    clientName,
    clientCpf,
    propertyType: finalPropertyType,
    fidelizacaoValor: fidelizacaoValor || '',
    fidelizacaoResponsavel: fidelizacaoResponsavel || undefined,
    isConstrutora: fidelizacaoResponsavel === 'Construtora' || Boolean(isConstrutora),
    agendaTopic: finalAgendaTopic,
    dealEstimate,
    additionalAttendees,
    partnerNotes,
    status: 'confirmed',
    autoConfirmedAt: new Date().toISOString(),
    securityCode,
  };

  slot.status = 'booked';
  slot.bookingId = bookingId;

  bookings.unshift(booking);
  persistDoc('slots', slot.id, slot);
  persistDoc('bookings', booking.id, booking);

  broadcast({
    type: 'SLOT_BOOKED',
    payload: {
      slot,
      booking,
    },
  });

  return res.status(201).json({
    success: true,
    message: 'Agendamento confirmado automaticamente pela Agência Central!',
    booking,
    slot,
  });
});

// Update booking fields (Cliente, CPF, Imóvel/Empreendimento, Parceiro, Notas, Outcome)
app.patch('/api/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const {
    clientName,
    clientCpf,
    propertyType,
    fidelizacaoValor,
    fidelizacaoResponsavel,
    isConstrutora,
    partnerNotes,
    partnerId,
    partnerName,
    partnerRepresentative,
    partnerEmail,
    partnerPhone,
    partnerCnpj,
    outcome,
    segmento,
  } = req.body;

  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Agendamento não encontrado.' });
  }

  if (clientName) booking.clientName = clientName;
  if (clientCpf) booking.clientCpf = clientCpf;
  if (propertyType) booking.propertyType = propertyType;
  if (fidelizacaoValor !== undefined) booking.fidelizacaoValor = fidelizacaoValor;
  if (fidelizacaoResponsavel !== undefined) {
    if (fidelizacaoResponsavel) {
      booking.fidelizacaoResponsavel = fidelizacaoResponsavel;
    } else {
      delete booking.fidelizacaoResponsavel;
    }
  }
  if (isConstrutora !== undefined) booking.isConstrutora = Boolean(isConstrutora);
  if (partnerNotes !== undefined) {
    const trimmedNotes = String(partnerNotes).trim();
    if (trimmedNotes) {
      booking.partnerNotes = trimmedNotes;
    } else {
      delete booking.partnerNotes;
    }
  }
  if (partnerId) booking.partnerId = partnerId;
  if (partnerName) booking.partnerName = partnerName;
  if (partnerRepresentative) booking.partnerRepresentative = partnerRepresentative;
  if (partnerEmail) booking.partnerEmail = partnerEmail;
  if (partnerPhone !== undefined) booking.partnerPhone = partnerPhone;
  if (partnerCnpj !== undefined) booking.partnerCnpj = partnerCnpj;
  if (outcome !== undefined) {
    if (outcome) {
      booking.outcome = outcome;
    } else {
      delete booking.outcome;
    }
  }
  if (segmento !== undefined) {
    if (segmento) {
      booking.segmento = segmento;
    } else {
      delete booking.segmento;
    }
  }
  booking.agendaTopic = `${booking.propertyType || 'Imóvel'}: ${booking.clientName || 'Cliente'}`;

  await persistDoc('bookings', booking.id, booking);

  broadcast({
    type: 'BOOKING_UPDATED',
    payload: { booking, bookings },
  });

  return res.json({ success: true, booking });
});

// Cancel booking
app.post('/api/bookings/:id/cancel', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Agendamento não encontrado.' });
  }

  if (booking.status === 'cancelled') {
    return res.status(400).json({ error: 'Este agendamento já foi cancelado.' });
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date().toISOString();
  booking.cancellationReason = reason || 'Cancelado a pedido do participante';

  const slot = slots.find((s) => s.id === booking.slotId);
  if (slot) {
    slot.status = 'available';
    slot.bookingId = undefined;
    persistDoc('slots', slot.id, slot);
  }
  persistDoc('bookings', booking.id, booking);

  broadcast({
    type: 'SLOT_CANCELLED',
    payload: {
      bookingId: booking.id,
      slotId: booking.slotId,
      booking,
      slot,
    },
  });

  return res.json({ success: true, booking, slot });
});

// Reload definitive data from Firestore
app.post('/api/reset-demo', async (_req, res) => {
  await loadPersistedData();
  const state = getFullState();
  broadcast({
    type: 'INIT_STATE',
    payload: state,
  });
  return res.json({ success: true, state });
});

async function startServer() {
  await loadPersistedData();
  const server = createHttpServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    connectedSockets.add(ws);

    try {
      ws.send(
        JSON.stringify({
          type: 'INIT_STATE',
          payload: getFullState(),
        })
      );
    } catch (e) {
      console.error('Error sending initial state:', e);
    }

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch (err) {
        console.error('Error handling ws message:', err);
      }
    });

    ws.on('close', () => {
      connectedSockets.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
      connectedSockets.delete(ws);
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Syncz Server] Running on http://localhost:${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
