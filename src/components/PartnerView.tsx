import React, { useState, useMemo } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { TimeSlot, Booking } from '../types/index.ts';
import {
  DAYS_OF_WEEK,
  getMonday,
  addDays,
  formatDateToISO,
  formatNumericDate,
  formatPortugueseDate,
  formatFullPortugueseDate,
  downloadICS,
} from '../utils/dateUtils.ts';
import { SlotCard } from './SlotCard.tsx';
import {
  CalendarDays,
  Clock,
  ShieldCheck,
  Video,
  MapPin,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  CheckCircle2,
  CalendarCheck,
  Download,
  AlertCircle,
  User,
  CreditCard,
  Home,
  Building,
  Building2,
  FileText,
  Edit3,
} from 'lucide-react';

interface PartnerViewProps {
  onBookSlot: (slot: TimeSlot, booking?: Booking) => void;
}

export const PartnerView: React.FC<PartnerViewProps> = ({
  onBookSlot,
}) => {
  const {
    slots,
    bookings,
    consultants,
    currentPartner,
    currentUser,
    partners,
    setCurrentPartner,
    cancelBooking,
    openPartnerModal,
  } = useRealtime();

  const partnerId = currentUser?.role === 'partner'
    ? (currentUser.partnerId || currentUser.id)
    : currentPartner?.id;

  const partnerFromList = partners.find((p) => p.id === partnerId);

  const activePartner = partnerFromList || (
    currentUser?.role === 'partner'
      ? {
          id: currentUser.partnerId || currentUser.id,
          name: currentUser.name,
          representative: currentUser.representative || currentUser.name,
          email: currentUser.email,
          phone: '',
          cnpj: currentUser.cnpj || '',
          badgeColor: currentUser.badgeColor || 'bg-emerald-500',
          segment: 'Negócios Corporativos',
          password: 'parceiro123',
        }
      : (currentPartner || {
          id: 'p1',
          name: 'Empresa Parceira',
          representative: 'Representante',
          email: '',
          phone: '',
          cnpj: '',
          badgeColor: 'bg-emerald-500',
          segment: 'Parceiro',
          password: 'parceiro123',
        })
  );

  const [activeTab, setActiveTab] = useState<'available_slots' | 'my_bookings'>('available_slots');
  const [weekOffset, setWeekOffset] = useState(0);

  // Today / Day mode state ("Hoje", "Ontem", "Amanhã", etc.)
  const [isTodayMode, setIsTodayMode] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);

  // Filters (none selected by default -> shows all days)
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);

  // Cancel dialog
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  // Calculate target date when in daily (Hoje) mode
  const targetDayDate = useMemo(() => {
    const d = addDays(new Date(), dayOffset);
    return {
      dateObj: d,
      dateStr: formatDateToISO(d),
    };
  }, [dayOffset]);

  // Calculate current displayed week dates
  const baseMonday = useMemo(() => {
    if (isTodayMode) {
      return getMonday(targetDayDate.dateObj);
    }
    const today = new Date();
    const monday = getMonday(today);
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday;
  }, [weekOffset, isTodayMode, targetDayDate]);

  const weekDays = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((offset) => {
      const d = addDays(baseMonday, offset);
      return {
        dateStr: formatDateToISO(d),
        dateObj: d,
        dayOfWeek: d.getDay(),
        label: DAYS_OF_WEEK.find((dw) => dw.id === d.getDay())?.name || '',
        short: DAYS_OF_WEEK.find((dw) => dw.id === d.getDay())?.short || '',
      };
    });
  }, [baseMonday]);

  // Filter slots for this week
  const weekDateSet = useMemo(() => new Set(weekDays.map((w) => w.dateStr)), [weekDays]);

  // All visible slots for this week (before day filter) so we know which days of the week have schedules
  const weekVisibleSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (!weekDateSet.has(slot.date)) return false;
      if (slot.status === 'available') return true;
      if (slot.status === 'booked') {
        const b = bookings.find((bk) => bk.id === slot.bookingId);
        return b ? b.partnerId === activePartner.id : false;
      }
      return false;
    });
  }, [slots, bookings, activePartner.id, weekDateSet]);

  // Effective day filter (either from Hoje/daily mode or day chip click)
  const effectiveDayFilter = isTodayMode ? targetDayDate.dateStr : selectedDayFilter;

  const filteredSlots = useMemo(() => {
    if (!effectiveDayFilter) return weekVisibleSlots;
    return weekVisibleSlots.filter((slot) => slot.date === effectiveDayFilter);
  }, [weekVisibleSlots, effectiveDayFilter]);

  // Available slots count
  const availableThisWeekCount = useMemo(() => {
    return slots.filter((s) => weekDateSet.has(s.date) && s.status === 'available').length;
  }, [slots, weekDateSet]);

  // Partner's own bookings ordered by date and time
  const myBookings = useMemo(() => {
    return bookings
      .filter((b) => b.partnerId === activePartner.id && b.status === 'confirmed')
      .sort((a, b) => {
        const slotA = slots.find((sl) => sl.id === a.slotId);
        const slotB = slots.find((sl) => sl.id === b.slotId);
        const dateA = slotA?.date || a.slotDate || '';
        const dateB = slotB?.date || b.slotDate || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = slotA?.startTime || a.slotStartTime || '';
        const timeB = slotB?.startTime || b.slotStartTime || '';
        return timeA.localeCompare(timeB);
      });
  }, [bookings, slots, activePartner.id]);

  // Group all week visible slots by date (to filter out days with no schedule)
  const allWeekSlotsByDate = useMemo(() => {
    const map = new Map<string, TimeSlot[]>();
    weekDays.forEach((wd) => map.set(wd.dateStr, []));

    weekVisibleSlots.forEach((slot) => {
      const list = map.get(slot.date) || [];
      list.push(slot);
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
      map.set(slot.date, list);
    });

    return map;
  }, [weekVisibleSlots, weekDays]);

  // Days of the week that actually have at least one schedule
  const activeWeekDays = useMemo(() => {
    return weekDays.filter((wd) => (allWeekSlotsByDate.get(wd.dateStr) || []).length > 0);
  }, [weekDays, allWeekSlotsByDate]);

  // Group filtered slots by date
  const slotsByDate = useMemo(() => {
    const map = new Map<string, TimeSlot[]>();
    weekDays.forEach((wd) => map.set(wd.dateStr, []));

    filteredSlots.forEach((slot) => {
      const list = map.get(slot.date) || [];
      list.push(slot);
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
      map.set(slot.date, list);
    });

    return map;
  }, [filteredSlots, weekDays]);

  const handleConfirmCancel = async () => {
    if (!cancellingBookingId) return;
    await cancelBooking(cancellingBookingId, 'Cancelado pelo parceiro negocial');
    setCancellingBookingId(null);
  };

  const handleOpenBookingEdit = (b: Booking) => {
    const s = slots.find((sl) => sl.id === b.slotId) || {
      id: b.slotId,
      agencyId: b.agencyId,
      date: b.slotDate,
      startTime: b.slotStartTime,
      endTime: b.slotEndTime,
      durationMinutes: 60,
      consultantId: 'c1',
      consultantName: b.consultantName,
      consultantRole: 'Consultor',
      serviceCategory: b.serviceCategory,
      modality: b.modality,
      locationOrLink: b.locationOrLink,
      status: 'booked' as const,
      createdAt: new Date().toISOString(),
    };
    onBookSlot(s, b);
  };

  return (
    <div className="space-y-6">
      
      {/* Partner Header - Directly on background */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">{activePartner.name}</span>
            </h2>
            <button
              type="button"
              onClick={() => openPartnerModal(activePartner)}
              title="Editar Meus Dados Cadastrais"
              className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-slate-400 mt-1.5 w-full leading-relaxed">
            Gerencie os horários disponíveis para negociações da semana.
          </p>
        </div>
      </div>

      {/* Week Tag + Day Filter Chips + View Buttons Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 space-y-2.5 text-xs">
        {/* Week Tag + Day Filter Chips (Side by side on desktop) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Week Tag */}
          <div className="syncz-week-tag inline-flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto justify-between sm:justify-start shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isTodayMode) {
                  setDayOffset((p) => p - 1);
                } else {
                  setWeekOffset((p) => p - 1);
                  setSelectedDayFilter(null);
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (isTodayMode) {
                  setIsTodayMode(false);
                  setDayOffset(0);
                  setWeekOffset(0);
                  setSelectedDayFilter(null);
                } else {
                  setIsTodayMode(true);
                  setDayOffset(0);
                  setWeekOffset(0);
                  setSelectedDayFilter(null);
                  if (activeTab !== 'available_slots') {
                    setActiveTab('available_slots');
                  }
                }
              }}
              className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Alternar entre Hoje e Semanas"
            >
              {isTodayMode
                ? dayOffset === 0
                  ? 'Hoje'
                  : dayOffset === -1
                    ? 'Ontem'
                    : dayOffset === 1
                      ? 'Amanhã'
                      : `Dia (${dayOffset > 0 ? `+${dayOffset}` : dayOffset}) · ${formatNumericDate(targetDayDate.dateStr)}`
                : weekOffset === 0
                  ? 'Semana Atual'
                  : weekOffset === 1
                    ? 'Próxima Semana'
                    : weekOffset === -1
                      ? 'Semana Passada'
                      : `Semana (${weekOffset > 0 ? `+${weekOffset}` : weekOffset})`}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isTodayMode) {
                  setDayOffset((p) => p + 1);
                } else {
                  setWeekOffset((p) => p + 1);
                  setSelectedDayFilter(null);
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Avançar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Filter Chips (only days that have schedules in this week) */}
          {activeWeekDays.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
              {activeWeekDays.map((wd) => (
                <button
                  key={wd.dateStr}
                  type="button"
                  onClick={() => {
                    if (isTodayMode) {
                      setIsTodayMode(false);
                      setDayOffset(0);
                      setSelectedDayFilter(wd.dateStr);
                    } else {
                      setSelectedDayFilter((prev) => (prev === wd.dateStr ? null : wd.dateStr));
                    }
                    if (activeTab !== 'available_slots') {
                      setActiveTab('available_slots');
                    }
                  }}
                  className={`px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-center transition-all cursor-pointer ${
                    effectiveDayFilter === wd.dateStr
                      ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white shadow-sm'
                      : 'syncz-filter-chip bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {wd.short}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Two Buttons below the days: Horários da Semana & Meus Agendamentos */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('available_slots')}
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'available_slots'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white shadow-md shadow-cyan-500/25'
                : 'syncz-filter-chip bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">
              Horários da Semana ({availableThisWeekCount}<span className="hidden sm:inline"> disponíveis</span>)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_bookings')}
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'my_bookings'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white shadow-md shadow-indigo-500/25'
                : 'syncz-filter-chip bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Meus Agendamentos ({myBookings.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AVAILABLE SLOTS EXPLORER */}
      {activeTab === 'available_slots' && (
        <div className="space-y-4">
          {activeWeekDays.length === 0 || filteredSlots.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-xs">
              {isTodayMode
                ? 'Nenhum horário aberto para este dia.'
                : 'Nenhum horário aberto para esta semana.'}
            </div>
          ) : (
            /* Weekly Slots Columns */
            <div className="grid grid-cols-1 gap-3 w-full">
              {activeWeekDays.map((wd) => {
                if (effectiveDayFilter && effectiveDayFilter !== wd.dateStr) {
                  return null;
                }

                const daySlots = slotsByDate.get(wd.dateStr) || [];
                if (daySlots.length === 0) return null;

                const availableInDay = daySlots.filter((s) => s.status === 'available').length;

                return (
                  <div
                    key={wd.dateStr}
                    className="syncz-day-column bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col w-full"
                  >
                    {/* Column Header */}
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="font-bold text-base text-white">
                        {wd.label}, {formatNumericDate(wd.dateStr)}
                      </div>
                      <span className="syncz-badge-available shrink-0 inline-flex items-center justify-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {availableInDay} livre{availableInDay === 1 ? '' : 's'}
                      </span>
                    </div>

                    {/* Day Slots */}
                    <div className="space-y-2.5">
                      {daySlots.map((slot) => {
                        const booking = slot.bookingId
                          ? bookings.find((b) => b.id === slot.bookingId)
                          : undefined;

                        return (
                          <SlotCard
                            key={slot.id}
                            slot={slot}
                            booking={booking}
                            onBookSlot={onBookSlot}
                            isPartnerView
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY BOOKINGS */}
      {activeTab === 'my_bookings' && (
        <div className="space-y-4">
          {myBookings.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">
                Nenhum agendamento ativo para {activePartner.name}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                Explore a aba de horários da semana e clique em um horário aberto para preencher os dados do agendamento com confirmação automática imediata.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('available_slots')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-400 hover:via-blue-400 hover:to-indigo-400 text-white font-semibold text-xs transition-all shadow-lg shadow-cyan-500/25"
              >
                Ver Horários Disponíveis
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 w-full">
              {myBookings.map((b) => {
                const slot = slots.find((sl) => sl.id === b.slotId) || {
                  id: b.slotId,
                  agencyId: b.agencyId,
                  date: b.slotDate,
                  startTime: b.slotStartTime,
                  endTime: b.slotEndTime,
                  durationMinutes: 60,
                  consultantId: 'c1',
                  consultantName: b.consultantName,
                  consultantRole: 'Consultor',
                  serviceCategory: b.serviceCategory,
                  modality: b.modality,
                  locationOrLink: b.locationOrLink,
                  status: 'booked' as const,
                  bookingId: b.id,
                  createdAt: new Date().toISOString(),
                };

                return (
                  <SlotCard
                    key={b.id}
                    slot={slot}
                    booking={b}
                    onBookSlot={onBookSlot}
                    isPartnerView
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cancel dialog */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" /> Cancelar este Agendamento?
            </h3>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Você tem certeza de que deseja cancelar este agendamento? O horário voltará a ficar disponível imediatamente na grade para outros parceiros negociais.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancellingBookingId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Sim, Cancelar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
