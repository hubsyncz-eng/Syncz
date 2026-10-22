import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  Agency,
  TimeSlot,
  Booking,
  Consultant,
  PartnerProfile,
  ActivityEvent,
  BatchGenerationParams,
  AppStatePayload,
  UserSession,
  PropertyType,
  BookingOutcome,
  BookingSegmento,
  FidelizacaoResponsavel,
} from '../types/index.ts';
import {
  db,
  collection,
  getDocs,
  onSnapshot,
  persistToFirestore,
  removeFromFirestore,
  testConnection,
} from '../lib/firebase.ts';
import {
  DEFAULT_AGENCY_INFO,
  formatSeedDate,
} from '../utils/seedData.ts';

interface ToastAlert {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

interface RealtimeContextValue {
  agencies: Agency[];
  slots: TimeSlot[];
  bookings: Booking[];
  consultants: Consultant[];
  partners: PartnerProfile[];
  activities: ActivityEvent[];
  agencyInfo: AppStatePayload['agencyInfo'];
  isConnected: boolean;
  currentUser: UserSession | null;
  login: (session: UserSession) => void;
  logout: () => void;
  currentAgency: Agency | null;
  setCurrentAgency: (agency: Agency) => void;
  currentPartner: PartnerProfile | null;
  setCurrentPartner: (partner: PartnerProfile) => void;
  selectedLoginRole: 'admin' | 'agency' | 'partner';
  setSelectedLoginRole: (role: 'admin' | 'agency' | 'partner') => void;
  adminPerspective: 'admin_master' | 'agency_view' | 'partner_view';
  setAdminPerspective: (perspective: 'admin_master' | 'agency_view' | 'partner_view') => void;
  agencyActiveView: 'schedule' | 'partners' | 'users';
  setAgencyActiveView: (view: 'schedule' | 'partners' | 'users') => void;
  loginWithCredentials: (
    username: string,
    password: string,
    role?: 'admin' | 'agency' | 'partner'
  ) => Promise<UserSession>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  toasts: ToastAlert[];
  removeToast: (id: string) => void;
  // Modal handlers for Agency & Partner registration/editing
  editingAgencyModal: { isOpen: boolean; agency?: Agency | null };
  openAgencyModal: (agency?: Agency | null) => void;
  closeAgencyModal: () => void;
  editingPartnerModal: { isOpen: boolean; partner?: PartnerProfile | null };
  openPartnerModal: (partner?: PartnerProfile | null) => void;
  closePartnerModal: () => void;
  // Actions
  registerAgency: (data: Partial<Agency>) => Promise<Agency>;
  updateAgency: (id: string, data: Partial<Agency>) => Promise<Agency>;
  deleteAgency: (id: string) => Promise<boolean>;
  registerPartner: (data: Partial<PartnerProfile>) => Promise<PartnerProfile>;
  updatePartner: (id: string, data: Partial<PartnerProfile>) => Promise<PartnerProfile>;
  togglePartnerAgencyAccess: (partnerId: string, agencyId: string) => Promise<void>;
  deletePartner: (id: string) => Promise<boolean>;
  registerConsultant: (data: Partial<Consultant>) => Promise<Consultant>;
  updateConsultant: (id: string, data: Partial<Consultant>) => Promise<Consultant>;
  deleteConsultant: (id: string) => Promise<boolean>;
  bookSlot: (bookingData: {
    slotId: string;
    partnerId: string;
    partnerName: string;
    partnerRepresentative: string;
    partnerEmail: string;
    partnerPhone?: string;
    partnerCnpj?: string;
    clientName?: string;
    clientCpf?: string;
    propertyType?: PropertyType;
    fidelizacaoValor?: string;
    fidelizacaoResponsavel?: FidelizacaoResponsavel | '';
    isConstrutora?: boolean;
    agendaTopic?: string;
    dealEstimate?: string;
    additionalAttendees?: string;
    partnerNotes?: string;
  }) => Promise<{ success: boolean; booking: Booking; message: string }>;
  updateBooking: (
    id: string,
    data: {
      clientName: string;
      clientCpf: string;
      propertyType: PropertyType;
      fidelizacaoValor?: string;
      fidelizacaoResponsavel?: FidelizacaoResponsavel | '';
      isConstrutora?: boolean;
      partnerNotes?: string;
      partnerId?: string;
      partnerName?: string;
      partnerRepresentative?: string;
      partnerEmail?: string;
      partnerPhone?: string;
      partnerCnpj?: string;
      outcome?: BookingOutcome;
    }
  ) => Promise<Booking>;
  updateBookingOutcome: (bookingId: string, outcome: BookingOutcome | null) => Promise<void>;
  updateBookingSegmento: (bookingId: string, segmento: BookingSegmento | null) => Promise<void>;
  cancelBooking: (bookingId: string, reason?: string) => Promise<boolean>;
  toggleSlotStatus: (slotId: string) => Promise<boolean>;
  deleteSlot: (slotId: string) => Promise<boolean>;
  batchGenerateSlots: (params: BatchGenerationParams) => Promise<number>;
  createSingleSlot: (data: Partial<TimeSlot>) => Promise<boolean>;
  resetDemoData: () => Promise<void>;
  refreshState: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const STORAGE_KEY_SESSION = 'syncz_current_user';
const STORAGE_KEY_THEME = 'syncz_theme';

/**
 * Safely fetches JSON from an API endpoint without EVER throwing
 * "JSON.parse: unexpected character at line 1 column 1 of the JSON data"
 * when deployed on a static host (e.g. GitHub Pages, Vercel, Netlify) where /api/* returns HTML or empty body.
 */
async function safeFetchJson(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: any; isApiAvailable: boolean }> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    if (!text) {
      return { ok: false, status: res.status, data: null, isApiAvailable: false };
    }
    const trimmed = text.trim();
    if (trimmed.startsWith('<') || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
      return { ok: false, status: res.status, data: null, isApiAvailable: false };
    }
    try {
      const data = JSON.parse(trimmed);
      return { ok: res.ok, status: res.status, data, isApiAvailable: true };
    } catch {
      return { ok: false, status: res.status, data: null, isApiAvailable: false };
    }
  } catch {
    return { ok: false, status: 0, data: null, isApiAvailable: false };
  }
}

function authenticateLocally(
  username: string,
  password: string,
  role: 'admin' | 'agency' | 'partner' | undefined,
  agencies: Agency[],
  consultants: Consultant[],
  partners: PartnerProfile[]
): UserSession {
  const cleanUser = username.trim();
  const cleanPass = password.trim();
  const lowerUser = cleanUser.toLowerCase();

  // 1. Administrador: Usuário: Syncz | Senha: @dmin
  if (lowerUser === 'syncz' || (role === 'admin' && lowerUser === 'syncz')) {
    if (cleanPass !== '@dmin') {
      throw new Error('Senha incorreta para o usuário Syncz. Senha correta: @dmin');
    }
    return {
      role: 'admin',
      id: 'admin_syncz',
      name: 'Administrador Syncz',
      email: 'admin@syncz.com.br',
    };
  }

  // 2. Agência: Login com E-mail, CNPJ, Nome, Responsável, ID ou Username
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
      throw new Error('Senha incorreta para a agência informada.');
    }
    return {
      role: 'agency',
      id: agency.id,
      name: agency.name,
      email: agency.email,
      agencyId: agency.id,
      representative: agency.managerName,
      cnpj: agency.cnpj,
      badgeColor: agency.badgeColor,
    };
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
      throw new Error('Senha incorreta para o usuário da agência informado.');
    }
    const consultantAgency = agencies.find((a) => a.id === consultant.agencyId) || agencies[0];
    return {
      role: 'agency',
      id: consultant.id,
      name: consultant.name,
      email: consultant.email,
      agencyId: consultant.agencyId || consultantAgency?.id || 'ag_1',
      representative: consultant.name,
      badgeColor: consultant.avatarColor || consultantAgency?.badgeColor,
      isAgencyUser: true,
    };
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
      throw new Error('Senha incorreta para o parceiro informado.');
    }
    return {
      role: 'partner',
      id: partner.id,
      name: partner.name,
      email: partner.email,
      partnerId: partner.id,
      representative: partner.representative,
      cnpj: partner.cnpj,
      badgeColor: partner.badgeColor,
    };
  }

  throw new Error(
    'Usuário não localizado. Verifique se o usuário ou e-mail foi digitado corretamente.'
  );
}

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore storage errors
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-mode');
      root.classList.remove('dark-mode');
    } else {
      root.classList.add('dark-mode');
      root.classList.remove('light-mode');
    }
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [partners, setPartners] = useState<PartnerProfile[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [agencyInfo, setAgencyInfo] =
    useState<AppStatePayload['agencyInfo']>(DEFAULT_AGENCY_INFO);

  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Current logged in user session
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // Active selected agency
  const [currentAgency, setCurrentAgency] = useState<Agency | null>(null);

  // Active selected partner
  const [currentPartner, setCurrentPartner] = useState<PartnerProfile | null>(null);

  // Active role selected in login screen
  const [selectedLoginRole, setSelectedLoginRole] = useState<'admin' | 'agency' | 'partner'>('admin');

  // Perspective for administrator ('admin_master' | 'agency_view' | 'partner_view')
  const [adminPerspective, setAdminPerspective] = useState<
    'admin_master' | 'agency_view' | 'partner_view'
  >('admin_master');

  // Active sub-view inside Agency perspective ('schedule' | 'partners' | 'users')
  const [agencyActiveView, setAgencyActiveView] = useState<'schedule' | 'partners' | 'users'>(
    'schedule'
  );

  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Modal states for Agency and Partner Registration/Editing
  const [editingAgencyModal, setEditingAgencyModal] = useState<{
    isOpen: boolean;
    agency?: Agency | null;
  }>({ isOpen: false, agency: null });

  const [editingPartnerModal, setEditingPartnerModal] = useState<{
    isOpen: boolean;
    partner?: PartnerProfile | null;
  }>({ isOpen: false, partner: null });

  const openAgencyModal = useCallback((agency?: Agency | null) => {
    setEditingAgencyModal({ isOpen: true, agency: agency || null });
  }, []);

  const closeAgencyModal = useCallback(() => {
    setEditingAgencyModal({ isOpen: false, agency: null });
  }, []);

  const openPartnerModal = useCallback((partner?: PartnerProfile | null) => {
    setEditingPartnerModal({ isOpen: true, partner: partner || null });
  }, []);

  const closePartnerModal = useCallback(() => {
    setEditingPartnerModal({ isOpen: false, partner: null });
  }, []);

  const addToast = useCallback((toast: Omit<ToastAlert, 'id' | 'timestamp'>) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const newToast: ToastAlert = { ...toast, id, timestamp: Date.now() };
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const login = (session: UserSession) => {
    setCurrentUser(session);
    setAgencyActiveView('schedule');
    if (session.role === 'agency' && session.agencyId) {
      const foundAg = agencies.find((a) => a.id === session.agencyId);
      if (foundAg) setCurrentAgency(foundAg);
    } else if (session.role === 'partner' && (session.partnerId || session.id)) {
      const foundPt = partners.find((p) => p.id === (session.partnerId || session.id));
      if (foundPt) setCurrentPartner(foundPt);
    }
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    } catch {}
  };

  const logout = () => {
    setCurrentUser(null);
    setAdminPerspective('admin_master');
    setAgencyActiveView('schedule');
    try {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    } catch {}
  };

  // Keep currentAgency, currentPartner, and currentUser synced whenever agencies or partners arrays update
  useEffect(() => {
    if (agencies.length > 0) {
      setCurrentAgency((prev) => {
        if (!prev) return agencies[0];
        const updated = agencies.find((a) => a.id === prev.id);
        return updated || agencies[0];
      });
      setCurrentUser((prevUser) => {
        if (!prevUser || prevUser.role !== 'agency' || prevUser.isAgencyUser) return prevUser;
        const matched = agencies.find(
          (a) => a.id === prevUser.id || a.id === prevUser.agencyId
        );
        if (!matched) return prevUser;
        if (
          prevUser.name === matched.name &&
          prevUser.email === matched.email &&
          prevUser.representative === matched.managerName &&
          prevUser.cnpj === matched.cnpj
        ) {
          return prevUser;
        }
        const updatedSession: UserSession = {
          ...prevUser,
          name: matched.name,
          email: matched.email,
          representative: matched.managerName || prevUser.representative,
          cnpj: matched.cnpj || prevUser.cnpj,
          badgeColor: matched.badgeColor || prevUser.badgeColor,
        };
        try {
          localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updatedSession));
        } catch {}
        return updatedSession;
      });
    }
  }, [agencies]);

  useEffect(() => {
    if (partners.length > 0) {
      setCurrentPartner((prev) => {
        if (!prev) return partners[0];
        const updated = partners.find((p) => p.id === prev.id);
        return updated || partners[0];
      });
      setCurrentUser((prevUser) => {
        if (!prevUser || prevUser.role !== 'partner') return prevUser;
        const matched = partners.find(
          (p) => p.id === prevUser.id || p.id === prevUser.partnerId
        );
        if (!matched) return prevUser;
        if (
          prevUser.name === matched.name &&
          prevUser.email === matched.email &&
          prevUser.representative === matched.representative &&
          prevUser.cnpj === matched.cnpj
        ) {
          return prevUser;
        }
        const updatedSession: UserSession = {
          ...prevUser,
          name: matched.name,
          email: matched.email,
          representative: matched.representative || prevUser.representative,
          cnpj: matched.cnpj || prevUser.cnpj,
          badgeColor: matched.badgeColor || prevUser.badgeColor,
        };
        try {
          localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updatedSession));
        } catch {}
        return updatedSession;
      });
    }
  }, [partners]);

  const loginWithCredentials = async (
    username: string,
    password: string,
    role?: 'admin' | 'agency' | 'partner'
  ): Promise<UserSession> => {
    // 1. Always fetch latest definitive entities from Firestore if available
    let latestAgencies = agencies;
    let latestConsultants = consultants;
    let latestPartners = partners;

    if (db) {
      try {
        const [agSnap, csSnap, ptSnap] = await Promise.all([
          getDocs(collection(db, 'agencies')),
          getDocs(collection(db, 'consultants')),
          getDocs(collection(db, 'partners')),
        ]);
        latestAgencies = agSnap.docs.map((d) => d.data() as Agency);
        latestConsultants = csSnap.docs.map((d) => d.data() as Consultant);
        latestPartners = ptSnap.docs.map((d) => d.data() as PartnerProfile);
        setAgencies(latestAgencies);
        setConsultants(latestConsultants);
        setPartners(latestPartners);
      } catch {
        // Fallback to in-memory state if Firestore query fails
      }
    }

    // 2. Authenticate against definitive Firestore data first
    try {
      const session = authenticateLocally(
        username,
        password,
        role,
        latestAgencies,
        latestConsultants,
        latestPartners
      );
      login(session);
      addToast({
        type: 'success',
        title: 'Acesso Autorizado',
        message: `Bem-vindo(a) ao Syncz, ${session.name}!`,
      });
      return session;
    } catch (localAuthErr: any) {
      // 3. Also check backend API if running with Express server
      const apiRes = await safeFetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, username, password }),
      });

      if (apiRes.isApiAvailable && apiRes.ok && apiRes.data?.success && apiRes.data?.session) {
        const session: UserSession = apiRes.data.session;
        login(session);
        addToast({
          type: 'success',
          title: 'Acesso Autorizado',
          message: `Bem-vindo(a) ao Syncz, ${session.name}!`,
        });
        return session;
      }

      throw localAuthErr;
    }
  };

  // Fetch state via REST API (if running with Express backend)
  const fetchState = useCallback(async () => {
    const apiRes = await safeFetchJson('/api/state');
    if (apiRes.isApiAvailable && apiRes.ok && apiRes.data) {
      const data: AppStatePayload = apiRes.data;
      if (Array.isArray(data.agencies)) setAgencies(data.agencies);
      if (Array.isArray(data.slots)) setSlots(data.slots);
      if (Array.isArray(data.bookings)) setBookings(data.bookings);
      if (Array.isArray(data.consultants)) setConsultants(data.consultants);
      if (Array.isArray(data.partners)) setPartners(data.partners);
      if (Array.isArray(data.activities)) setActivities(data.activities);
      if (data.agencyInfo) setAgencyInfo(data.agencyInfo);
    }
  }, []);

  // Direct Firestore real-time synchronization with the definitive database
  useEffect(() => {
    if (!db) return;

    let unsubscribers: Array<() => void> = [];
    let isCancelled = false;

    async function initFirestoreSync() {
      try {
        const [agSnap, ptSnap, csSnap, slSnap, bkSnap, actSnap] = await Promise.all([
          getDocs(collection(db, 'agencies')),
          getDocs(collection(db, 'partners')),
          getDocs(collection(db, 'consultants')),
          getDocs(collection(db, 'slots')),
          getDocs(collection(db, 'bookings')),
          getDocs(collection(db, 'activities')),
        ]);

        if (isCancelled) return;

        setAgencies(agSnap.docs.map((d) => d.data() as Agency));
        setPartners(ptSnap.docs.map((d) => d.data() as PartnerProfile));
        setConsultants(csSnap.docs.map((d) => d.data() as Consultant));
        setSlots(slSnap.docs.map((d) => d.data() as TimeSlot));
        setBookings(bkSnap.docs.map((d) => d.data() as Booking));

        const loadedActs = actSnap.docs
          .map((d) => d.data() as ActivityEvent)
          .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        setActivities(loadedActs);

        setIsConnected(true);

        // Subscribe to real-time updates on all collections in the definitive database
        unsubscribers = [
          onSnapshot(
            collection(db, 'agencies'),
            (snap) => {
              setAgencies(snap.docs.map((d) => d.data() as Agency));
            },
            () => {}
          ),
          onSnapshot(
            collection(db, 'partners'),
            (snap) => {
              setPartners(snap.docs.map((d) => d.data() as PartnerProfile));
            },
            () => {}
          ),
          onSnapshot(
            collection(db, 'consultants'),
            (snap) => {
              setConsultants(snap.docs.map((d) => d.data() as Consultant));
            },
            () => {}
          ),
          onSnapshot(
            collection(db, 'slots'),
            (snap) => {
              setSlots(snap.docs.map((d) => d.data() as TimeSlot));
            },
            () => {}
          ),
          onSnapshot(
            collection(db, 'bookings'),
            (snap) => {
              setBookings(snap.docs.map((d) => d.data() as Booking));
            },
            () => {}
          ),
          onSnapshot(
            collection(db, 'activities'),
            (snap) => {
              const sorted = snap.docs
                .map((d) => d.data() as ActivityEvent)
                .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
              setActivities(sorted);
            },
            () => {}
          ),
        ];
      } catch (err) {
        console.warn('[Firestore] Real-time sync fallback to local/REST:', err);
      }
    }

    initFirestoreSync();

    return () => {
      isCancelled = true;
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  // Connect WebSocket & verify Firestore connection
  useEffect(() => {
    testConnection();
    fetchState();

    let isUnmounted = false;

    function connectWs() {
      if (isUnmounted) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            if (!event.data || typeof event.data !== 'string') return;
            const trimmed = event.data.trim();
            if (!trimmed.startsWith('{')) return;
            const msg = JSON.parse(trimmed);
            switch (msg.type) {
              case 'INIT_STATE': {
                const data: AppStatePayload = msg.payload;
                if (Array.isArray(data.agencies)) setAgencies(data.agencies);
                if (Array.isArray(data.slots)) setSlots(data.slots);
                if (Array.isArray(data.bookings)) setBookings(data.bookings);
                if (Array.isArray(data.consultants)) setConsultants(data.consultants);
                if (Array.isArray(data.partners)) setPartners(data.partners);
                if (Array.isArray(data.activities)) setActivities(data.activities);
                if (data.agencyInfo) setAgencyInfo(data.agencyInfo);
                break;
              }
              case 'AGENCY_REGISTERED': {
                if (Array.isArray(msg.payload.agencies)) {
                  setAgencies(msg.payload.agencies);
                }
                if (msg.payload.agency) {
                  const updatedAg = msg.payload.agency;
                  setCurrentAgency((prev) =>
                    prev && prev.id === updatedAg.id ? { ...prev, ...updatedAg } : prev
                  );
                }
                if (msg.payload.activity) {
                  setActivities((prev) => [
                    msg.payload.activity,
                    ...prev.filter((a) => a.id !== msg.payload.activity.id),
                  ]);
                  addToast({
                    type: 'success',
                    title: msg.payload.activity.title || 'Agência Atualizada',
                    message: msg.payload.activity.description,
                  });
                }
                break;
              }
              case 'PARTNER_REGISTERED': {
                if (Array.isArray(msg.payload.partners)) {
                  setPartners(msg.payload.partners);
                }
                if (Array.isArray(msg.payload.bookings)) {
                  setBookings(msg.payload.bookings);
                }
                if (msg.payload.partner) {
                  const updatedP = msg.payload.partner;
                  setCurrentPartner((prev) =>
                    prev && prev.id === updatedP.id ? { ...prev, ...updatedP } : prev
                  );
                }
                if (msg.payload.activity) {
                  setActivities((prev) => [
                    msg.payload.activity,
                    ...prev.filter((a) => a.id !== msg.payload.activity.id),
                  ]);
                }
                break;
              }
              case 'CONSULTANTS_UPDATED': {
                if (Array.isArray(msg.payload.consultants)) {
                  setConsultants(msg.payload.consultants);
                }
                break;
              }
              case 'SLOT_BOOKED': {
                const { slot, booking, activity } = msg.payload;
                setSlots((prev) => prev.map((s) => (s.id === slot.id ? slot : s)));
                setBookings((prev) => [booking, ...prev.filter((b) => b.id !== booking.id)]);
                if (activity) {
                  setActivities((prev) => [
                    activity,
                    ...prev.filter((a) => a.id !== activity.id),
                  ]);
                  addToast({
                    type: 'info',
                    title: 'Novo Agendamento Confirmado',
                    message: `${booking.partnerName} reservou ${slot.date} às ${slot.startTime} com ${slot.consultantName}`,
                  });
                }
                break;
              }
              case 'BOOKING_UPDATED': {
                const { booking } = msg.payload;
                setBookings((prev) => prev.map((b) => (b.id === booking.id ? booking : b)));
                break;
              }
              case 'SLOT_CANCELLED': {
                const { bookingId, slotId, activity } = msg.payload;
                setSlots((prev) =>
                  prev.map((s) =>
                    s.id === slotId ? { ...s, status: 'available', bookingId: undefined } : s
                  )
                );
                setBookings((prev) =>
                  prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
                );
                if (activity) {
                  setActivities((prev) => [
                    activity,
                    ...prev.filter((a) => a.id !== activity.id),
                  ]);
                  addToast({
                    type: 'warning',
                    title: 'Horário Liberado',
                    message: activity.description,
                  });
                }
                break;
              }
              case 'SLOTS_UPDATED': {
                if (Array.isArray(msg.payload.slots)) {
                  setSlots(msg.payload.slots);
                }
                if (msg.payload.activity) {
                  setActivities((prev) => [
                    msg.payload.activity,
                    ...prev.filter((a) => a.id !== msg.payload.activity.id),
                  ]);
                  addToast({
                    type: 'success',
                    title: msg.payload.activity.title,
                    message: msg.payload.activity.description,
                  });
                }
                break;
              }
              case 'SLOT_STATUS_TOGGLED': {
                const { slotId, status } = msg.payload;
                setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, status } : s)));
                break;
              }
              default:
                break;
            }
          } catch {
            // ignore non-json ws frames
          }
        };

        ws.onclose = () => {
          if (!isUnmounted) {
            reconnectTimeoutRef.current = setTimeout(connectWs, 5000);
          }
        };

        ws.onerror = () => {
          // handled gracefully by Firestore / REST fallback
        };
      } catch {
        // ignore ws creation error on static hosts
      }
    }

    connectWs();

    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'PING' }));
      }
    }, 20000);

    return () => {
      isUnmounted = true;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [addToast, fetchState]);

  // Audit Helper
  const getActorLabel = (): string => {
    if (!currentUser) return 'Sistema';
    if (currentUser.role === 'admin') {
      if (adminPerspective === 'agency_view' && currentAgency) {
        return `Master (Agência ${currentAgency.name})`;
      }
      if (adminPerspective === 'partner_view' && currentPartner) {
        return `Master (Parceiro ${currentPartner.name})`;
      }
      return 'Master';
    }
    if (currentUser.role === 'agency') {
      if (currentUser.isAgencyUser) {
        const ag = agencies.find((a) => a.id === currentUser.agencyId);
        return ag ? `${currentUser.name} (${ag.name})` : currentUser.name;
      }
      return currentUser.name || 'Agência';
    }
    if (currentUser.role === 'partner') {
      return currentUser.name || 'Parceiro';
    }
    return currentUser.name || 'Usuário';
  };

  const formatBrDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const recordAuditActivity = async (
    type: ActivityEvent['type'],
    actionText: string,
    extra?: {
      partnerName?: string;
      agencyName?: string;
      slotTime?: string;
      protocol?: string;
    }
  ) => {
    const actorName = getActorLabel();
    const act: ActivityEvent = {
      id: `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      timestamp: new Date().toISOString(),
      actorName,
      actionText,
      title: `${actorName} - ${actionText}`,
      description: actionText,
      ...extra,
    };
    setActivities((prev) => [act, ...prev]);
    await persistToFirestore('activities', act.id, act);
  };

  // Actions
  const registerAgency = async (data: Partial<Agency>): Promise<Agency> => {
    const apiRes = await safeFetchJson('/api/agencies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    let createdAgency: Agency;
    if (apiRes.isApiAvailable) {
      if (!apiRes.ok) {
        throw new Error(apiRes.data?.error || 'Erro ao cadastrar agência');
      }
      createdAgency = apiRes.data;
    } else {
      if (!data.name || !data.email) {
        throw new Error('Preencha os campos obrigatórios da agência.');
      }
      createdAgency = {
        id: `ag_${Date.now()}`,
        name: data.name.trim(),
        legalName: data.legalName?.trim() || '',
        cnpj: data.cnpj?.trim() || '',
        address: data.address?.trim() || '',
        email: data.email.trim(),
        phone: data.phone?.trim() || '',
        city: data.city || 'São Paulo',
        state: data.state || 'SP',
        managerName: data.managerName || 'Responsável Técnico',
        description: data.description || 'Centralizadora de Agendas e Negociações',
        badgeColor: 'bg-blue-600',
        status: 'active',
        password: data.password || 'agencia123',
        createdAt: new Date().toISOString(),
      };
    }

    await persistToFirestore('agencies', createdAgency.id, createdAgency);
    setAgencies((prev) => [...prev.filter((a) => a.id !== createdAgency.id), createdAgency]);
    await recordAuditActivity('agency_registered', `Inclusão da agência ${createdAgency.name}`, {
      agencyName: createdAgency.name,
    });

    addToast({
      type: 'success',
      title: 'Agência Cadastrada com Sucesso!',
      message: `A agência ${createdAgency.name} agora pode acessar o sistema e gerenciar suas agendas.`,
    });
    return createdAgency;
  };

  const updateAgency = async (id: string, data: Partial<Agency>): Promise<Agency> => {
    const apiRes = await safeFetchJson(`/api/agencies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const existing = agencies.find((a) => a.id === id);
    let updatedAgency: Agency;

    if (apiRes.isApiAvailable && apiRes.ok && apiRes.data) {
      updatedAgency = apiRes.data;
    } else {
      if (!existing) throw new Error('Agência não encontrada.');
      if (!data.name || !data.email) {
        throw new Error('Preencha os campos obrigatórios da agência.');
      }
      updatedAgency = {
        ...existing,
        name: data.name.trim(),
        legalName: data.legalName !== undefined ? data.legalName.trim() : existing.legalName,
        cnpj: data.cnpj !== undefined ? data.cnpj.trim() : existing.cnpj,
        address: data.address !== undefined ? data.address.trim() : existing.address,
        email: data.email.trim(),
        phone: data.phone !== undefined ? data.phone.trim() : existing.phone,
        city: data.city || existing.city,
        state: data.state || existing.state,
        managerName: data.managerName || existing.managerName,
        description: data.description !== undefined ? data.description : existing.description,
        password: data.password || existing.password || 'agencia123',
      };
    }

    await persistToFirestore('agencies', updatedAgency.id, updatedAgency);
    await recordAuditActivity(
      'agency_updated',
      `Alteração do cadastro da agência ${updatedAgency.name}`,
      { agencyName: updatedAgency.name }
    );

    setAgencies((prev) => prev.map((a) => (a.id === id ? updatedAgency : a)));
    setCurrentAgency((prev) => (prev && prev.id === id ? updatedAgency : prev));
    setCurrentUser((prevUser) => {
      if (!prevUser) return null;
      if (prevUser.role === 'agency' && (prevUser.id === id || prevUser.agencyId === id)) {
        const updated = {
          ...prevUser,
          name: updatedAgency.name,
          email: updatedAgency.email,
          representative: updatedAgency.managerName || prevUser.representative,
          cnpj: updatedAgency.cnpj || prevUser.cnpj,
          badgeColor: updatedAgency.badgeColor || prevUser.badgeColor,
        };
        try {
          localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prevUser;
    });

    addToast({
      type: 'success',
      title: 'Agência Atualizada!',
      message: `Os dados da agência ${updatedAgency.name} foram salvos com sucesso.`,
    });
    return updatedAgency;
  };

  const deleteAgency = async (id: string): Promise<boolean> => {
    const targetAgency = agencies.find((a) => a.id === id);
    await safeFetchJson(`/api/agencies/${id}`, {
      method: 'DELETE',
    });
    await removeFromFirestore('agencies', id);
    await recordAuditActivity(
      'agency_deleted',
      `Exclusão da agência ${targetAgency?.name || id}`,
      { agencyName: targetAgency?.name }
    );

    setAgencies((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      if (currentAgency && currentAgency.id === id) {
        setCurrentAgency(filtered.length > 0 ? filtered[0] : null);
      }
      return filtered;
    });
    addToast({
      type: 'info',
      title: 'Agência Excluída',
      message: 'A agência foi removida do sistema com sucesso.',
    });
    return true;
  };

  const registerPartner = async (data: Partial<PartnerProfile>): Promise<PartnerProfile> => {
    const apiRes = await safeFetchJson('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    let createdPartner: PartnerProfile;
    if (apiRes.isApiAvailable && apiRes.ok && apiRes.data) {
      createdPartner = apiRes.data;
    } else {
      if (!data.name || !data.email) {
        throw new Error('Preencha os campos obrigatórios do parceiro.');
      }
      const colors = [
        'bg-orange-500',
        'bg-purple-500',
        'bg-blue-500',
        'bg-emerald-500',
        'bg-rose-500',
        'bg-indigo-500',
      ];
      createdPartner = {
        id: `p_${Date.now()}`,
        name: data.name.trim(),
        segment: data.segment || 'Comércio & Serviços',
        representative: data.representative || data.name.trim(),
        email: data.email.trim(),
        phone: data.phone || '',
        cnpj: data.cnpj || '',
        badgeColor: colors[Math.floor(Math.random() * colors.length)],
        password: data.password || 'parceiro123',
        allowedAgencyIds: Array.isArray(data.allowedAgencyIds) ? data.allowedAgencyIds : [],
        createdAt: new Date().toISOString(),
      };
    }

    if (Array.isArray(data.allowedAgencyIds) && !Array.isArray(createdPartner.allowedAgencyIds)) {
      createdPartner.allowedAgencyIds = data.allowedAgencyIds;
    }

    await persistToFirestore('partners', createdPartner.id, createdPartner);
    setPartners((prev) => [...prev.filter((p) => p.id !== createdPartner.id), createdPartner]);
    await recordAuditActivity('partner_registered', `Inclusão do parceiro ${createdPartner.name}`, {
      partnerName: createdPartner.name,
    });

    addToast({
      type: 'success',
      title: 'Parceiro Cadastrado com Sucesso!',
      message: `${createdPartner.name} pode verificar horários disponíveis e agendar reuniões.`,
    });
    return createdPartner;
  };

  const updatePartner = async (
    id: string,
    data: Partial<PartnerProfile>
  ): Promise<PartnerProfile> => {
    const apiRes = await safeFetchJson(`/api/partners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const existing = partners.find((p) => p.id === id);
    let updatedPartner: PartnerProfile;

    if (apiRes.isApiAvailable && apiRes.ok && apiRes.data) {
      updatedPartner = {
        ...apiRes.data,
        allowedAgencyIds: Array.isArray(data.allowedAgencyIds)
          ? data.allowedAgencyIds
          : Array.isArray(apiRes.data.allowedAgencyIds)
            ? apiRes.data.allowedAgencyIds
            : existing?.allowedAgencyIds || [],
      };
    } else {
      if (!existing) throw new Error('Parceiro não encontrado.');
      if (!data.name || !data.email || !data.cnpj) {
        throw new Error('Preencha todos os campos obrigatórios do parceiro.');
      }
      updatedPartner = {
        ...existing,
        name: data.name.trim(),
        segment: data.segment || existing.segment || 'Parceiro Negocial',
        representative: data.representative || data.name.trim(),
        email: data.email.trim(),
        phone: data.phone !== undefined ? data.phone.trim() : existing.phone,
        cnpj: data.cnpj.trim(),
        password: data.password || existing.password || 'parceiro123',
        allowedAgencyIds: Array.isArray(data.allowedAgencyIds)
          ? data.allowedAgencyIds
          : existing.allowedAgencyIds || [],
      };
    }

    await persistToFirestore('partners', updatedPartner.id, updatedPartner);
    await recordAuditActivity(
      'partner_updated',
      `Alteração do cadastro do parceiro ${updatedPartner.name}`,
      { partnerName: updatedPartner.name }
    );

    setPartners((prev) => prev.map((p) => (p.id === id ? updatedPartner : p)));
    setCurrentPartner((prev) => (prev && prev.id === id ? updatedPartner : prev));
    setCurrentUser((prevUser) => {
      if (!prevUser) return null;
      if (prevUser.role === 'partner' && (prevUser.id === id || prevUser.partnerId === id)) {
        const updated = {
          ...prevUser,
          name: updatedPartner.name,
          email: updatedPartner.email,
          representative: updatedPartner.representative || prevUser.representative,
          cnpj: updatedPartner.cnpj || prevUser.cnpj,
          badgeColor: updatedPartner.badgeColor || prevUser.badgeColor,
        };
        try {
          localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prevUser;
    });

    // Replicate partner data across all bookings belonging to this partner
    setBookings((prev) =>
      prev.map((b) => {
        if (b.partnerId === id) {
          const updatedB = {
            ...b,
            partnerName: updatedPartner.name,
            partnerRepresentative: updatedPartner.representative,
            partnerEmail: updatedPartner.email,
            partnerPhone: updatedPartner.phone || b.partnerPhone,
            partnerCnpj: updatedPartner.cnpj,
          };
          persistToFirestore('bookings', updatedB.id, updatedB);
          return updatedB;
        }
        return b;
      })
    );

    addToast({
      type: 'success',
      title: 'Parceiro Atualizado!',
      message: `Os dados de ${updatedPartner.name} foram salvos com sucesso.`,
    });
    return updatedPartner;
  };

  const togglePartnerAgencyAccess = async (partnerId: string, agencyId: string): Promise<void> => {
    const existing = partners.find((p) => p.id === partnerId);
    if (!existing || !agencyId) return;

    const currentIds = Array.isArray(existing.allowedAgencyIds) ? existing.allowedAgencyIds : [];
    const isCurrentlyAllowed = currentIds.includes(agencyId);
    const nextAllowedIds = isCurrentlyAllowed
      ? currentIds.filter((id) => id !== agencyId)
      : [...currentIds, agencyId];

    const updatedPartner: PartnerProfile = {
      ...existing,
      allowedAgencyIds: nextAllowedIds,
    };

    setPartners((prev) => prev.map((p) => (p.id === partnerId ? updatedPartner : p)));
    setCurrentPartner((prev) => (prev && prev.id === partnerId ? updatedPartner : prev));

    await safeFetchJson(`/api/partners/${partnerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPartner),
    });
    await persistToFirestore('partners', updatedPartner.id, updatedPartner);

    const targetAg = agencies.find((a) => a.id === agencyId);
    await recordAuditActivity(
      'partner_updated',
      `${isCurrentlyAllowed ? 'Remoção' : 'Liberação'} de acesso do parceiro ${existing.name} na agência ${targetAg?.name || agencyId}`,
      { partnerName: existing.name, agencyName: targetAg?.name }
    );
  };

  const deletePartner = async (id: string): Promise<boolean> => {
    const targetPartner = partners.find((p) => p.id === id);
    await safeFetchJson(`/api/partners/${id}`, {
      method: 'DELETE',
    });
    await removeFromFirestore('partners', id);
    await recordAuditActivity(
      'partner_deleted',
      `Exclusão do parceiro ${targetPartner?.name || id}`,
      { partnerName: targetPartner?.name }
    );

    setPartners((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      if (currentPartner && currentPartner.id === id) {
        setCurrentPartner(filtered.length > 0 ? filtered[0] : null);
      }
      return filtered;
    });
    addToast({
      type: 'info',
      title: 'Parceiro Excluído',
      message: 'O cadastro do parceiro foi removido do sistema.',
    });
    return true;
  };

  const registerConsultant = async (data: Partial<Consultant>): Promise<Consultant> => {
    const apiRes = await safeFetchJson('/api/consultants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    let createdConsultant: Consultant;
    if (apiRes.isApiAvailable && apiRes.ok && apiRes.data) {
      createdConsultant = apiRes.data;
    } else {
      if (!data.name || !data.email || !data.password) {
        throw new Error('Preencha todos os campos obrigatórios do usuário.');
      }
      const colors = [
        'bg-emerald-600',
        'bg-blue-600',
        'bg-indigo-600',
        'bg-amber-600',
        'bg-cyan-600',
      ];
      createdConsultant = {
        id: `c_${Date.now()}`,
        agencyId: data.agencyId || agencies[0]?.id || 'ag_1',
        name: data.name.trim(),
        role: (data.role || 'Usuário da Agência').trim(),
        department: (data.department || 'Atendimento & Negócios').trim(),
        email: data.email.trim(),
        password: data.password.trim(),
        avatarColor: colors[Math.floor(Math.random() * colors.length)],
        specialties: ['Atendimento', 'Negócios'],
      };
    }

    await persistToFirestore('consultants', createdConsultant.id, createdConsultant);
    setConsultants((prev) => [
      ...prev.filter((c) => c.id !== createdConsultant.id),
      createdConsultant,
    ]);
    await recordAuditActivity(
      'consultant_registered',
      `Inclusão do usuário ${createdConsultant.name}`
    );

    addToast({
      type: 'success',
      title: 'Usuário Cadastrado!',
      message: `${createdConsultant.name} foi adicionado(a) à equipe da agência.`,
    });
    return createdConsultant;
  };

  const updateConsultant = async (id: string, data: Partial<Consultant>): Promise<Consultant> => {
    const apiRes = await safeFetchJson(`/api/consultants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const existing = consultants.find((c) => c.id === id);
    let updated: Consultant;

    if (apiRes.isApiAvailable && apiRes.ok && apiRes.data) {
      updated = apiRes.data;
    } else {
      if (!existing) throw new Error('Usuário não encontrado.');
      if (!data.name || !data.email || !data.password) {
        throw new Error('Preencha todos os campos obrigatórios do usuário.');
      }
      updated = {
        ...existing,
        name: data.name.trim(),
        role: (data.role || existing.role || 'Usuário da Agência').trim(),
        department: (data.department || existing.department || 'Atendimento & Negócios').trim(),
        email: data.email.trim(),
        password: data.password.trim(),
      };
    }

    await persistToFirestore('consultants', updated.id, updated);
    setConsultants((prev) => prev.map((c) => (c.id === id ? updated : c)));
    await recordAuditActivity(
      'consultant_updated',
      `Alteração do cadastro do usuário ${updated.name}`
    );

    addToast({
      type: 'success',
      title: 'Usuário Atualizado!',
      message: `Os dados de ${updated.name} foram salvos com sucesso.`,
    });
    return updated;
  };

  const deleteConsultant = async (id: string): Promise<boolean> => {
    const targetConsultant = consultants.find((c) => c.id === id);
    await safeFetchJson(`/api/consultants/${id}`, {
      method: 'DELETE',
    });
    await removeFromFirestore('consultants', id);
    setConsultants((prev) => prev.filter((c) => c.id !== id));
    await recordAuditActivity(
      'consultant_deleted',
      `Exclusão do usuário ${targetConsultant?.name || id}`
    );
    addToast({
      type: 'info',
      title: 'Usuário Excluído',
      message: 'O cadastro do usuário foi removido da agência.',
    });
    return true;
  };

  const bookSlot = async (bookingData: {
    slotId: string;
    partnerId: string;
    partnerName: string;
    partnerRepresentative: string;
    partnerEmail: string;
    partnerPhone?: string;
    partnerCnpj?: string;
    clientName?: string;
    clientCpf?: string;
    propertyType?: PropertyType;
    fidelizacaoValor?: string;
    fidelizacaoResponsavel?: FidelizacaoResponsavel | '';
    isConstrutora?: boolean;
    agendaTopic?: string;
    dealEstimate?: string;
    additionalAttendees?: string;
    partnerNotes?: string;
  }) => {
    const apiRes = await safeFetchJson('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });

    if (apiRes.isApiAvailable && apiRes.ok && apiRes.data?.booking) {
      const { booking, slot } = apiRes.data;
      if (slot) {
        await persistToFirestore('slots', slot.id, slot);
        setSlots((prev) => prev.map((s) => (s.id === slot.id ? slot : s)));
      }
      await persistToFirestore('bookings', booking.id, booking);
      setBookings((prev) => [booking, ...prev.filter((b) => b.id !== booking.id)]);
      await recordAuditActivity(
        'booking_confirmed',
        `Inclusão de agendamento do cliente ${booking.clientName || booking.partnerName} (${booking.slotStartTime} - ${formatBrDate(booking.slotDate)})`,
        {
          partnerName: booking.partnerName,
          slotTime: `${booking.slotDate} ${booking.slotStartTime}`,
          protocol: booking.protocol,
        }
      );
      addToast({
        type: 'success',
        title: 'Confirmação Automática Concluída!',
        message: `Protocolo ${booking.protocol} gerado com sucesso.`,
      });
      return apiRes.data;
    }

    // Client + Firestore execution fallback
    const slot = slots.find((s) => s.id === bookingData.slotId);
    if (!slot) {
      throw new Error('Horário selecionado não existe mais.');
    }
    if (slot.status !== 'available') {
      throw new Error('Este horário acabou de ser reservado ou bloqueado.');
    }

    const bookingId = `bk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const protocol = `AGB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const securityCode = `SEC-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;
    const finalPropertyType: PropertyType =
      bookingData.propertyType === 'Empreendimento' ? 'Empreendimento' : 'Imóvel Individual';
    const finalAgendaTopic =
      bookingData.agendaTopic || `${finalPropertyType}: ${bookingData.clientName || 'Cliente'}`;

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
      partnerId: bookingData.partnerId || `p_custom_${Date.now()}`,
      partnerName: bookingData.partnerName || 'Parceiro Negocial',
      partnerRepresentative:
        bookingData.partnerRepresentative || bookingData.partnerName || 'Representante',
      partnerEmail: bookingData.partnerEmail || 'contato@parceiro.com.br',
      partnerPhone: bookingData.partnerPhone || '',
      partnerCnpj: bookingData.partnerCnpj || '',
      clientName: bookingData.clientName || '',
      clientCpf: bookingData.clientCpf || '',
      propertyType: finalPropertyType,
      fidelizacaoValor: bookingData.fidelizacaoValor || '',
      ...(bookingData.fidelizacaoResponsavel
        ? { fidelizacaoResponsavel: bookingData.fidelizacaoResponsavel }
        : {}),
      isConstrutora:
        bookingData.fidelizacaoResponsavel === 'Construtora' || Boolean(bookingData.isConstrutora),
      agendaTopic: finalAgendaTopic,
      dealEstimate: bookingData.dealEstimate || '',
      additionalAttendees: bookingData.additionalAttendees || '',
      partnerNotes: bookingData.partnerNotes || '',
      status: 'confirmed',
      autoConfirmedAt: new Date().toISOString(),
      securityCode,
    };

    const updatedSlot: TimeSlot = {
      ...slot,
      status: 'booked',
      bookingId,
    };

    await Promise.all([
      persistToFirestore('slots', updatedSlot.id, updatedSlot),
      persistToFirestore('bookings', booking.id, booking),
    ]);

    setSlots((prev) => prev.map((s) => (s.id === updatedSlot.id ? updatedSlot : s)));
    setBookings((prev) => [booking, ...prev.filter((b) => b.id !== booking.id)]);
    await recordAuditActivity(
      'booking_confirmed',
      `Inclusão de agendamento do cliente ${booking.clientName || booking.partnerName} (${slot.startTime} - ${formatBrDate(slot.date)})`,
      {
        partnerName: booking.partnerName,
        slotTime: `${slot.date} ${slot.startTime}`,
        protocol,
      }
    );

    addToast({
      type: 'success',
      title: 'Confirmação Automática Concluída!',
      message: `Protocolo ${booking.protocol} gerado com sucesso.`,
    });

    return {
      success: true,
      booking,
      message: 'Agendamento confirmado automaticamente pela Agência Central!',
    };
  };

  const updateBooking = async (
    id: string,
    updateData: {
      clientName: string;
      clientCpf: string;
      propertyType: PropertyType;
      fidelizacaoValor?: string;
      fidelizacaoResponsavel?: FidelizacaoResponsavel | '';
      isConstrutora?: boolean;
      partnerNotes?: string;
      partnerId?: string;
      partnerName?: string;
      partnerRepresentative?: string;
      partnerEmail?: string;
      partnerPhone?: string;
      partnerCnpj?: string;
      outcome?: BookingOutcome;
    }
  ): Promise<Booking> => {
    const existing = bookings.find((b) => b.id === id);

    const apiRes = await safeFetchJson(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const baseBooking: Booking | undefined =
      existing || (apiRes.isApiAvailable && apiRes.ok ? apiRes.data?.booking : undefined);

    if (!baseBooking) {
      throw new Error('Agendamento não encontrado.');
    }

    const updatedBooking: Booking = {
      ...baseBooking,
      clientName: updateData.clientName,
      clientCpf: updateData.clientCpf,
      propertyType: updateData.propertyType,
      fidelizacaoValor:
        updateData.fidelizacaoValor !== undefined
          ? updateData.fidelizacaoValor
          : baseBooking.fidelizacaoValor,
      isConstrutora:
        updateData.isConstrutora !== undefined
          ? updateData.isConstrutora
          : baseBooking.isConstrutora,
      partnerId: updateData.partnerId || baseBooking.partnerId,
      partnerName: updateData.partnerName || baseBooking.partnerName,
      partnerRepresentative:
        updateData.partnerRepresentative || baseBooking.partnerRepresentative,
      partnerEmail: updateData.partnerEmail || baseBooking.partnerEmail,
      partnerPhone:
        updateData.partnerPhone !== undefined ? updateData.partnerPhone : baseBooking.partnerPhone,
      partnerCnpj:
        updateData.partnerCnpj !== undefined ? updateData.partnerCnpj : baseBooking.partnerCnpj,
      outcome:
        updateData.outcome !== undefined ? updateData.outcome : baseBooking.outcome,
      agendaTopic: `${updateData.propertyType || 'Imóvel'}: ${updateData.clientName || 'Cliente'}`,
    };

    if (updateData.fidelizacaoResponsavel !== undefined) {
      if (updateData.fidelizacaoResponsavel) {
        updatedBooking.fidelizacaoResponsavel = updateData.fidelizacaoResponsavel;
      } else {
        delete updatedBooking.fidelizacaoResponsavel;
      }
    }

    if (updateData.partnerNotes !== undefined) {
      const trimmedNotes = updateData.partnerNotes.trim();
      if (trimmedNotes) {
        updatedBooking.partnerNotes = trimmedNotes;
      } else {
        delete updatedBooking.partnerNotes;
      }
    }

    setBookings((prev) => prev.map((b) => (b.id === id ? updatedBooking : b)));
    await persistToFirestore('bookings', updatedBooking.id, updatedBooking);
    await recordAuditActivity(
      'booking_updated',
      `Alteração no agendamento do cliente ${updatedBooking.clientName || updatedBooking.partnerName} (${updatedBooking.slotStartTime} - ${formatBrDate(updatedBooking.slotDate)})`,
      {
        partnerName: updatedBooking.partnerName,
        protocol: updatedBooking.protocol,
      }
    );

    addToast({
      type: 'success',
      title: 'Agendamento Atualizado!',
      message: `Dados do cliente ${updatedBooking.clientName} atualizados com sucesso.`,
    });

    return updatedBooking;
  };

  const updateBookingOutcome = async (
    bookingId: string,
    outcome: BookingOutcome | null
  ): Promise<void> => {
    const existing = bookings.find((b) => b.id === bookingId);
    if (!existing) return;

    const updatedBooking: Booking = {
      ...existing,
    };
    if (outcome) {
      updatedBooking.outcome = outcome;
    } else {
      delete updatedBooking.outcome;
    }

    setBookings((prev) => prev.map((b) => (b.id === bookingId ? updatedBooking : b)));

    await safeFetchJson(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: outcome || '' }),
    });

    await persistToFirestore('bookings', updatedBooking.id, updatedBooking);
    await recordAuditActivity(
      'booking_updated',
      outcome
        ? `Marcação de status "${outcome}" no agendamento de ${existing.clientName || existing.partnerName} (${existing.slotStartTime} - ${formatBrDate(existing.slotDate)})`
        : `Remoção de status no agendamento de ${existing.clientName || existing.partnerName} (${existing.slotStartTime} - ${formatBrDate(existing.slotDate)})`,
      {
        partnerName: existing.partnerName,
        protocol: existing.protocol,
      }
    );

    addToast({
      type: 'info',
      title: outcome ? `Status: ${outcome}` : 'Status Removido',
      message: outcome
        ? `O agendamento de ${existing.clientName || existing.partnerName} foi marcado como "${outcome}".`
        : `O status do agendamento de ${existing.clientName || existing.partnerName} foi limpo.`,
    });
  };

  const updateBookingSegmento = async (
    bookingId: string,
    segmento: BookingSegmento | null
  ): Promise<void> => {
    const existing = bookings.find((b) => b.id === bookingId);
    if (!existing) return;

    const updatedBooking: Booking = {
      ...existing,
    };
    if (segmento) {
      updatedBooking.segmento = segmento;
    } else {
      delete updatedBooking.segmento;
    }

    setBookings((prev) => prev.map((b) => (b.id === bookingId ? updatedBooking : b)));

    await safeFetchJson(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segmento: segmento || '' }),
    });

    await persistToFirestore('bookings', updatedBooking.id, updatedBooking);
    await recordAuditActivity(
      'booking_updated',
      segmento
        ? `Marcação de segmento "${segmento}" no agendamento de ${existing.clientName || existing.partnerName} (${existing.slotStartTime} - ${formatBrDate(existing.slotDate)})`
        : `Remoção de segmento no agendamento de ${existing.clientName || existing.partnerName} (${existing.slotStartTime} - ${formatBrDate(existing.slotDate)})`,
      {
        partnerName: existing.partnerName,
        protocol: existing.protocol,
      }
    );

    addToast({
      type: 'info',
      title: segmento ? `Segmento: ${segmento}` : 'Segmento Removido',
      message: segmento
        ? `O agendamento de ${existing.clientName || existing.partnerName} foi definido como "${segmento}".`
        : `O segmento do agendamento de ${existing.clientName || existing.partnerName} foi limpo.`,
    });
  };

  const cancelBooking = async (bookingId: string, reason?: string): Promise<boolean> => {
    try {
      const apiRes = await safeFetchJson(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const existingBooking = bookings.find((b) => b.id === bookingId);
      if (existingBooking) {
        const updatedBooking: Booking = {
          ...existingBooking,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason || 'Cancelado a pedido do participante',
        };
        await persistToFirestore('bookings', updatedBooking.id, updatedBooking);
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? updatedBooking : b)));

        const existingSlot = slots.find((s) => s.id === existingBooking.slotId);
        if (existingSlot) {
          const updatedSlot: TimeSlot = {
            ...existingSlot,
            status: 'available',
            bookingId: undefined,
          };
          await persistToFirestore('slots', updatedSlot.id, updatedSlot);
          setSlots((prev) => prev.map((s) => (s.id === updatedSlot.id ? updatedSlot : s)));
        }

        await recordAuditActivity(
          'booking_cancelled',
          `Cancelamento do agendamento do cliente ${existingBooking.clientName || existingBooking.partnerName} (${existingBooking.slotStartTime} - ${formatBrDate(existingBooking.slotDate)})`,
          {
            partnerName: existingBooking.partnerName,
            protocol: existingBooking.protocol,
          }
        );
      } else if (apiRes.isApiAvailable && !apiRes.ok) {
        throw new Error(apiRes.data?.error || 'Erro ao cancelar');
      }

      addToast({
        type: 'info',
        title: 'Agendamento Cancelado',
        message: 'O horário foi disponibilizado novamente na grade.',
      });
      return true;
    } catch (e: any) {
      addToast({
        type: 'error',
        title: 'Erro ao cancelar',
        message: e.message || 'Falha ao cancelar agendamento.',
      });
      return false;
    }
  };

  const toggleSlotStatus = async (slotId: string): Promise<boolean> => {
    try {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) throw new Error('Horário não encontrado.');
      if (slot.status === 'booked') {
        throw new Error('Não é possível alterar um horário que já foi confirmado por um parceiro.');
      }

      await safeFetchJson(`/api/slots/${slotId}/toggle`, {
        method: 'PATCH',
      });

      const newStatus: 'available' | 'locked' =
        slot.status === 'available' ? 'locked' : 'available';
      const updatedSlot: TimeSlot = { ...slot, status: newStatus };
      await persistToFirestore('slots', updatedSlot.id, updatedSlot);
      setSlots((prev) => prev.map((s) => (s.id === slotId ? updatedSlot : s)));
      await recordAuditActivity(
        'slot_toggled',
        `${newStatus === 'locked' ? 'Bloqueio' : 'Desbloqueio'} de horário (${slot.startTime} - ${formatBrDate(slot.date)})`,
        { slotTime: `${slot.date} ${slot.startTime}` }
      );
      return true;
    } catch (e: any) {
      addToast({
        type: 'error',
        title: 'Ação não permitida',
        message: e.message,
      });
      return false;
    }
  };

  const deleteSlot = async (slotId: string): Promise<boolean> => {
    try {
      const slot = slots.find((s) => s.id === slotId);
      if (slot && slot.status === 'booked') {
        throw new Error(
          'Não é possível excluir um horário que já possui agendamento confirmado.'
        );
      }
      await safeFetchJson(`/api/slots/${slotId}`, {
        method: 'DELETE',
      });
      await removeFromFirestore('slots', slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      await recordAuditActivity(
        'slot_deleted',
        `Exclusão de horário disponível (${slot ? `${slot.startTime} - ${formatBrDate(slot.date)}` : slotId})`
      );
      addToast({
        type: 'info',
        title: 'Horário Removido',
        message: 'O horário foi retirado da grade semanal.',
      });
      return true;
    } catch (e: any) {
      addToast({
        type: 'error',
        title: 'Erro ao excluir',
        message: e.message,
      });
      return false;
    }
  };

  const batchGenerateSlots = async (params: BatchGenerationParams): Promise<number> => {
    const apiRes = await safeFetchJson('/api/slots/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (apiRes.isApiAvailable && apiRes.ok && apiRes.data) {
      if (Array.isArray(apiRes.data.slots)) {
        for (const s of apiRes.data.slots) {
          persistToFirestore('slots', s.id, s);
        }
        setSlots((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          return [...prev, ...apiRes.data.slots.filter((s: TimeSlot) => !existingIds.has(s.id))];
        });
      }
      await recordAuditActivity(
        'slots_batch_opened',
        `Inclusão de ${apiRes.data.createdCount} horários na grade (${formatBrDate(params.startDate)} a ${formatBrDate(params.endDate)})`
      );
      addToast({
        type: 'success',
        title: 'Grade Semanal Publicada!',
        message: `${apiRes.data.createdCount} horários foram abertos e disponibilizados aos parceiros.`,
      });
      return apiRes.data.createdCount;
    }

    // Client + Firestore fallback
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
      const dayOfWeek = cur.getDay();
      if (!selectedDays.includes(dayOfWeek)) continue;

      const dateStr = formatSeedDate(cur);

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

    for (const s of newSlots) {
      persistToFirestore('slots', s.id, s);
    }
    setSlots((prev) => [...prev, ...newSlots]);
    await recordAuditActivity(
      'slots_batch_opened',
      `Inclusão de ${newSlots.length} horários na grade (${formatBrDate(params.startDate)} a ${formatBrDate(params.endDate)})`
    );

    addToast({
      type: 'success',
      title: 'Grade Semanal Publicada!',
      message: `${newSlots.length} horários foram abertos e disponibilizados aos parceiros.`,
    });
    return newSlots.length;
  };

  const createSingleSlot = async (slotData: Partial<TimeSlot>): Promise<boolean> => {
    const apiRes = await safeFetchJson('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slotData),
    });

    let createdSlot: TimeSlot;
    if (apiRes.isApiAvailable && apiRes.ok && apiRes.data) {
      createdSlot = apiRes.data;
    } else {
      const targetAgencyId = slotData.agencyId || agencies[0]?.id || 'ag_1';
      const targetAgency = agencies.find((a) => a.id === targetAgencyId) || agencies[0];
      const consultant =
        consultants.find((c) => c.id === slotData.consultantId) ||
        consultants[0] || {
          id: slotData.consultantId || 'equipe_central',
          name: targetAgency?.managerName || targetAgency?.name || 'Equipe da Agência',
          role: 'Atendimento & Negócios',
        };
      createdSlot = {
        id: `slot_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        agencyId: targetAgencyId,
        date: slotData.date || formatSeedDate(new Date()),
        startTime: slotData.startTime || '09:00',
        endTime: slotData.endTime || '10:00',
        durationMinutes: Number(slotData.durationMinutes) || 60,
        consultantId: consultant.id,
        consultantName: consultant.name,
        consultantRole: consultant.role,
        serviceCategory: slotData.serviceCategory || 'Alinhamento Estratégico',
        modality: slotData.modality || 'online',
        locationOrLink:
          slotData.locationOrLink ||
          (slotData.modality === 'online'
            ? `Google Meet: meet.google.com/hub-${Date.now().toString(36)}`
            : 'Sala de Reuniões da Agência Central'),
        status: 'available',
        notes: slotData.notes || '',
        createdAt: new Date().toISOString(),
      };
    }

    await persistToFirestore('slots', createdSlot.id, createdSlot);
    setSlots((prev) => [createdSlot, ...prev.filter((s) => s.id !== createdSlot.id)]);
    await recordAuditActivity(
      'slot_created',
      `Inclusão de horário disponível (${createdSlot.startTime} - ${formatBrDate(createdSlot.date)})`,
      { slotTime: `${createdSlot.date} ${createdSlot.startTime}` }
    );

    addToast({
      type: 'success',
      title: 'Horário Adicionado',
      message: `Horário ${createdSlot.date} às ${createdSlot.startTime} disponibilizado.`,
    });
    return true;
  };

  const resetDemoData = async () => {
    try {
      const apiRes = await safeFetchJson('/api/reset-demo', { method: 'POST' });
      if (apiRes.isApiAvailable && apiRes.ok) {
        addToast({
          type: 'info',
          title: 'Dados Reiniciados',
          message: 'A agenda e agendamentos foram redefinidos para os valores de demonstração.',
        });
      }
    } catch (e) {
      console.error('Reset error:', e);
    }
  };

  return (
    <RealtimeContext.Provider
      value={{
        agencies,
        slots,
        bookings,
        consultants,
        partners,
        activities,
        agencyInfo,
        isConnected,
        currentUser,
        login,
        logout,
        currentAgency,
        setCurrentAgency,
        currentPartner,
        setCurrentPartner,
        selectedLoginRole,
        setSelectedLoginRole,
        adminPerspective,
        setAdminPerspective,
        agencyActiveView,
        setAgencyActiveView,
        loginWithCredentials,
        theme,
        toggleTheme,
        toasts,
        removeToast,
        editingAgencyModal,
        openAgencyModal,
        closeAgencyModal,
        editingPartnerModal,
        openPartnerModal,
        closePartnerModal,
        registerAgency,
        updateAgency,
        deleteAgency,
        registerPartner,
        updatePartner,
        togglePartnerAgencyAccess,
        deletePartner,
        registerConsultant,
        updateConsultant,
        deleteConsultant,
        bookSlot,
        updateBooking,
        updateBookingOutcome,
        updateBookingSegmento,
        cancelBooking,
        toggleSlotStatus,
        deleteSlot,
        batchGenerateSlots,
        createSingleSlot,
        resetDemoData,
        refreshState: fetchState,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}
