import React, { useState, useMemo } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { TimeSlot, Booking } from '../types/index.ts';
import {
  DAYS_OF_WEEK,
  getMonday,
  addDays,
  formatDateToISO,
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
  } = useRealtime();

  const activePartner = currentUser?.role === 'partner'
    ? {
        id: currentUser.partnerId || currentUser.id,
        name: currentUser.name,
        representative: currentUser.representative || currentUser.name,
        email: currentUser.email,
        phone: '',
        cnpj: currentUser.cnpj || '',
        badgeColor: currentUser.badgeColor || 'bg-emerald-500',
        segment: 'Negócios Corporativos',
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
      });

  const [activeTab, setActiveTab] = useState<'available_slots' | 'my_bookings'>('available_slots');
  const [weekOffset, setWeekOffset] = useState(0);

  // Filters
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [selectedModality, setSelectedModality] = useState<string>('all');

  // Cancel dialog
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  // Calculate current displayed week dates
  const baseMonday = useMemo(() => {
    const today = new Date();
    const monday = getMonday(today);
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday;
  }, [weekOffset]);

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

  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (!weekDateSet.has(slot.date)) return false;
      if (selectedDayFilter !== 'all' && slot.date !== selectedDayFilter) return false;
      if (selectedModality !== 'all' && slot.modality !== selectedModality) return false;

      // In partner view: only show available slots opened by the agency and the partner's own bookings
      // Other partners' bookings do not appear
      if (slot.status === 'available') {
        return true;
      }
      if (slot.status === 'booked') {
        const b = bookings.find((bk) => bk.id === slot.bookingId);
        return b ? b.partnerId === activePartner.id : false;
      }
      return false;
    });
  }, [slots, bookings, activePartner.id, weekDateSet, selectedDayFilter, selectedModality]);

  // Available slots count
  const availableThisWeekCount = useMemo(() => {
    return slots.filter((s) => weekDateSet.has(s.date) && s.status === 'available').length;
  }, [slots, weekDateSet]);

  // Partner's own bookings
  const myBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.partnerId === activePartner.id && b.status === 'confirmed'
    );
  }, [bookings, activePartner.id]);

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
      <div className="pt-1">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Olá, <span className="text-emerald-400">{activePartner.name}</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
          A Agência abriu horários exclusivos para negociações esta semana com confirmação automática instantânea.
        </p>
      </div>

      {/* Partner Metrics / Overview Card */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Horários Disponíveis</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1">{availableThisWeekCount}</div>
              <div className="text-xs text-slate-400 mt-0.5">Abertos para esta semana</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Meus Agendamentos</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 mt-1">{myBookings.length}</div>
              <div className="text-xs text-slate-400 mt-0.5">Confirmados pelo parceiro</div>
            </div>
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <CalendarCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Week Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('available_slots')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'available_slots'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-emerald-300" />
            Horários da Semana ({availableThisWeekCount} disponíveis)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_bookings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'my_bookings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-cyan-300" />
            Meus Agendamentos ({myBookings.length})
          </button>
        </div>

        {/* Week navigation when in available slots */}
        {activeTab === 'available_slots' && (
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setWeekOffset((p) => p - 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              {weekOffset === 0 ? 'Semana Atual' : `Semana (${weekOffset > 0 ? `+${weekOffset}` : weekOffset})`}
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((p) => p + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: AVAILABLE SLOTS EXPLORER */}
      {activeTab === 'available_slots' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Filter className="w-4 h-4 text-emerald-400" />
                <span>Filtrar:</span>
              </div>

              {/* Day filter chips */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDayFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selectedDayFilter === 'all'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  Todos os Dias
                </button>
                {weekDays.map((wd) => (
                  <button
                    key={wd.dateStr}
                    type="button"
                    onClick={() => setSelectedDayFilter(wd.dateStr)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      selectedDayFilter === wd.dateStr
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {wd.short}
                  </button>
                ))}
              </div>

              {/* Modality Filter */}
              <select
                value={selectedModality}
                onChange={(e) => setSelectedModality(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todas as Modalidades</option>
                <option value="online">Online (Google Meet)</option>
                <option value="presencial">Presencial (Sede)</option>
              </select>
            </div>

            <div className="text-slate-400 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              Sincronização em tempo real ativa
            </div>
          </div>

          {/* Weekly Slots Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {weekDays.map((wd) => {
              if (selectedDayFilter !== 'all' && selectedDayFilter !== wd.dateStr) {
                return null;
              }

              const daySlots = slotsByDate.get(wd.dateStr) || [];
              const availableInDay = daySlots.filter((s) => s.status === 'available').length;
              const myBookedInDay = daySlots.filter((s) => s.status === 'booked').length;

              return (
                <div
                  key={wd.dateStr}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex flex-col min-h-[420px]"
                >
                  {/* Column Header */}
                  <div className="pb-3 mb-3 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-white capitalize">{wd.label}</div>
                      <div className="text-[11px] text-slate-400">{formatPortugueseDate(wd.dateStr)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {availableInDay} livres
                      </span>
                      {myBookedInDay > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          {myBookedInDay} agendado{myBookedInDay > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day Slots */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-1">
                    {daySlots.length === 0 ? (
                      <div className="h-40 flex flex-col items-center justify-center text-center p-3 text-slate-500 text-xs border border-dashed border-slate-800/80 rounded-xl">
                        <span>Nenhum horário disponível</span>
                      </div>
                    ) : (
                      daySlots.map((slot) => {
                        const booking = slot.bookingId
                          ? bookings.find((b) => b.id === slot.bookingId)
                          : undefined;

                        return (
                          <SlotCard
                            key={slot.id}
                            slot={slot}
                            booking={booking}
                            onBookSlot={onBookSlot}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-emerald-600/30"
              >
                Ver Horários Disponíveis
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleOpenBookingEdit(b)}
                  className="bg-slate-900/90 border border-blue-500/40 hover:border-cyan-400 rounded-2xl p-5 flex flex-col justify-between shadow-xl ring-1 ring-blue-500/20 transition-all cursor-pointer group"
                >
                  <div>
                    {/* Header: Date, Time & Edit Icon in Top Right */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div>
                        <div className="text-sm font-bold text-white capitalize group-hover:text-cyan-300 transition-colors">
                          {formatFullPortugueseDate(b.slotDate)}
                        </div>
                        <div className="text-xs text-cyan-300 font-semibold mt-0.5 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {b.slotStartTime} às {b.slotEndTime}
                        </div>
                      </div>

                      {/* Edit Icon in Top Right */}
                      <div
                        className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-sm flex items-center justify-center shrink-0"
                        title="Clique para editar este agendamento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Card Body: Ícones ao lado do Nome do Cliente, CPF e Parceiro */}
                    <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs my-3">
                      <div className="flex items-center gap-2 text-white font-semibold text-xs sm:text-sm truncate" title={b.clientName}>
                        <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{b.clientName || b.partnerRepresentative || 'Cliente Negocial'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-300 font-mono text-xs">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{b.clientCpf || 'Não informado'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-emerald-400 font-medium text-xs truncate" title={b.partnerName}>
                        <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{b.partnerName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Eye removed */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadICS(b);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                      title="Baixar arquivo de agenda (.ics)"
                    >
                      <Download className="w-3.5 h-3.5" /> Agenda .ics
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancellingBookingId(b.id);
                      }}
                      className="py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancel dialog */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" /> Desmarcar este Agendamento?
            </h3>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Você tem certeza de que deseja liberar este horário? Ele voltará a ficar disponível imediatamente na grade para outros parceiros negociais.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancellingBookingId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30"
              >
                Sim, Desmarcar Horário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
