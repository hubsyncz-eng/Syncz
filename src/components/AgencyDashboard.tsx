import React, { useState, useMemo } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { TimeSlot, Booking, PartnerProfile, Consultant } from '../types/index.ts';
import {
  DAYS_OF_WEEK,
  getMonday,
  addDays,
  formatDateToISO,
  formatNumericDate,
} from '../utils/dateUtils.ts';
import { SlotCard } from './SlotCard.tsx';
import { PartnerRegisterModal } from './PartnerRegisterModal.tsx';
import { PartnerView } from './PartnerView.tsx';
import {
  CalendarDays,
  CalendarCheck,
  Layers,
  PlusCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  Eye,
  ArrowLeft,
  X,
  Loader2,
  Trash2,
  Edit3,
} from 'lucide-react';

interface AgencyDashboardProps {
  onOpenBatchModal: () => void;
  onOpenSingleSlotModal: () => void;
  onBookSlot?: (slot: TimeSlot, booking?: Booking) => void;
}

export const AgencyDashboard: React.FC<AgencyDashboardProps> = ({
  onOpenBatchModal,
  onOpenSingleSlotModal,
  onBookSlot,
}) => {
  const {
    slots,
    bookings,
    partners,
    consultants,
    currentUser,
    currentAgency,
    agencies,
    openAgencyModal,
    setCurrentPartner,
    cancelBooking,
    agencyActiveView,
    setAgencyActiveView,
    registerConsultant,
    updateConsultant,
    deleteConsultant,
    togglePartnerAgencyAccess,
  } = useRealtime();

  const activeAgencyId = useMemo(() => {
    return currentAgency?.id || currentUser?.agencyId || agencies[0]?.id || 'ag_1';
  }, [currentAgency, currentUser, agencies]);

  const sortedPartners = useMemo(() => {
    return [...partners]
      .filter((p) => p.segment?.toLowerCase() !== 'construtora')
      .sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
      );
  }, [partners]);

  const sortedConstrutoras = useMemo(() => {
    return [...partners]
      .filter((p) => p.segment?.toLowerCase() === 'construtora')
      .sort((a, b) =>
        (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
      );
  }, [partners]);

  // Agency display name matching partner greeting style
  const agencyDisplayName = useMemo(() => {
    const rawName = currentAgency?.name?.trim() || 'Central';
    if (rawName.toLowerCase().startsWith('agência') || rawName.toLowerCase().startsWith('agencia')) {
      return rawName;
    }
    return `Agência ${rawName}`;
  }, [currentAgency]);

  // Partner / Construtora creation / editing / preview state inside Agency View
  const [isNewPartnerModalOpen, setIsNewPartnerModalOpen] = useState(false);
  const [isNewConstrutoraModalOpen, setIsNewConstrutoraModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerProfile | null>(null);
  const [inspectingPartner, setInspectingPartner] = useState<PartnerProfile | null>(null);

  // User (Consultant) creation / editing modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Consultant | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [userDeleting, setUserDeleting] = useState(false);
  const [confirmUserDelete, setConfirmUserDelete] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  const openNewUserModal = () => {
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setUserSubmitting(false);
    setUserDeleting(false);
    setConfirmUserDelete(false);
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (c: Consultant) => {
    setEditingUser(c);
    setUserName(c.name || '');
    setUserEmail(c.email || '');
    setUserPassword(c.password || 'usuario123');
    setUserSubmitting(false);
    setUserDeleting(false);
    setConfirmUserDelete(false);
    setUserError(null);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSubmitting(true);
    setUserError(null);
    try {
      if (editingUser) {
        await updateConsultant(editingUser.id, {
          name: userName,
          email: userEmail,
          password: userPassword,
        });
      } else {
        await registerConsultant({
          agencyId: currentUser?.agencyId || currentAgency?.id || 'ag_1',
          name: userName,
          email: userEmail,
          password: userPassword,
        });
      }
      setIsUserModalOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      setUserError(err.message || 'Erro ao salvar usuário.');
    } finally {
      setUserSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!editingUser) return;
    if (!confirmUserDelete) {
      setConfirmUserDelete(true);
      return;
    }
    setUserDeleting(true);
    setUserError(null);
    try {
      await deleteConsultant(editingUser.id);
      setIsUserModalOpen(false);
      setEditingUser(null);
      setConfirmUserDelete(false);
    } catch (err: any) {
      setUserError(err.message || 'Erro ao excluir usuário.');
    } finally {
      setUserDeleting(false);
    }
  };

  // Active view tab
  const [activeTab, setActiveTab] = useState<'calendar' | 'bookings'>('calendar');

  // Week offset state (0 = current week, 1 = next week, -1 = last week)
  const [weekOffset, setWeekOffset] = useState(0);

  // Today / Day mode state ("Hoje", "Ontem", "Amanhã", etc.)
  const [isTodayMode, setIsTodayMode] = useState(false);
  const [dayOffset, setDayOffset] = useState(0);

  // Day filter (none selected by default -> shows all days)
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);

  // Search filter in bookings tab
  const [searchTerm] = useState('');

  // Cancel booking modal state
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Calculate target date when in daily (Hoje) mode
  const targetDayDate = useMemo(() => {
    const d = addDays(new Date(), dayOffset);
    return {
      dateObj: d,
      dateStr: formatDateToISO(d),
    };
  }, [dayOffset]);

  // Calculate current displayed week dates (Monday to Sunday)
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

  const weekDateSet = useMemo(() => new Set(weekDays.map((w) => w.dateStr)), [weekDays]);

  const todayIso = formatDateToISO(new Date());

  // All visible slots for this week (before day filter)
  // Do not show available slots from past days, only bookings
  const weekVisibleSlots = useMemo(() => {
    return slots.filter((slot) => {
      if (!weekDateSet.has(slot.date)) return false;
      if (slot.status === 'available' && slot.date < todayIso) return false;
      return true;
    });
  }, [slots, weekDateSet, todayIso]);

  // Effective day filter (either from Hoje/daily mode or day chip click)
  const effectiveDayFilter = isTodayMode ? targetDayDate.dateStr : selectedDayFilter;

  // Filtered slots for calendar
  const filteredSlots = useMemo(() => {
    if (!effectiveDayFilter) return weekVisibleSlots;
    return weekVisibleSlots.filter((slot) => slot.date === effectiveDayFilter);
  }, [weekVisibleSlots, effectiveDayFilter]);

  // Available slots count this week
  const availableThisWeekCount = useMemo(() => {
    return weekVisibleSlots.filter((s) => s.status === 'available').length;
  }, [weekVisibleSlots]);

  // Confirmed bookings count
  const confirmedBookings = useMemo(() => {
    return bookings.filter((b) => b.status === 'confirmed');
  }, [bookings]);

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

  // Confirmed bookings list filtered and ordered by date and time
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        if (b.status === 'cancelled') return false;
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          b.partnerName.toLowerCase().includes(term) ||
          b.protocol.toLowerCase().includes(term) ||
          b.consultantName.toLowerCase().includes(term) ||
          b.agendaTopic.toLowerCase().includes(term)
        );
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
  }, [bookings, slots, searchTerm]);

  const handleConfirmCancel = async () => {
    if (!cancellingBookingId) return;
    await cancelBooking(cancellingBookingId, cancelReason || 'Cancelado pela Agência Centralizadora');
    setCancellingBookingId(null);
    setCancelReason('');
  };

  if (inspectingPartner) {
    return (
      <div className="space-y-6">
        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
                Visualização de Parceiro Negocial
              </span>
              <p className="text-xs text-slate-300">
                Visualizando a agenda como <strong className="text-white">{inspectingPartner.name}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInspectingPartner(null)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para Parceiros
          </button>
        </div>

        <PartnerView onBookSlot={onBookSlot || (() => {})} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!currentUser?.isAgencyUser && agencyActiveView === 'partners' ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-3.5 pt-1">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Parceiros Negociais
              </h2>
              <p className="text-sm text-slate-400 mt-1 w-full leading-relaxed">
                Gerencie os parceiros cadastrados no ecossistema da agência.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setAgencyActiveView('schedule')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Agenda
              </button>

              <button
                type="button"
                onClick={() => setIsNewPartnerModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Novo Parceiro Negocial
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {sortedPartners.map((partner) => {
              const isAllowed =
                Array.isArray(partner.allowedAgencyIds) &&
                partner.allowedAgencyIds.includes(activeAgencyId);

              return (
                <div
                  key={partner.id}
                  onClick={() => setEditingPartner(partner)}
                  className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl px-5 py-4 flex items-center justify-between gap-3 shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isAllowed}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => togglePartnerAgencyAccess(partner.id, activeAgencyId)}
                      title={
                        isAllowed
                          ? 'Parceiro habilitado para agendar nesta agência'
                          : 'Marque para permitir que este parceiro faça agendamentos nesta agência'
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

          {isNewPartnerModalOpen && (
            <PartnerRegisterModal onClose={() => setIsNewPartnerModalOpen(false)} />
          )}

          {editingPartner && (
            <PartnerRegisterModal
              partnerToEdit={editingPartner}
              onClose={() => setEditingPartner(null)}
            />
          )}
        </div>
      ) : !currentUser?.isAgencyUser && agencyActiveView === 'construtoras' ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-3.5 pt-1">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Construtoras
              </h2>
              <p className="text-sm text-slate-400 mt-1 w-full leading-relaxed">
                Gerencie as construtoras cadastradas no ecossistema da agência.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setAgencyActiveView('schedule')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Agenda
              </button>

              <button
                type="button"
                onClick={() => setIsNewConstrutoraModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-amber-600/25 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Nova Construtora
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {sortedConstrutoras.map((construtora) => {
              const isAllowed =
                Array.isArray(construtora.allowedAgencyIds) &&
                construtora.allowedAgencyIds.includes(activeAgencyId);

              return (
                <div
                  key={construtora.id}
                  onClick={() => setEditingPartner(construtora)}
                  className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-2xl px-5 py-4 flex items-center justify-between gap-3 shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isAllowed}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => togglePartnerAgencyAccess(construtora.id, activeAgencyId)}
                      title={
                        isAllowed
                          ? 'Construtora habilitada para visualizar a agenda desta agência'
                          : 'Marque para permitir que esta construtora visualize a agenda desta agência'
                      }
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded border-slate-600 bg-slate-950 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer accent-cyan-500 shrink-0"
                    />
                    <h4 className="font-bold text-white text-base leading-snug truncate group-hover:text-amber-300 transition-colors">
                      {construtora.name}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>

          {isNewConstrutoraModalOpen && (
            <PartnerRegisterModal
              initialSegment="Construtora"
              onClose={() => setIsNewConstrutoraModalOpen(false)}
            />
          )}

          {editingPartner && (
            <PartnerRegisterModal
              partnerToEdit={editingPartner}
              onClose={() => setEditingPartner(null)}
            />
          )}
        </div>
      ) : !currentUser?.isAgencyUser && agencyActiveView === 'users' ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-3.5 pt-1">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Usuários da Agência
              </h2>
              <p className="text-sm text-slate-400 mt-1 w-full leading-relaxed">
                Gerencie os colaboradores e consultores vinculados à agência.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setAgencyActiveView('schedule')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Agenda
              </button>

              <button
                type="button"
                onClick={openNewUserModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Novo Usuário
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {consultants.map((c) => (
              <div
                key={c.id}
                onClick={() => openEditUserModal(c)}
                className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 rounded-3xl p-5 flex flex-col justify-between shadow-lg transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${c.avatarColor || 'bg-blue-500'}`} />
                    <h4 className="font-bold text-white text-base sm:text-lg leading-snug truncate group-hover:text-blue-300 transition-colors">
                      {c.name}
                    </h4>
                  </div>

                  <div className="pt-3.5 space-y-2 text-xs text-slate-400">
                    <div className="flex justify-between items-center gap-2">
                      <span>E-mail Corporativo:</span>
                      <span className="text-slate-300 truncate">{c.email || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {isUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
              <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-7 text-white shadow-2xl relative my-auto">
                <button
                  onClick={() => setIsUserModalOpen(false)}
                  disabled={userSubmitting || userDeleting}
                  className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 pr-8 pb-4 border-b border-slate-800">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {editingUser
                        ? 'Altere os dados do usuário ou exclua o cadastro'
                        : 'Cadastre um novo colaborador na agência'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveUser} className="mt-4 space-y-3.5 text-xs sm:text-sm">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Ex: Rodrigo Vasconcelos"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      E-mail Corporativo *
                    </label>
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="nome@agencia.com.br"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Senha*
                    </label>
                    <input
                      type="text"
                      required
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Defina a senha de acesso"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
                    />
                  </div>

                  {userError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      {userError}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                    {editingUser ? (
                      <button
                        type="button"
                        disabled={userSubmitting || userDeleting}
                        onClick={handleDeleteUser}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                          confirmUserDelete
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                            : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {userDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Excluindo...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            {confirmUserDelete ? 'Confirmar Exclusão' : 'Excluir Cadastro'}
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={userSubmitting || userDeleting}
                        onClick={() => setIsUserModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={userSubmitting || userDeleting}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                    >
                      {userSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
      {/* Agency Header - Directly on background */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">{agencyDisplayName}</span>
            </h2>
            {!currentUser?.isAgencyUser && (
              <button
                type="button"
                onClick={() => {
                  const targetAgency = currentAgency || agencies.find((a) => a.id === currentUser?.agencyId) || agencies[0];
                  openAgencyModal(targetAgency);
                }}
                title="Editar Cadastro da Agência"
                className="p-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-blue-400 border border-slate-800 hover:border-blue-500/40 transition-all cursor-pointer shadow-sm"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1.5 w-full leading-relaxed">
            Gerencie os horários disponíveis. Os parceiros negociais reservam seus horários em tempo real.
          </p>
        </div>
      </div>

      {/* Week Tag + Day Filter Chips + View Buttons Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 space-y-2.5 text-xs">
        {/* Action Buttons: Horários em Lote & Horário Avulso - na linha acima da semana atual */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenBatchModal}
            className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer border border-cyan-300/70 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-400 hover:via-blue-400 hover:to-indigo-400 text-white shadow-md shadow-cyan-500/25"
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Horários em Lote</span>
          </button>

          <button
            type="button"
            onClick={onOpenSingleSlotModal}
            className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer syncz-filter-chip bg-slate-950 border border-cyan-500/45 text-slate-300 hover:text-white hover:border-cyan-400"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-cyan-400" />
            <span className="truncate">Horário Avulso</span>
          </button>
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
                  if (activeTab !== 'calendar') {
                    setActiveTab('calendar');
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
                  if (activeTab !== 'calendar') {
                    setActiveTab('calendar');
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

        {/* Two Buttons below the days: Horários da Semana & Agendados */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer border ${
              activeTab === 'calendar'
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
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer border ${
              activeTab === 'bookings'
                ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white border-cyan-300/70 shadow-md shadow-indigo-500/25'
                : 'syncz-filter-chip bg-slate-950 border-cyan-500/45 text-slate-300 hover:text-white hover:border-cyan-400'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">Agendados ({confirmedBookings.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CALENDAR & WEEKLY GRID */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          {/* Calendar Grid (Days of Week with schedules) */}
          {activeWeekDays.length === 0 || filteredSlots.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center text-slate-400 text-xs">
              {isTodayMode
                ? 'Nenhum horário aberto para este dia.'
                : 'Nenhum horário aberto para esta semana.'}
            </div>
          ) : (
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

                    {/* Day Slots List Directly on Background */}
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
                            onBookSlot={onBookSlot}
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

      {/* TAB 2: CONFIRMED BOOKINGS */}
      {activeTab === 'bookings' && (
        <div className="space-y-3">
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
            <div className="grid grid-cols-1 gap-2.5 w-full">
              {filteredBookings.map((b) => {
                const slot = slots.find((s) => s.id === b.slotId) || {
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
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
        </>
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
