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
  loginWithCredentials: (username: string, password: string, role?: 'admin' | 'agency' | 'partner') => Promise<UserSession>;
  toasts: ToastAlert[];
  removeToast: (id: string) => void;
  // Actions
  registerAgency: (data: Partial<Agency>) => Promise<Agency>;
  registerPartner: (data: Partial<PartnerProfile>) => Promise<PartnerProfile>;
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

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

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
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    } catch {}
  };

  const logout = () => {
    setCurrentUser(null);
    setAdminPerspective('admin_master');
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

  // Connect WebSocket
  useEffect(() => {
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
                if (msg.payload.activity) {
                  setActivities((prev) => [msg.payload.activity, ...prev]);
                  addToast({
                    type: 'success',
                    title: 'Agência Cadastrada',
                    message: msg.payload.activity.description,
                  });
                }
                break;
              }
              case 'PARTNER_REGISTERED': {
                setPartners(msg.payload.partners);
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
        loginWithCredentials,
        toasts,
        removeToast,
        registerAgency,
        registerPartner,
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
