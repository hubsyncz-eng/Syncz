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
  const today = new Date();
  const monday = getMonday(today);

  // Initial Agencies registered by Administrator
  agencies = [
    {
      id: 'ag_1',
      name: 'Agência Central Alfa',
      legalName: 'Alfa Negócios Corporativos e Intermediações Ltda',
      cnpj: '11.222.333/0001-44',
      email: 'contato@agenciacentralalfa.com.br',
      phone: '(11) 3200-4000',
      city: 'São Paulo',
      state: 'SP',
      managerName: 'Dra. Camila Fonseca',
      description: 'Centralizadora de Agendas Institucionais, Contratos e Parcerias B2B',
      badgeColor: 'bg-blue-600',
      status: 'active',
      password: 'agencia123',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
    {
      id: 'ag_2',
      name: 'Agência Prime Hub Brasil',
      legalName: 'Prime Hub Intermediações e Soluções Comerciais S/A',
      cnpj: '22.333.444/0001-55',
      email: 'operacoes@primehub.com.br',
      phone: '(21) 2500-8800',
      city: 'Rio de Janeiro',
      state: 'RJ',
      managerName: 'Carlos Eduardo Nery',
      description: 'Hub de Negócios Estratégicos, Expansão e M&A',
      badgeColor: 'bg-indigo-600',
      status: 'active',
      password: 'agencia123',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];

  // Initial Consultants tied to agencies
  consultants = [
    {
      id: 'c1',
      agencyId: 'ag_1',
      name: 'Dra. Camila Fonseca',
      role: 'Diretora de Parcerias Estratégicas',
      department: 'Diretoria Comercial & Expansão',
      email: 'camila.fonseca@agenciahub.com.br',
      password: 'usuario123',
      avatarColor: 'bg-emerald-600',
      specialties: ['Alinhamento Estratégico', 'Fechamento de Contrato', 'Joint Ventures'],
    },
    {
      id: 'c2',
      agencyId: 'ag_1',
      name: 'Rodrigo Vasconcelos',
      role: 'Head de Novos Negócios',
      department: 'Relacionamento B2B',
      email: 'rodrigo.vasconcelos@agenciahub.com.br',
      password: 'usuario123',
      avatarColor: 'bg-blue-600',
      specialties: ['Propostas Comerciais', 'Kickoff de Parceria', 'Expansão de Mercado'],
    },
    {
      id: 'c3',
      agencyId: 'ag_1',
      name: 'Juliana Martins',
      role: 'Especialista em M&A e Compliance',
      department: 'Jurídico & Risco',
      email: 'juliana.martins@agenciahub.com.br',
      password: 'usuario123',
      avatarColor: 'bg-indigo-600',
      specialties: ['Auditoria de Contrato', 'Compliance Regulatório', 'NDA & Termos'],
    },
    {
      id: 'c4',
      agencyId: 'ag_1',
      name: 'Marcelo Braga',
      role: 'Gerente de Integração & Operações',
      department: 'Operações e Logística B2B',
      email: 'marcelo.braga@agenciahub.com.br',
      password: 'usuario123',
      avatarColor: 'bg-amber-600',
      specialties: ['Integração Técnica', 'Acordo de Nível de Serviço (SLA)', 'Operações'],
    },
  ];

  // Initial Partners
  partners = [
    {
      id: 'p1',
      name: 'LogiPrime Logística Nacional',
      segment: 'Transporte e Supply Chain',
      representative: 'Eduardo Silveira',
      email: 'eduardo@logiprime.com.br',
      phone: '(11) 98765-4321',
      cnpj: '12.345.678/0001-90',
      badgeColor: 'bg-orange-500',
      password: 'parceiro123',
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    },
    {
      id: 'p2',
      name: 'Nexus Fintech Solutions',
      segment: 'Tecnologia Financeira & Pagamentos',
      representative: 'Mariana Duarte',
      email: 'mduarte@nexusfintech.io',
      phone: '(11) 97654-3210',
      cnpj: '98.765.432/0001-11',
      badgeColor: 'bg-purple-500',
      password: 'parceiro123',
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
    {
      id: 'p3',
      name: 'Alfa Varejo & Redes',
      segment: 'Grandes Varejistas & Distribuição',
      representative: 'Fernando Guimarães',
      email: 'fernando@alfavarejo.com.br',
      phone: '(21) 99876-5432',
      cnpj: '45.678.901/0001-22',
      badgeColor: 'bg-blue-500',
      password: 'parceiro123',
      createdAt: new Date(Date.now() - 3600000 * 15).toISOString(),
    },
    {
      id: 'p4',
      name: 'SolarTech Energia Renovável',
      segment: 'Energia Limpa e Sustentabilidade',
      representative: 'Beatriz Nogueira',
      email: 'beatriz@solartech.com.br',
      phone: '(31) 98888-7766',
      cnpj: '78.901.234/0001-55',
      badgeColor: 'bg-emerald-500',
      password: 'parceiro123',
      createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    },
    {
      id: 'p5',
      name: 'Biocare Saúde Corporativa',
      segment: 'Benefícios Corporativos & Saúde',
      representative: 'Gustavo Paiva',
      email: 'gpaiva@biocare.med.br',
      phone: '(41) 99123-4567',
      cnpj: '23.456.789/0001-88',
      badgeColor: 'bg-rose-500',
      password: 'parceiro123',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
  ];

  slots = [];
  bookings = [];
  activities = [];

  const daysOffsets = [0, 1, 2, 3, 4]; // Seg a Sex
  const times = [
    { start: '09:00', end: '10:00' },
    { start: '10:30', end: '11:30' },
    { start: '14:00', end: '15:00' },
    { start: '15:30', end: '16:30' },
    { start: '17:00', end: '18:00' },
  ];

  let idCounter = 1;

  daysOffsets.forEach((dayOffset) => {
    const dayDate = addDays(monday, dayOffset);
    const dateStr = formatDate(dayDate);

    times.forEach((t, timeIdx) => {
      const consultant = consultants[(dayOffset + timeIdx) % consultants.length];
      const slotId = `slot_${idCounter++}`;
      const modalities: Array<'online' | 'presencial' | 'hibrido'> = ['online', 'presencial', 'hibrido'];
      const modality = modalities[(dayOffset + timeIdx) % modalities.length];
      const categories = [
        'Alinhamento Estratégico',
        'Fechamento de Contrato',
        'Propostas Comerciais',
        'Auditoria e Compliance',
        'Acordo de Nível de Serviço (SLA)',
      ];
      const category = categories[(dayOffset + timeIdx) % categories.length];
      const location =
        modality === 'online'
          ? `Google Meet: meet.google.com/hub-${slotId.toLowerCase()}`
          : modality === 'presencial'
            ? 'Sala Nobre de Reuniões Alpha - Sede Central, 8º andar'
            : 'Sala Híbrida Beta + Transmissão Meet';

      let status: 'available' | 'locked' | 'booked' = 'available';
      let bookingId: string | undefined = undefined;

      if (dayOffset === 0 && timeIdx === 0) {
        // Booked by LogiPrime
        status = 'booked';
        bookingId = `bk_${Date.now() - 100000}_1`;
        const b: Booking = {
          id: bookingId,
          protocol: `AGB-2026-8812`,
          agencyId: 'ag_1',
          slotId,
          slotDate: dateStr,
          slotStartTime: t.start,
          slotEndTime: t.end,
          consultantName: consultant.name,
          serviceCategory: category,
          modality,
          locationOrLink: location,
          partnerId: 'p1',
          partnerName: 'LogiPrime Logística Nacional',
          partnerRepresentative: 'Eduardo Silveira',
          partnerEmail: 'eduardo@logiprime.com.br',
          partnerPhone: '(11) 98765-4321',
          partnerCnpj: '12.345.678/0001-90',
          clientName: 'Roberto Alencar',
          clientCpf: '321.654.987-10',
          propertyType: 'Imóvel Individual',
          agendaTopic: 'Negociação de Imóvel Individual - Cliente Roberto Alencar',
          dealEstimate: 'R$ 780.000',
          additionalAttendees: 'roberto@alencar.adv.br',
          partnerNotes: 'Cliente com perfil de crédito pré-aprovado e interesse em unidade residencial de 3 dormitórios.',
          status: 'confirmed',
          autoConfirmedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          securityCode: 'SEC-8812-7741',
        };
        bookings.push(b);
      } else if (dayOffset === 1 && timeIdx === 1) {
        // Booked by Nexus Fintech
        status = 'booked';
        bookingId = `bk_${Date.now() - 50000}_2`;
        const b: Booking = {
          id: bookingId,
          protocol: `AGB-2026-4529`,
          agencyId: 'ag_1',
          slotId,
          slotDate: dateStr,
          slotStartTime: t.start,
          slotEndTime: t.end,
          consultantName: consultant.name,
          serviceCategory: category,
          modality,
          locationOrLink: location,
          partnerId: 'p2',
          partnerName: 'Nexus Fintech Solutions',
          partnerRepresentative: 'Mariana Duarte',
          partnerEmail: 'mduarte@nexusfintech.io',
          partnerPhone: '(11) 97654-3210',
          partnerCnpj: '98.765.432/0001-11',
          clientName: 'Construtora & Incorporadora Horizonte',
          clientCpf: '456.789.012-34',
          propertyType: 'Empreendimento',
          agendaTopic: 'Negociação de Empreendimento - Horizonte Towers',
          dealEstimate: 'R$ 14.500.000',
          additionalAttendees: 'diretoria@horizonteinc.com.br',
          partnerNotes: 'Alinhamento de condições para lançamento de torre corporativa com 120 salas.',
          status: 'confirmed',
          autoConfirmedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          securityCode: 'SEC-4529-1983',
        };
        bookings.push(b);
      }

      const slot: TimeSlot = {
        id: slotId,
        agencyId: 'ag_1',
        date: dateStr,
        startTime: t.start,
        endTime: t.end,
        durationMinutes: 60,
        consultantId: consultant.id,
        consultantName: consultant.name,
        consultantRole: consultant.role,
        serviceCategory: category,
        modality,
        locationOrLink: location,
        status,
        bookingId,
        createdAt: new Date().toISOString(),
      };

      slots.push(slot);
    });
  });

  // Seed activities
  activities = [
    {
      id: 'act_0',
      type: 'agency_registered',
      timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
      title: 'Agência Cadastrada pelo Administrador',
      description: 'O Administrador do Sistema cadastrou a Agência Central Alfa no ecossistema.',
      agencyName: 'Agência Central Alfa',
    },
    {
      id: 'act_1',
      type: 'slots_batch_opened',
      timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
      title: 'Abertura de Grade Semanal',
      description: 'A Agência Central Alfa abriu horários na agenda para a semana vigente.',
    },
    {
      id: 'act_2',
      type: 'booking_confirmed',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      title: 'Agendamento Confirmado Automaticamente',
      description: 'LogiPrime Logística confirmou horário para Segunda-feira com Dra. Camila Fonseca.',
      partnerName: 'LogiPrime Logística Nacional',
      protocol: 'AGB-2026-8812',
    },
    {
      id: 'act_3',
      type: 'booking_confirmed',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      title: 'Agendamento Confirmado Automaticamente',
      description: 'Nexus Fintech Solutions confirmou horário para Terça-feira com Rodrigo Vasconcelos.',
      partnerName: 'Nexus Fintech Solutions',
      protocol: 'AGB-2026-4529',
    },
  ];
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
  if (!db) return;
  try {
    await setDoc(doc(db, collectionName, id), data);
  } catch (err) {
    console.warn(`[Firestore] Failed to save ${collectionName}/${id}:`, err);
  }
}

async function removeDoc(collectionName: string, id: string) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (err) {
    console.warn(`[Firestore] Failed to delete ${collectionName}/${id}:`, err);
  }
}

async function loadPersistedData() {
  if (!db) {
    initSeedData();
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

    if (!agSnap.empty) {
      agencies = agSnap.docs.map((d: any) => d.data() as Agency);
    }
    if (!ptSnap.empty) {
      partners = ptSnap.docs.map((d: any) => d.data() as PartnerProfile);
    }
    if (!csSnap.empty) {
      consultants = csSnap.docs.map((d: any) => d.data() as Consultant);
    }
    if (!slSnap.empty) {
      slots = slSnap.docs.map((d: any) => d.data() as TimeSlot);
    }
    if (!bkSnap.empty) {
      bookings = bkSnap.docs.map((d: any) => d.data() as Booking);
    }
    if (!actSnap.empty) {
      activities = actSnap.docs.map((d: any) => d.data() as ActivityEvent);
    }

    if (agSnap.empty && ptSnap.empty) {
      console.log('[Firestore] Empty database detected. Seeding initial baseline data to Firestore...');
      initSeedData();
      await Promise.all([
        ...agencies.map((a) => persistDoc('agencies', a.id, a)),
        ...partners.map((p) => persistDoc('partners', p.id, p)),
        ...consultants.map((c) => persistDoc('consultants', c.id, c)),
        ...slots.map((s) => persistDoc('slots', s.id, s)),
        ...bookings.map((b) => persistDoc('bookings', b.id, b)),
        ...activities.map((act) => persistDoc('activities', act.id, act)),
      ]);
      console.log('[Firestore] Baseline data written to Firestore.');
    } else {
      console.log(`[Firestore] Loaded: ${agencies.length} agencies, ${partners.length} partners, ${slots.length} slots, ${bookings.length} bookings.`);
    }
  } catch (err) {
    console.error('[Firestore] Error loading persisted data:', err);
    initSeedData();
  }
}

initSeedData();

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

  // 2. Agência: Login com E-mail, CNPJ, Nome, ID ou Username
  const agency = agencies.find(
    (a) =>
      a.email.toLowerCase() === cleanUser.toLowerCase() ||
      a.name.toLowerCase() === cleanUser.toLowerCase() ||
      a.cnpj === cleanUser ||
      a.id.toLowerCase() === cleanUser.toLowerCase() ||
      (a.username && a.username.toLowerCase() === cleanUser.toLowerCase())
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
      c.email.toLowerCase() === cleanUser.toLowerCase() ||
      c.name.toLowerCase() === cleanUser.toLowerCase() ||
      c.id.toLowerCase() === cleanUser.toLowerCase()
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

  // 3. Parceiro Negocial: Login com E-mail, CNPJ, Nome, ID ou Username
  const partner = partners.find(
    (p) =>
      p.email.toLowerCase() === cleanUser.toLowerCase() ||
      p.name.toLowerCase() === cleanUser.toLowerCase() ||
      p.cnpj === cleanUser ||
      p.id.toLowerCase() === cleanUser.toLowerCase() ||
      (p.username && p.username.toLowerCase() === cleanUser.toLowerCase())
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

  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'agency_registered',
    timestamp: new Date().toISOString(),
    title: 'Nova Agência Cadastrada',
    description: `O Administrador cadastrou a ${newAgency.name}.`,
    agencyName: newAgency.name,
  };
  activities.unshift(act);
  persistDoc('activities', act.id, act);

  broadcast({
    type: 'AGENCY_REGISTERED',
    payload: { agency: newAgency, agencies, activity: act },
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

  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'agency_registered',
    timestamp: new Date().toISOString(),
    title: 'Cadastro de Agência Atualizado',
    description: `Os dados cadastrais da agência ${updatedAgency.name} foram atualizados no sistema.`,
    agencyName: updatedAgency.name,
  };
  activities.unshift(act);
  persistDoc('activities', act.id, act);

  broadcast({
    type: 'AGENCY_REGISTERED',
    payload: { agency: updatedAgency, agencies, activity: act },
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
  const { name, segment, representative, email, phone, cnpj, password } = req.body;

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
    createdAt: new Date().toISOString(),
  };

  partners.push(newPartner);
  persistDoc('partners', newPartner.id, newPartner);

  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'partner_registered',
    timestamp: new Date().toISOString(),
    title: 'Novo Parceiro Cadastrado',
    description: `O parceiro ${newPartner.name} foi homologado no sistema.`,
    partnerName: newPartner.name,
  };
  activities.unshift(act);
  persistDoc('activities', act.id, act);

  broadcast({
    type: 'PARTNER_REGISTERED',
    payload: { partner: newPartner, partners, activity: act },
  });

  return res.status(201).json(newPartner);
});

// Admin or partner updates an existing Partner
app.put('/api/partners/:id', (req, res) => {
  const { id } = req.params;
  const { name, segment, representative, email, phone, cnpj, password } = req.body;

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

  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'partner_registered',
    timestamp: new Date().toISOString(),
    title: 'Cadastro de Parceiro Atualizado',
    description: `Os dados cadastrais de ${updatedPartner.name} foram atualizados no sistema.`,
    partnerName: updatedPartner.name,
  };
  activities.unshift(act);
  persistDoc('activities', act.id, act);

  broadcast({
    type: 'PARTNER_REGISTERED',
    payload: {
      partner: updatedPartner,
      partners,
      bookings: hasUpdatedBookings ? bookings : undefined,
      activity: act,
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

  const consultant = consultants.find((c) => c.id === consultantId) || consultants[0];
  const newSlot: TimeSlot = {
    id: `slot_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    agencyId: agencyId || agencies[0]?.id || 'ag_1',
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

  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'slot_created',
    timestamp: new Date().toISOString(),
    title: 'Novo Horário Disponibilizado',
    description: `A Agência abriu o horário ${newSlot.date} às ${newSlot.startTime} com ${newSlot.consultantName}.`,
    slotTime: `${newSlot.date} ${newSlot.startTime}`,
  };
  activities.unshift(act);
  persistDoc('activities', act.id, act);

  broadcast({
    type: 'SLOTS_UPDATED',
    payload: { slots, activity: act },
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

  if (!startDate || !endDate || !selectedDays || !startTime || !endTime || !consultantId) {
    return res.status(400).json({ error: 'Parâmetros de geração em lote incompletos.' });
  }

  const targetAgencyId = agencyId || agencies[0]?.id || 'ag_1';
  const consultant = consultants.find((c) => c.id === consultantId) || consultants[0];
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

  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'slots_batch_opened',
    timestamp: new Date().toISOString(),
    title: 'Grade Semanal Atualizada',
    description: `A Agência abriu ${newSlots.length} novos horários com ${consultant.name}.`,
  };
  activities.unshift(act);
  persistDoc('activities', act.id, act);

  broadcast({
    type: 'SLOTS_UPDATED',
    payload: { slots, activity: act },
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

  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'booking_confirmed',
    timestamp: new Date().toISOString(),
    title: 'Novo Agendamento Confirmado Automaticamente',
    description: `${partnerName} confirmou horário para ${slot.date} às ${slot.startTime} com ${slot.consultantName}.`,
    partnerName,
    slotTime: `${slot.date} ${slot.startTime}`,
    protocol,
  };
  activities.unshift(act);
  persistDoc('activities', act.id, act);

  broadcast({
    type: 'SLOT_BOOKED',
    payload: {
      slot,
      booking,
      activity: act,
    },
  });

  return res.status(201).json({
    success: true,
    message: 'Agendamento confirmado automaticamente pela Agência Central!',
    booking,
    slot,
  });
});

// Update booking fields (Cliente, CPF, Imóvel/Empreendimento, Notas)
app.patch('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  const { clientName, clientCpf, propertyType, partnerNotes } = req.body;

  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Agendamento não encontrado.' });
  }

  if (clientName) booking.clientName = clientName;
  if (clientCpf) booking.clientCpf = clientCpf;
  if (propertyType) booking.propertyType = propertyType;
  if (partnerNotes !== undefined) booking.partnerNotes = partnerNotes;
  booking.agendaTopic = `${booking.propertyType || 'Imóvel'}: ${booking.clientName || 'Cliente'}`;

  persistDoc('bookings', booking.id, booking);

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

  const act: ActivityEvent = {
    id: `act_${Date.now()}`,
    type: 'booking_cancelled',
    timestamp: new Date().toISOString(),
    title: 'Agendamento Cancelado - Horário Liberado',
    description: `Agendamento ${booking.protocol} de ${booking.partnerName} foi cancelado. O horário voltou a ficar disponível.`,
    partnerName: booking.partnerName,
    protocol: booking.protocol,
  };
  activities.unshift(act);
  persistDoc('activities', act.id, act);

  broadcast({
    type: 'SLOT_CANCELLED',
    payload: {
      bookingId: booking.id,
      slotId: booking.slotId,
      booking,
      slot,
      activity: act,
    },
  });

  return res.json({ success: true, booking, slot });
});

// Reset demo data
app.post('/api/reset-demo', (_req, res) => {
  initSeedData();
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
