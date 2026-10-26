export type SlotModality = 'online' | 'presencial' | 'hibrido';
export type SlotStatus = 'available' | 'locked' | 'booked';
export type BookingStatus = 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type UserRole = 'admin' | 'agency' | 'partner' | 'construtora';

export interface Agency {
  id: string;
  name: string; // Nome da Agência
  legalName?: string; // Razão Social
  cnpj?: string;
  address?: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  managerName: string;
  description: string;
  badgeColor: string;
  status: 'active' | 'suspended';
  username?: string;
  password?: string;
  createdAt: string;
}

export interface UserSession {
  role: UserRole;
  id: string;
  name: string;
  email: string;
  agencyId?: string;
  partnerId?: string;
  representative?: string;
  cnpj?: string;
  badgeColor?: string;
  isAgencyUser?: boolean;
}

export interface Consultant {
  id: string;
  agencyId: string;
  name: string;
  role: string;
  department: string;
  email: string;
  password?: string;
  avatarColor: string;
  specialties: string[];
}

export interface TimeSlot {
  id: string;
  agencyId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  consultantId: string;
  consultantName: string;
  consultantRole: string;
  serviceCategory: string;
  modality: SlotModality;
  locationOrLink: string;
  status: SlotStatus;
  notes?: string;
  bookingId?: string;
  createdAt: string;
}

export type PropertyType = 'Imóvel Individual' | 'Empreendimento';
export type BookingOutcome = 'Aprovado' | 'Reprovado' | 'Remarcar' | 'Não compareceu';
export type BookingSegmento = 'Varejo' | 'Carteira';
export type FidelizacaoResponsavel = 'Cliente' | 'Parceiro' | 'Construtora';

export interface Booking {
  id: string;
  protocol: string;
  agencyId: string;
  slotId: string;
  slotDate: string;
  slotStartTime: string;
  slotEndTime: string;
  consultantName: string;
  serviceCategory: string;
  modality: SlotModality;
  locationOrLink: string;
  partnerId: string;
  partnerName: string;
  partnerRepresentative: string;
  partnerEmail: string;
  partnerPhone: string;
  partnerCnpj?: string;
  clientName?: string;
  clientCpf?: string;
  propertyType?: PropertyType;
  construtoraId?: string;
  construtoraName?: string;
  empreendimentoId?: string;
  empreendimentoName?: string;
  fidelizacaoValor?: string;
  fidelizacaoResponsavel?: FidelizacaoResponsavel;
  isConstrutora?: boolean;
  agendaTopic: string;
  dealEstimate?: string;
  additionalAttendees?: string;
  partnerNotes?: string;
  status: BookingStatus;
  outcome?: BookingOutcome;
  segmento?: BookingSegmento;
  autoConfirmedAt: string;
  securityCode: string;
  cancellationReason?: string;
  cancelledAt?: string;
}

export interface ConstrutoraEmpreendimento {
  id: string;
  name: string;
  state?: string;
  city?: string;
  address?: string;
  description?: string;
  createdAt?: string;
}

export interface PartnerProfile {
  id: string;
  name: string;
  segment: string;
  representative: string;
  email: string;
  phone: string;
  cnpj: string;
  badgeColor: string;
  username?: string;
  password?: string;
  allowedAgencyIds?: string[];
  allowedConstrutoraIds?: string[];
  empreendimentos?: ConstrutoraEmpreendimento[];
  createdAt?: string;
}

export interface ActivityEvent {
  id: string;
  type:
    | 'slot_created'
    | 'slot_booked'
    | 'slot_deleted'
    | 'slot_toggled'
    | 'booking_confirmed'
    | 'booking_updated'
    | 'booking_cancelled'
    | 'slots_batch_opened'
    | 'partner_active'
    | 'partner_registered'
    | 'partner_updated'
    | 'partner_deleted'
    | 'agency_registered'
    | 'agency_updated'
    | 'agency_deleted'
    | 'consultant_registered'
    | 'consultant_updated'
    | 'consultant_deleted';
  timestamp: string;
  actorName?: string;
  actionText?: string;
  title: string;
  description: string;
  partnerName?: string;
  agencyName?: string;
  slotTime?: string;
  protocol?: string;
}

export interface BatchGenerationParams {
  agencyId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  selectedDays: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  lunchBreakStart?: string; // HH:mm
  lunchBreakEnd?: string; // HH:mm
  consultantId: string;
  serviceCategory: string;
  modality: SlotModality;
  locationOrLink: string;
}

export interface AppStatePayload {
  agencies: Agency[];
  slots: TimeSlot[];
  bookings: Booking[];
  consultants: Consultant[];
  partners: PartnerProfile[];
  activities: ActivityEvent[];
  onlineCount: number;
  agencyInfo: {
    name: string;
    description: string;
    autoConfirmEnabled: boolean;
    maxBookingsPerPartnerPerWeek: number;
  };
}
