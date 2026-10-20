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
  UserRole,
  PropertyType,
} from '../types/index.ts';
import { testConnection } from '../lib/firebase.ts';

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
  loginWithCredentials: (username: string, password: string, role?: 'admin' | 'agency' | 'partner') => Promise<UserSession>;
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
    agendaTopic?: string;
    dealEstimate?: string;
    additionalAttendees?: string;
    partnerNotes?: string;
  }) => Promise<{ success: boolean; booking: Booking; message: string }>;
  updateBooking: (id: string, data: {
    clientName: string;
    clientCpf: string;
    propertyType: PropertyType;
    partnerNotes?: string;
  }) => Promise<Booking>;
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
  const [agencyInfo, setAgencyInfo] = useState<AppStatePayload['agencyInfo']>({
    name: 'Central Agência de Negócios & Parcerias',
    description: 'Unidade Centralizadora de Agendas Institucionais e Negociações Corporativas',
    autoConfirmEnabled: true,
    maxBookingsPerPartnerPerWeek: 5,
  });

  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // Current logged in user session (opens system with login screen)
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // Active selected agency (for agency role or filtering)
  const [currentAgency, setCurrentAgency] = useState<Agency | null>(null);

  // Active selected partner
  const [currentPartner, setCurrentPartner] = useState<PartnerProfile | null>(null);

  // Active role selected in login screen
  const [selectedLoginRole, setSelectedLoginRole] = useState<'admin' | 'agency' | 'partner'>('admin');

  // Perspective for administrator ('admin_master' | 'agency_view' | 'partner_view')
  const [adminPerspective, setAdminPerspective] = useState<'admin_master' | 'agency_view' | 'partner_view'>('admin_master');

  // Active sub-view inside Agency perspective ('schedule' | 'partners' | 'users')
  const [agencyActiveView, setAgencyActiveView] = useState<'schedule' | 'partners' | 'users'>('schedule');

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

  const loginWithCredentials = async (
    username: string,
    password: string,
    role?: 'admin' | 'agency' | 'partner'
  ): Promise<UserSession> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, username, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Credenciais inválidas.');
    }
    const session: UserSession = data.session;
    login(session);
    addToast({
      type: 'success',
      title: 'Acesso Autorizado',
      message: `Bem-vindo(a) ao Syncz, ${session.name}!`,
    });
    return session;
  };

  // Fetch state via REST fallback
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data: AppStatePayload = await res.json();
        setAgencies(data.agencies || []);
        setSlots(data.slots || []);
        setBookings(data.bookings || []);
        setConsultants(data.consultants || []);
        setPartners(data.partners || []);
        setActivities(data.activities || []);
        if (data.agencyInfo) setAgencyInfo(data.agencyInfo);

        if (data.agencies && data.agencies.length > 0 && !currentAgency) {
          setCurrentAgency(data.agencies[0]);
        }
        if (data.partners && data.partners.length > 0 && !currentPartner) {
          setCurrentPartner(data.partners[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch initial state:', err);
    }
  }, [currentAgency, currentPartner]);

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
            const msg = JSON.parse(event.data);
            switch (msg.type) {
              case 'INIT_STATE': {
                const data: AppStatePayload = msg.payload;
                setAgencies(data.agencies || []);
                setSlots(data.slots || []);
                setBookings(data.bookings || []);
                setConsultants(data.consultants || []);
                setPartners(data.partners || []);
                setActivities(data.activities || []);
                if (data.agencyInfo) setAgencyInfo(data.agencyInfo);
                break;
              }
              case 'AGENCY_REGISTERED': {
                setAgencies(msg.payload.agencies);
                if (msg.payload.agency) {
                  const updatedAg = msg.payload.agency;
                  setCurrentAgency((prev) => (prev && prev.id === updatedAg.id ? { ...prev, ...updatedAg } : prev));
                  setCurrentUser((prevUser) => {
                    if (!prevUser) return null;
                    if (
                      prevUser.role === 'agency' &&
                      (prevUser.id === updatedAg.id || prevUser.agencyId === updatedAg.id)
                    ) {
                      const updated = {
                        ...prevUser,
                        name: updatedAg.name,
                        email: updatedAg.email,
                        representative: updatedAg.managerName || prevUser.representative,
                        cnpj: updatedAg.cnpj || prevUser.cnpj,
                        badgeColor: updatedAg.badgeColor || prevUser.badgeColor,
                      };
                      try {
                        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updated));
                      } catch {}
                      return updated;
                    }
                    return prevUser;
                  });
                }
                if (msg.payload.activity) {
                  setActivities((prev) => [msg.payload.activity, ...prev]);
                  addToast({
                    type: 'success',
                    title: msg.payload.activity.title || 'Agência Cadastrada',
                    message: msg.payload.activity.description,
                  });
                }
                break;
              }
              case 'PARTNER_REGISTERED': {
                setPartners(msg.payload.partners);
                if (msg.payload.bookings) {
                  setBookings(msg.payload.bookings);
                }
                if (msg.payload.partner) {
                  const updatedP = msg.payload.partner;
                  setCurrentPartner((prev) => (prev && prev.id === updatedP.id ? { ...prev, ...updatedP } : prev));
                  setCurrentUser((prevUser) => {
                    if (!prevUser) return null;
                    if (
                      prevUser.role === 'partner' &&
                      (prevUser.id === updatedP.id || prevUser.partnerId === updatedP.id)
                    ) {
                      const updated = {
                        ...prevUser,
                        name: updatedP.name,
                        email: updatedP.email,
                        representative: updatedP.representative || prevUser.representative,
                        cnpj: updatedP.cnpj || prevUser.cnpj,
                        badgeColor: updatedP.badgeColor || prevUser.badgeColor,
                      };
                      try {
                        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updated));
                      } catch {}
                      return updated;
                    }
                    return prevUser;
                  });
                }
                if (msg.payload.activity) {
                  setActivities((prev) => [msg.payload.activity, ...prev]);
                }
                break;
              }
              case 'CONSULTANTS_UPDATED': {
                setConsultants(msg.payload.consultants);
                break;
              }
              case 'SLOT_BOOKED': {
                const { slot, booking, activity } = msg.payload;
                setSlots((prev) => prev.map((s) => (s.id === slot.id ? slot : s)));
                setBookings((prev) => [booking, ...prev.filter((b) => b.id !== booking.id)]);
                if (activity) {
                  setActivities((prev) => [activity, ...prev]);
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
                  prev.map((s) => (s.id === slotId ? { ...s, status: 'available', bookingId: undefined } : s))
                );
                setBookings((prev) =>
                  prev.map((b) => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
                );
                if (activity) {
                  setActivities((prev) => [activity, ...prev]);
                  addToast({
                    type: 'warning',
                    title: 'Horário Liberado',
                    message: activity.description,
                  });
                }
                break;
              }
              case 'SLOTS_UPDATED': {
                if (msg.payload.slots) {
                  setSlots(msg.payload.slots);
                }
                if (msg.payload.activity) {
                  setActivities((prev) => [msg.payload.activity, ...prev]);
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
          } catch (e) {
            console.error('Error parsing ws message:', e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          if (!isUnmounted) {
            reconnectTimeoutRef.current = setTimeout(connectWs, 2000);
          }
        };

        ws.onerror = () => {
          setIsConnected(false);
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
        if (!isUnmounted) {
          reconnectTimeoutRef.current = setTimeout(connectWs, 2500);
        }
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

  // Actions
  const registerAgency = async (data: Partial<Agency>): Promise<Agency> => {
    const res = await fetch('/api/agencies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao cadastrar agência');
    addToast({
      type: 'success',
      title: 'Agência Cadastrada com Sucesso!',
      message: `A agência ${result.name} agora pode acessar o sistema e gerenciar suas agendas.`,
    });
    return result;
  };

  const updateAgency = async (id: string, data: Partial<Agency>): Promise<Agency> => {
    const res = await fetch(`/api/agencies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao atualizar agência');
    setAgencies((prev) => prev.map((a) => (a.id === id ? result : a)));
    setCurrentAgency((prev) => (prev && prev.id === id ? result : prev));
    setCurrentUser((prevUser) => {
      if (!prevUser) return null;
      if (prevUser.role === 'agency' && (prevUser.id === id || prevUser.agencyId === id)) {
        const updated = {
          ...prevUser,
          name: result.name,
          email: result.email,
          representative: result.managerName || prevUser.representative,
          cnpj: result.cnpj || prevUser.cnpj,
          badgeColor: result.badgeColor || prevUser.badgeColor,
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
      message: `Os dados da agência ${result.name} foram salvos com sucesso.`,
    });
    return result;
  };

  const deleteAgency = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/agencies/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao excluir agência');
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
    const res = await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao cadastrar parceiro');
    addToast({
      type: 'success',
      title: 'Parceiro Cadastrado com Sucesso!',
      message: `${result.name} pode verificar horários disponíveis e agendar reuniões.`,
    });
    return result;
  };

  const updatePartner = async (id: string, data: Partial<PartnerProfile>): Promise<PartnerProfile> => {
    const res = await fetch(`/api/partners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao atualizar parceiro');
    setPartners((prev) => prev.map((p) => (p.id === id ? result : p)));
    setCurrentPartner((prev) => (prev && prev.id === id ? result : prev));
    setCurrentUser((prevUser) => {
      if (!prevUser) return null;
      if (prevUser.role === 'partner' && (prevUser.id === id || prevUser.partnerId === id)) {
        const updated = {
          ...prevUser,
          name: result.name,
          email: result.email,
          representative: result.representative || prevUser.representative,
          cnpj: result.cnpj || prevUser.cnpj,
          badgeColor: result.badgeColor || prevUser.badgeColor,
        };
        try {
          localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(updated));
        } catch {}
        return updated;
      }
      return prevUser;
    });
    setBookings((prev) =>
      prev.map((b) =>
        b.partnerId === id
          ? {
              ...b,
              partnerName: result.name,
              partnerRepresentative: result.representative,
              partnerEmail: result.email,
              partnerPhone: result.phone || b.partnerPhone,
              partnerCnpj: result.cnpj,
            }
          : b
      )
    );
    addToast({
      type: 'success',
      title: 'Parceiro Atualizado!',
      message: `Os dados de ${result.name} foram salvos com sucesso.`,
    });
    return result;
  };

  const deletePartner = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/partners/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao excluir parceiro');
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
    const res = await fetch('/api/consultants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao cadastrar usuário');
    setConsultants((prev) => [...prev.filter((c) => c.id !== result.id), result]);
    addToast({
      type: 'success',
      title: 'Usuário Cadastrado!',
      message: `${result.name} foi adicionado(a) à equipe da agência.`,
    });
    return result;
  };

  const updateConsultant = async (id: string, data: Partial<Consultant>): Promise<Consultant> => {
    const res = await fetch(`/api/consultants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao atualizar usuário');
    setConsultants((prev) => prev.map((c) => (c.id === id ? result : c)));
    addToast({
      type: 'success',
      title: 'Usuário Atualizado!',
      message: `Os dados de ${result.name} foram salvos com sucesso.`,
    });
    return result;
  };

  const deleteConsultant = async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/consultants/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao excluir usuário');
    setConsultants((prev) => prev.filter((c) => c.id !== id));
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
    agendaTopic?: string;
    dealEstimate?: string;
    additionalAttendees?: string;
    partnerNotes?: string;
  }) => {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao realizar agendamento.');
    }

    addToast({
      type: 'success',
      title: 'Confirmação Automática Concluída!',
      message: `Protocolo ${data.booking.protocol} gerado com sucesso.`,
    });

    return data;
  };

  const updateBooking = async (
    id: string,
    updateData: {
      clientName: string;
      clientCpf: string;
      propertyType: PropertyType;
      partnerNotes?: string;
    }
  ) => {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao atualizar agendamento.');
    }

    setBookings((prev) => prev.map((b) => (b.id === id ? data.booking : b)));

    addToast({
      type: 'success',
      title: 'Agendamento Atualizado!',
      message: `Dados do cliente ${data.booking.clientName} atualizados com sucesso.`,
    });

    return data.booking;
  };

  const cancelBooking = async (bookingId: string, reason?: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao cancelar');
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
        message: e.message,
      });
      return false;
    }
  };

  const toggleSlotStatus = async (slotId: string) => {
    try {
      const res = await fetch(`/api/slots/${slotId}/toggle`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao alterar status');
      }
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

  const deleteSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/slots/${slotId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao excluir');
      }
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

  const batchGenerateSlots = async (params: BatchGenerationParams) => {
    const res = await fetch('/api/slots/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao gerar grade');
    }
    addToast({
      type: 'success',
      title: 'Grade Semanal Publicada!',
      message: `${data.createdCount} horários foram abertos e disponibilizados aos parceiros.`,
    });
    return data.createdCount;
  };

  const createSingleSlot = async (slotData: Partial<TimeSlot>) => {
    const res = await fetch('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slotData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao criar horário');
    }
    addToast({
      type: 'success',
      title: 'Horário Adicionado',
      message: `Horário ${data.date} às ${data.startTime} disponibilizado.`,
    });
    return true;
  };

  const resetDemoData = async () => {
    try {
      const res = await fetch('/api/reset-demo', { method: 'POST' });
      if (res.ok) {
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
        deletePartner,
        registerConsultant,
        updateConsultant,
        deleteConsultant,
        bookSlot,
        updateBooking,
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
