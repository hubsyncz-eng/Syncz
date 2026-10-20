import {
  Agency,
  Consultant,
  PartnerProfile,
  TimeSlot,
  Booking,
  ActivityEvent,
} from '../types/index.ts';

export function formatSeedDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSeedMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addSeedDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

export const DEFAULT_AGENCY_INFO = {
  name: 'Central Agência de Negócios & Parcerias',
  description: 'Unidade Centralizadora de Agendas Institucionais e Negociações Corporativas',
  autoConfirmEnabled: true,
  maxBookingsPerPartnerPerWeek: 5,
};

export function buildInitialSeedData(): {
  agencies: Agency[];
  consultants: Consultant[];
  partners: PartnerProfile[];
  slots: TimeSlot[];
  bookings: Booking[];
  activities: ActivityEvent[];
} {
  return {
    agencies: [],
    consultants: [],
    partners: [],
    slots: [],
    bookings: [],
    activities: [],
  };
}
