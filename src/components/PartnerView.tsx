import React, { useState, useMemo, useEffect } from 'react';
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
  ArrowLeft,
} from 'lucide-react';

interface PartnerViewProps {
  onBookSlot?: (slot: TimeSlot, booking?: Booking) => void;
  isConstrutoraView?: boolean;
}

export const PartnerView: React.FC<PartnerViewProps> = ({
  onBookSlot,
  isConstrutoraView = false,
}) => {
  const {
    agencies,
    slots,
    bookings,
    consultants,
    currentPartner,
    currentUser,
    adminPerspective,
    construtoraActiveView,
    setConstrutoraActiveView,
    togglePartnerConstrutoraAccess,
    partners,
    setCurrentAgency,
    setCurrentPartner,
    cancelBooking,
    openPartnerModal,
  } = useRealtime();

  const isConstrutora = Boolean(
    isConstrutoraView ||
      currentUser?.role === 'construtora' ||
      (currentUser?.role === 'admin' && adminPerspective === 'construtora_view')
  );

  const partnerId =
    currentUser?.role === 'partner' || currentUser?.role === 'construtora'
      ? currentUser.partnerId || currentUser.id
      : currentPartner?.id;

  const partnerFromList = partners.find((p) => p.id === partnerId);
  const regularPartnerFromList =
    partnerFromList && partnerFromList.segment?.toLowerCase() !== 'construtora'
      ? partnerFromList
      : partners.find((p) => p.segment?.toLowerCase() !== 'construtora');
  const construtoraFromList =
    partnerFromList && partnerFromList.segment?.toLowerCase() === 'construtora'
      ? partnerFromList
      : partners.find((p) => p.segment?.toLowerCase() === 'construtora');

  const activePartner = isConstrutora
    ? construtoraFromList ||
      (currentUser?.role === 'construtora'
        ? {
            id: currentUser.partnerId || currentUser.id,
            name: currentUser.name || 'Construtora',
            representative: currentUser.representative || currentUser.name || 'Construtora',
            email: currentUser.email || '',
            phone: '',
            cnpj: currentUser.cnpj || '',
            badgeColor: currentUser.badgeColor || 'bg-amber-500',
            segment: 'Construtora',
            password: 'construtora123',
          }
        : {
            id: 'construtora_default',
            name: 'Construtora',
            representative: 'Construtora',
            email: '',
            phone: '',
            cnpj: '',
            badgeColor: 'bg-amber-500',
            segment: 'Construtora',
            password: 'construtora123',
            allowedAgencyIds: [],
          })
    : regularPartnerFromList ||
      (currentUser?.role === 'partner'
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
        : {
            id: 'p1',
            name: 'Empresa Parceira',
            representative: 'Representante',
            email: '',
            phone: '',
            cnpj: '',
            badgeColor: 'bg-emerald-500',
            segment: 'Parceiro',
            password: 'parceiro123',
          });

  const [activeTab, setActiveTab] = useState<'available_slots' | 'my_bookings'>('available_slots');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState(0);

  // Only agencies that have selected/authorized this partner or construtora can be accessed
  const allowedAgencies = useMemo(() => {
    const allowedIds = Array.isArray(activePartner.allowedAgencyIds)
      ? activePartner.allowedAgencyIds
      : [];
    return agencies
      .filter((ag) => allowedIds.includes(ag.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
  }, [agencies, activePartner.allowedAgencyIds]);

  useEffect(() => {
    if (allowedAgencies.length === 1) {
      const singleAgency = allowedAgencies[0];
      if (selectedAgencyId !== singleAgency.id) {
        setSelectedAgencyId(singleAgency.id);
        setCurrentAgency(singleAgency);
      }
      return;
    }
    if (selectedAgencyId && !allowedAgencies.some((a) => a.id === selectedAgencyId)) {
      setSelectedAgencyId('');
    }
  }, [allowedAgencies, selectedAgencyId, setCurrentAgency]);

  const isSelectedAgencyAllowed = useMemo(() => {
    if (!selectedAgencyId) return false;
    return allowedAgencies.some((ag) => ag.id === selectedAgencyId);
  }, [allowedAgencies, selectedAgencyId]);

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

  const todayIso = formatDateToISO(new Date());

  // All visible slots for this week (before day filter) for the selected agency
  // Do not show available slots from past days, only bookings
  const weekVisibleSlots = useMemo(() => {
    if (!selectedAgencyId || !isSelectedAgencyAllowed) return [];
    return slots.filter((slot) => {
      if (slot.agencyId !== selectedAgencyId) return false;
      if (!weekDateSet.has(slot.date)) return false;
      if (slot.status === 'available') {
        if (slot.date <= todayIso) return false;
        return true;
      }
      if (slot.status === 'booked') {
        const b = bookings.find((bk) => bk.id === slot.bookingId && bk.status !== 'cancelled');
        if (!b) return false;
        if (isConstrutora) {
          return (
            b.partnerId === activePartner.id ||
            b.construtoraId === activePartner.id ||
            (!b.construtoraId &&
              (b.fidelizacaoResponsavel === 'Construtora' || Boolean(b.isConstrutora)))
          );
        }
        return b.partnerId === activePartner.id;
      }
      return false;
    });
  }, [
    slots,
    bookings,
    activePartner.id,
    isConstrutora,
    weekDateSet,
    selectedAgencyId,
    isSelectedAgencyAllowed,
    todayIso,
  ]);

  // Effective day filter (either from Hoje/daily mode or day chip click)
  const effectiveDayFilter = isTodayMode ? targetDayDate.dateStr : selectedDayFilter;

  const filteredSlots = useMemo(() => {
    if (!effectiveDayFilter) return weekVisibleSlots;
    return weekVisibleSlots.filter((slot) => slot.date === effectiveDayFilter);
  }, [weekVisibleSlots, effectiveDayFilter]);

  // Available slots count (only starting from the next day for partners and for the selected agency/day/week)
  const availableThisWeekCount = useMemo(() => {
    if (!selectedAgencyId || !isSelectedAgencyAllowed) return 0;
    return filteredSlots.filter((s) => s.status === 'available').length;
  }, [filteredSlots, selectedAgencyId, isSelectedAgencyAllowed]);

  // Partner's / Construtora's bookings filtered by selected agency, week, or specific day and ordered by date and time
  const myBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        if (b.status !== 'confirmed') return false;
        if (selectedAgencyId) {
          if (b.agencyId !== selectedAgencyId) return false;
        } else {
          if (!allowedAgencies.some((ag) => ag.id === b.agencyId)) return false;
        }

        const slot = slots.find((sl) => sl.id === b.slotId);
        const bookingDate = slot?.date || b.slotDate || '';
        if (effectiveDayFilter) {
          if (bookingDate !== effectiveDayFilter) return false;
        } else {
          if (!weekDateSet.has(bookingDate)) return false;
        }

        if (isConstrutora) {
          return (
            b.partnerId === activePartner.id ||
            b.construtoraId === activePartner.id ||
            (!b.construtoraId &&
              (b.fidelizacaoResponsavel === 'Construtora' || Boolean(b.isConstrutora)))
          );
        }
        return b.partnerId === activePartner.id;
      })
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
  }, [
    bookings,
    slots,
    activePartner.id,
    isConstrutora,
    selectedAgencyId,
    allowedAgencies,
    effectiveDayFilter,
    weekDateSet,
  ]);

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

  const sortedPartners = useMemo(() => {
    return [...partners]
      .filter((p) => p.segment?.toLowerCase() !== 'construtora')
      .sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
      );
  }, [partners]);

  const handleConfirmCancel = async () => {
    if (!cancellingBookingId) return;
    await cancelBooking(cancellingBookingId, 'Cancelado pelo parceiro negocial');
    setCancellingBookingId(null);
  };

  const handlePartnerBookSlot = (slot: TimeSlot, booking?: Booking) => {
    if (isConstrutora) return;
    // Only allow new booking inclusions starting from the next day (block past days and today)
    if (!booking && slot.date <= todayIso) {
      return;
    }
    if (onBookSlot) onBookSlot(slot, booking);
  };

  if (isConstrutora && construtoraActiveView === 'partners') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3.5 pt-1">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Parceiros Negociais
            </h2>
            <p className="text-sm text-slate-400 mt-1 w-full leading-relaxed">
              Gerencie os parceiros cadastrados no ecossistema da construtora.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setConstrutoraActiveView('schedule')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Agenda
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {sortedPartners.map((partner) => {
            const isAllowed =
              Array.isArray(partner.allowedConstrutoraIds) &&
              partner.allowedConstrutoraIds.includes(activePartner.id);

            return (
              <div
                key={partner.id}
                onClick={() => togglePartnerConstrutoraAccess(partner.id, activePartner.id)}
                className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl px-5 py-4 flex items-center justify-between gap-3 shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isAllowed}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => togglePartnerConstrutoraAccess(partner.id, activePartner.id)}
                    title={
                      isAllowed
                        ? 'Parceiro habilitado para esta construtora'
                        : 'Marque para permitir que este parceiro selecione esta construtora nos agendamentos'
                    }
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded border-slate-600 bg-slate-950 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer accent-cyan-500 shrink-0"
                  />
                  <h4 className="font-bold text-white text-base leading-snug truncate group-hover:text-emerald-300 transition-colors">
                    {partner.name}
                  </h4>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Partner / Construtora Header - Directly on background */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">{activePartner.name}</span>
            </h2>
            {!isConstrutora && (
              <button
                type="button"
                onClick={() => openPartnerModal(activePartner)}
                title="Editar Meus Dados Cadastrais"
                className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer shadow-sm"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1.5 w-full leading-relaxed">
            {isConstrutora
              ? 'Visualize as agendas e os horários da semana.'
              : 'Gerencie os horários disponíveis para negociações da semana.'}
          </p>
        </div>
      </div>

      {/* Week Tag + Day Filter Chips + View Buttons Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 space-y-2.5 text-xs">
        {/* Agency Selector above Semana Atual (without divider line) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label
            htmlFor="partner-agency-selector"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 shrink-0"
          >
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Agência:</span>
          </label>
          <select
            id="partner-agency-selector"
            value={selectedAgencyId}
            onChange={(e) => {
              const newAgencyId = e.target.value;
              setSelectedAgencyId(newAgencyId);
              const found = agencies.find((ag) => ag.id === newAgencyId);
              if (found) {
                setCurrentAgency(found);
              }
            }}
            className="syncz-agency-select w-full sm:max-w-md px-3 py-2 rounded-xl bg-slate-950 border border-cyan-500/45 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
          >
            {allowedAgencies.length !== 1 && (
              <option value="">Selecione uma agência...</option>
            )}
            {allowedAgencies.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name}
                {ag.city ? ` — ${ag.city}${ag.state ? `/${ag.state}` : ''}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Week Tag + Day Filter Chips (Side by side on desktop) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Week Tag */}
          <div className="syncz-week-tag inline-flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-cyan-500/45 w-full sm:w-auto justify-between sm:justify-start shrink-0">
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

          {/* Day Filter Chips (Seg, Ter, Qua, Qui, Sex, Sáb, Dom) */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {weekDays.map((wd) => (
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
                }}
                className={`px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-center transition-all cursor-pointer border ${
                  effectiveDayFilter === wd.dateStr
                    ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white border-cyan-300/70 shadow-sm'
                    : 'syncz-filter-chip bg-slate-950 border-cyan-500/45 text-slate-300 hover:text-white hover:border-cyan-400'
                }`}
              >
                {wd.short}
              </button>
            ))}
          </div>
        </div>

        {/* Two Buttons below the days: Horários da Semana & Meus Agendamentos */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('available_slots')}
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer border ${
              activeTab === 'available_slots'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white border-cyan-300/70 shadow-md shadow-cyan-500/25'
                : 'syncz-filter-chip bg-slate-950 border-cyan-500/45 text-slate-300 hover:text-white hover:border-cyan-400'
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
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer border ${
              activeTab === 'my_bookings'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white border-cyan-300/70 shadow-md shadow-indigo-500/25'
                : 'syncz-filter-chip bg-slate-950 border-cyan-500/45 text-slate-300 hover:text-white hover:border-cyan-400'
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
          {!selectedAgencyId ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-xs">
              Selecione uma agência acima para visualizar os horários desta agência.
            </div>
          ) : activeWeekDays.length === 0 || filteredSlots.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-xs">
              {isTodayMode
                ? 'Nenhum horário aberto para este dia nesta agência.'
                : 'Nenhum horário aberto para esta semana nesta agência.'}
            </div>
          ) : (
            /* Weekly Slots List Directly on Background */
            <div className="space-y-4 w-full">
              {activeWeekDays.map((wd) => {
                if (effectiveDayFilter && effectiveDayFilter !== wd.dateStr) {
                  return null;
                }

                const daySlots = slotsByDate.get(wd.dateStr) || [];
                if (daySlots.length === 0) return null;

                return (
                  <div key={wd.dateStr} className="space-y-2 w-full">
                    {/* Day Header Directly on Background */}
                    <div className="font-bold text-base text-white px-0.5">
                      {wd.label}, {formatNumericDate(wd.dateStr)}
                    </div>

                    {/* Day Slots Directly on Background */}
                    <div className="grid grid-cols-1 gap-2.5 w-full">
                      {daySlots.map((slot) => {
                        const booking = slot.bookingId
                          ? bookings.find((b) => b.id === slot.bookingId)
                          : undefined;

                        return (
                          <SlotCard
                            key={slot.id}
                            slot={slot}
                            booking={booking}
                            onBookSlot={isConstrutora ? undefined : handlePartnerBookSlot}
                            isPartnerView={!isConstrutora}
                            isConstrutoraView={isConstrutora}
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
        <div className="space-y-3">
          {myBookings.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">
                Nenhum agendamento ativo para {activePartner.name}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                {isConstrutora
                  ? 'Consulte a aba de horários da semana para visualizar a agenda.'
                  : 'Explore a aba de horários da semana e clique em um horário aberto para preencher os dados do agendamento com confirmação automática imediata.'}
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
            <div className="grid grid-cols-1 gap-2.5 w-full">
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
                    onBookSlot={isConstrutora ? undefined : handlePartnerBookSlot}
                    isPartnerView={!isConstrutora}
                    isConstrutoraView={isConstrutora}
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
