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
} from '../utils/dateUtils.ts';
import { SlotCard } from './SlotCard.tsx';
import {
  CalendarDays,
  Layers,
  PlusCircle,
  Users,
  CheckCircle2,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  ShieldCheck,
  Search,
} from 'lucide-react';

interface AgencyDashboardProps {
  onOpenBatchModal: () => void;
  onOpenSingleSlotModal: () => void;
}

export const AgencyDashboard: React.FC<AgencyDashboardProps> = ({
  onOpenBatchModal,
  onOpenSingleSlotModal,
}) => {
  const {
    slots,
    bookings,
    consultants,
    cancelBooking,
  } = useRealtime();

  // Active view tab
  const [activeTab, setActiveTab] = useState<'calendar' | 'bookings'>('calendar');

  // Week offset state (0 = current week, 1 = next week, -1 = last week)
  const [weekOffset, setWeekOffset] = useState(0);

  // Filters
  const [selectedModality, setSelectedModality] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Cancel booking modal state
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Calculate current displayed week dates (Monday to Sunday)
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

  // Key Metrics
  const totalSlots = slots.length;
  const availableSlots = slots.filter((s) => s.status === 'available').length;
  const bookedSlots = slots.filter((s) => s.status === 'booked').length;
  const occupancyRate = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;
  const uniquePartnersCount = useMemo(() => {
    const ids = new Set(bookings.filter((b) => b.status === 'confirmed').map((b) => b.partnerId));
    return ids.size;
  }, [bookings]);

  // Filtered slots for calendar
  const filteredSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (selectedModality !== 'all' && slot.modality !== selectedModality) return false;
      if (selectedStatus !== 'all' && slot.status !== selectedStatus) return false;
      return true;
    });
  }, [slots, selectedModality, selectedStatus]);

  // Group slots by date
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

  // Confirmed bookings list filtered
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (b.status === 'cancelled') return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        b.partnerName.toLowerCase().includes(term) ||
        b.protocol.toLowerCase().includes(term) ||
        b.consultantName.toLowerCase().includes(term) ||
        b.agendaTopic.toLowerCase().includes(term)
      );
    });
  }, [bookings, searchTerm]);

  const handleConfirmCancel = async () => {
    if (!cancellingBookingId) return;
    await cancelBooking(cancellingBookingId, cancelReason || 'Cancelado pela Agência Centralizadora');
    setCancellingBookingId(null);
    setCancelReason('');
  };

  return (
    <div className="space-y-6">
      
      {/* Agency Header - Directly on background */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Gestão Centralizada de Horários & Parcerias
          </h2>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
            Abra a grade semanal com os consultores da agência. Os parceiros negociais reservam seus horários em tempo real com confirmação automática imediata.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenBatchModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            Abrir Grade Semanal em Lote
          </button>

          <button
            type="button"
            onClick={onOpenSingleSlotModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-cyan-400" />
            Horário Avulso
          </button>
        </div>
      </div>

      {/* Metrics Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Metrics Row */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Total Horários</span>
              <CalendarDays className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white mt-1">{totalSlots}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Cadastrados na grade</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Disponíveis</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">{availableSlots}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Livres para marcação</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Confirmados</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-cyan-400 mt-1">{bookedSlots}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Agendados por parceiros</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Taxa Ocupação</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">{occupancyRate}%</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Capacidade preenchida</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 col-span-2 lg:col-span-1">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Parceiros Ativos</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-indigo-300 mt-1">{uniquePartnersCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Empresas com agendamento</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'calendar'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-blue-400" />
            Grade Semanal & Calendário
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'bookings'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileCheck2 className="w-4 h-4 text-cyan-400" />
            Agendamentos Confirmados ({bookedSlots})
          </button>
        </div>

        {/* Week navigation when in calendar view */}
        {activeTab === 'calendar' && (
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setWeekOffset((p) => p - 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Semana Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              {weekOffset === 0
                ? 'Semana Atual'
                : weekOffset === 1
                  ? 'Próxima Semana'
                  : weekOffset === -1
                    ? 'Semana Passada'
                    : `Semana (${weekOffset > 0 ? `+${weekOffset}` : weekOffset})`}
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((p) => p + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Próxima Semana"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: CALENDAR & WEEKLY GRID */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                <Filter className="w-4 h-4 text-cyan-400" />
                <span>Filtrar por:</span>
              </div>

              {/* Modality Filter */}
              <select
                value={selectedModality}
                onChange={(e) => setSelectedModality(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Todas as Modalidades</option>
                <option value="online">Online (Google Meet)</option>
                <option value="presencial">Presencial (Sede)</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">Todos os Status</option>
                <option value="available">Apenas Disponíveis</option>
                <option value="booked">Apenas Confirmados</option>
                <option value="locked">Apenas Bloqueados</option>
              </select>
            </div>

            {/* Total Filtered Count */}
            <div className="text-slate-400">
              Exibindo <strong>{filteredSlots.length}</strong> horários na visualização
            </div>
          </div>

          {/* Calendar Grid (Days of Week) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {weekDays.map((wd) => {
              const daySlots = slotsByDate.get(wd.dateStr) || [];
              const availableInDay = daySlots.filter((s) => s.status === 'available').length;
              const bookedInDay = daySlots.filter((s) => s.status === 'booked').length;

              return (
                <div
                  key={wd.dateStr}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex flex-col min-h-[420px]"
                >
                  {/* Day Column Header */}
                  <div className="pb-3 mb-3 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-white capitalize">{wd.short}</div>
                      <div className="text-[11px] text-slate-400">{formatPortugueseDate(wd.dateStr)}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {availableInDay} livres
                      </span>
                      {bookedInDay > 0 && (
                        <div className="text-[10px] text-cyan-400 mt-0.5 font-medium">
                          {bookedInDay} confirmados
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Day Slots List */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-1">
                    {daySlots.length === 0 ? (
                      <div className="h-40 flex flex-col items-center justify-center text-center p-3 text-slate-500 text-xs border border-dashed border-slate-800/80 rounded-xl">
                        <span>Nenhum horário aberto neste dia</span>
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

      {/* TAB 2: CONFIRMED BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por parceiro, protocolo, pauta..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="text-xs text-slate-400">
              Total de <strong>{filteredBookings.length}</strong> agendamentos ativos
            </div>
          </div>

          {/* Bookings Table / Cards */}
          {filteredBookings.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Nenhum agendamento encontrado</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Assim que os parceiros negociais escolherem seus horários, eles aparecerão aqui com status de confirmação automática imediata.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between shadow-lg transition-all"
                >
                  <div>
                    {/* Protocol & Auto-Confirmed Badge */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <span className="font-mono font-bold text-cyan-400 text-sm">
                        {b.protocol}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3" /> Confirmado Auto
                      </span>
                    </div>

                    {/* Date and Time */}
                    <div className="py-3">
                      <div className="text-sm font-bold text-white capitalize">
                        {formatFullPortugueseDate(b.slotDate)}
                      </div>
                      <div className="text-xs text-cyan-300 font-semibold mt-0.5">
                        {b.slotStartTime} às {b.slotEndTime}
                      </div>
                    </div>

                    {/* Partner Details */}
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-3 space-y-1 text-xs">
                      <div className="font-bold text-white">{b.partnerName}</div>
                      <div className="text-slate-400">
                        Representante: <strong className="text-slate-300">{b.partnerRepresentative}</strong>
                      </div>
                      <div className="text-slate-400 truncate">
                        E-mail: {b.partnerEmail}
                      </div>
                      {b.partnerPhone && (
                        <div className="text-slate-400">
                          Tel: {b.partnerPhone}
                        </div>
                      )}
                    </div>

                    {/* Topic & Consultant */}
                    <div className="text-xs space-y-1.5 mb-4">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Pauta Negocial:</span>
                        <p className="text-slate-200 font-medium line-clamp-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                          {b.agendaTopic}
                        </p>
                      </div>
                      <div className="text-slate-400 flex items-center justify-between pt-1">
                        <span>Consultor:</span>
                        <strong className="text-slate-200">{b.consultantName}</strong>
                      </div>
                      {b.dealEstimate && (
                        <div className="text-slate-400 flex items-center justify-between">
                          <span>Volume Estimado:</span>
                          <span className="font-semibold text-emerald-400">{b.dealEstimate}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setCancellingBookingId(b.id)}
                      className="w-full py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors"
                    >
                      Cancelar Agendamento
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* Cancellation confirmation dialog */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">
              Cancelar Agendamento?
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Ao cancelar este agendamento, o horário correspondente voltará a ficar{' '}
              <strong className="text-emerald-400">disponível imediatamente</strong> na grade semanal para outros parceiros negociais.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Motivo do cancelamento (opcional):
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ex: Reagendamento solicitado pela agência..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

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
                Confirmar Cancelamento & Liberar Horário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
