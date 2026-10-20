import React, { useState, useRef, useEffect } from 'react';
import { TimeSlot, Booking, BookingOutcome } from '../types/index.ts';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { formatPortugueseDate, formatDateToISO } from '../utils/dateUtils.ts';
import {
  Clock,
  CalendarPlus,
  Trash2,
  User,
  CreditCard,
  Building2,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserX,
  Check,
} from 'lucide-react';

interface SlotCardProps {
  slot: TimeSlot;
  booking?: Booking;
  onBookSlot?: (slot: TimeSlot, booking?: Booking) => void;
  isPartnerView?: boolean;
}

const OUTCOME_OPTIONS: {
  value: BookingOutcome;
  label: string;
  icon: React.FC<{ className?: string }>;
  iconBtnClass: string;
  cardClass: string;
  itemActiveClass: string;
}[] = [
  {
    value: 'Aprovado',
    label: 'Aprovado',
    icon: CheckCircle2,
    iconBtnClass:
      'syncz-outcome-icon-aprovado bg-emerald-500/20 text-emerald-300 border-emerald-500/45 hover:bg-emerald-500/30',
    cardClass:
      'syncz-slot-outcome-aprovado bg-emerald-950/35 border-emerald-500/45 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/25 hover:border-emerald-400 cursor-pointer',
    itemActiveClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    value: 'Reprovado',
    label: 'Reprovado',
    icon: XCircle,
    iconBtnClass:
      'syncz-outcome-icon-reprovado bg-rose-500/20 text-rose-300 border-rose-500/45 hover:bg-rose-500/30',
    cardClass:
      'syncz-slot-outcome-reprovado bg-rose-950/35 border-rose-500/45 shadow-md shadow-rose-500/5 ring-1 ring-rose-500/25 hover:border-rose-400 cursor-pointer',
    itemActiveClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  {
    value: 'Remarcar',
    label: 'Remarcar',
    icon: RefreshCw,
    iconBtnClass:
      'syncz-outcome-icon-remarcar bg-amber-500/20 text-amber-300 border-amber-500/45 hover:bg-amber-500/30',
    cardClass:
      'syncz-slot-outcome-remarcar bg-amber-950/35 border-amber-500/45 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/25 hover:border-amber-400 cursor-pointer',
    itemActiveClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    value: 'Não compareceu',
    label: 'Não compareceu',
    icon: UserX,
    iconBtnClass:
      'syncz-outcome-icon-nao-compareceu bg-orange-500/20 text-orange-300 border-orange-500/45 hover:bg-orange-500/30',
    cardClass:
      'syncz-slot-outcome-nao-compareceu bg-orange-950/35 border-orange-500/45 shadow-md shadow-orange-500/5 ring-1 ring-orange-500/25 hover:border-orange-400 cursor-pointer',
    itemActiveClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
];

export const SlotCard: React.FC<SlotCardProps> = ({
  slot,
  booking,
  onBookSlot,
  isPartnerView = false,
}) => {
  const {
    currentUser,
    currentPartner,
    adminPerspective,
    deleteSlot,
    updateBookingOutcome,
  } = useRealtime();

  const [isOutcomeMenuOpen, setIsOutcomeMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOutcomeMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOutcomeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOutcomeMenuOpen]);

  const activeRole = isPartnerView
    ? 'partner'
    : currentUser?.role === 'admin'
      ? adminPerspective === 'agency_view'
        ? 'agency'
        : 'partner'
      : currentUser?.role || 'partner';

  const activePartnerId =
    currentUser?.role === 'partner'
      ? currentUser.partnerId || currentUser.id
      : currentPartner?.id || 'p1';

  const isBooked = slot.status === 'booked';
  const isLocked = slot.status === 'locked';

  const todayIso = formatDateToISO(new Date());
  const isPartnerInclusionBlocked =
    activeRole === 'partner' && !isBooked && slot.date <= todayIso;

  // Check if booked by currently active partner
  const isBookedByCurrentPartner =
    isBooked && booking && booking.partnerId === activePartnerId;

  // In partner view, hide other partners' bookings and locked slots completely
  if (activeRole === 'partner') {
    if (isBooked && !isBookedByCurrentPartner) return null;
    if (isLocked) return null;
  }

  const handleCardClick = () => {
    if (isOutcomeMenuOpen) return;
    if (!isBooked) {
      if (isPartnerInclusionBlocked) return;
      if (onBookSlot) onBookSlot(slot);
    } else if (isBooked && booking && onBookSlot) {
      if (activeRole === 'agency' || isBookedByCurrentPartner) {
        onBookSlot(slot, booking);
      }
    }
  };

  const currentOutcomeConfig = booking?.outcome
    ? OUTCOME_OPTIONS.find((o) => o.value === booking.outcome)
    : undefined;

  const OutcomeBadgeIcon = currentOutcomeConfig?.icon;

  return (
    <div
      onClick={handleCardClick}
      title={
        isBooked && booking
          ? 'Clique no card para editar este agendamento'
          : !isBooked
            ? isPartnerInclusionBlocked
              ? 'Agendamentos para parceiros só são permitidos a partir do próximo dia'
              : 'Clique para agendar este horário'
            : undefined
      }
      className={`syncz-slot-card rounded-2xl p-3.5 transition-all duration-200 border relative group ${
        !isBooked
          ? isPartnerInclusionBlocked
            ? 'syncz-slot-disabled bg-slate-900/50 border-slate-800/80 opacity-60 cursor-not-allowed'
            : 'syncz-slot-available bg-slate-900/90 border-cyan-500/40 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer'
          : currentOutcomeConfig
            ? currentOutcomeConfig.cardClass
            : 'syncz-slot-booked-partner bg-indigo-950/50 border-indigo-500/50 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30 hover:border-cyan-400 cursor-pointer'
      }`}
    >
      {/* Top Header: Time, Weekday & Date + Action Icons */}
      <div className={`flex items-center justify-between gap-2 ${isBooked && booking ? 'pb-1.5 mb-1.5 border-b border-slate-800/80' : ''}`}>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-white min-w-0 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <Clock className="syncz-booking-meta-icon w-4 h-4 text-cyan-400 shrink-0" />
            <span className="syncz-booking-meta-text syncz-booking-time-text text-sm font-extrabold text-white shrink-0">{slot.startTime}</span>
          </div>
          <span className="text-slate-600 font-normal">•</span>
          <span className="text-sm font-semibold text-cyan-300 capitalize truncate">
            {formatPortugueseDate(slot.date)}
          </span>
        </div>

        {/* Action icons in top right for available slots */}
        {!isBooked && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={isPartnerInclusionBlocked}
              onClick={(e) => {
                e.stopPropagation();
                if (isPartnerInclusionBlocked) return;
                if (onBookSlot) onBookSlot(slot);
              }}
              className={
                isPartnerInclusionBlocked
                  ? 'syncz-slot-disabled-btn p-1.5 rounded-xl bg-slate-800/70 text-slate-500 border border-slate-700/70 flex items-center justify-center shrink-0 cursor-not-allowed opacity-60'
                  : 'syncz-slot-action-btn syncz-slot-book-btn p-1.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-gradient-to-r hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 hover:text-white group-hover:bg-gradient-to-r group-hover:from-cyan-500 group-hover:via-blue-500 group-hover:to-indigo-500 group-hover:text-white transition-all shadow-sm flex items-center justify-center shrink-0 cursor-pointer'
              }
              title={
                isPartnerInclusionBlocked
                  ? 'Inclusão não permitida para o dia atual ou dias passados (somente a partir do próximo dia)'
                  : 'Clique para fazer o cadastro deste horário'
              }
            >
              <CalendarPlus className="w-4 h-4" />
            </button>

            {activeRole === 'agency' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSlot(slot.id);
                }}
                title="Excluir este horário"
                className="syncz-slot-delete-btn p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-slate-700 transition-all flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Top-right single outcome icon (clickable for Agency, visible for Partner) */}
        {isBooked && booking && (
          <div className="flex items-center gap-1.5 shrink-0 relative" ref={menuRef}>
            {activeRole !== 'agency' && currentOutcomeConfig && OutcomeBadgeIcon && (
              <span
                className={`p-1.5 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${currentOutcomeConfig.iconBtnClass}`}
                title={`Status: ${currentOutcomeConfig.label}`}
              >
                <OutcomeBadgeIcon className="w-4 h-4 shrink-0" />
              </span>
            )}

            {activeRole === 'agency' && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOutcomeMenuOpen((prev) => !prev);
                  }}
                  title={
                    currentOutcomeConfig
                      ? `Status: ${currentOutcomeConfig.label} (clique para alterar)`
                      : 'Definir parecer / status do agendamento'
                  }
                  className={
                    currentOutcomeConfig
                      ? `p-1.5 rounded-xl border transition-all shadow-sm flex items-center justify-center shrink-0 cursor-pointer ${currentOutcomeConfig.iconBtnClass}`
                      : 'syncz-slot-action-btn syncz-slot-book-btn p-1.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-gradient-to-r hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 hover:text-white transition-all shadow-sm flex items-center justify-center shrink-0 cursor-pointer'
                  }
                >
                  {OutcomeBadgeIcon ? (
                    <OutcomeBadgeIcon className="w-4 h-4 shrink-0" />
                  ) : (
                    <ClipboardCheck className="w-4 h-4 shrink-0" />
                  )}
                </button>

                {isOutcomeMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="syncz-agency-menu absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-40 space-y-1 animate-in fade-in"
                  >
                    {OUTCOME_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = booking.outcome === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setIsOutcomeMenuOpen(false);
                            await updateBookingOutcome(
                              booking.id,
                              isSelected ? null : opt.value
                            );
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            isSelected
                              ? opt.itemActiveClass
                              : 'border-transparent text-slate-200 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{opt.label}</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Card Content for Booked Slot: Ícones ao lado do Nome do Cliente, CPF e Parceiro */}
      {isBooked && booking && (
        <div className="space-y-1.5 text-sm">
          <div className="syncz-booking-meta-text flex items-center gap-2 text-white font-medium text-sm truncate" title={booking.clientName}>
            <User className="syncz-booking-meta-icon w-4 h-4 text-cyan-400 shrink-0" />
            <span className="syncz-booking-meta-text text-sm font-medium text-white truncate">{booking.clientName || booking.partnerRepresentative || 'Cliente Negocial'}</span>
          </div>

          <div className="syncz-booking-meta-text flex items-center gap-2 text-white font-medium text-sm">
            <CreditCard className="syncz-booking-meta-icon w-4 h-4 text-cyan-400 shrink-0" />
            <span className="syncz-booking-meta-text text-sm font-medium text-white">{booking.clientCpf || 'Não informado'}</span>
          </div>

          <div className="syncz-booking-meta-text flex items-center gap-2 text-white font-medium text-sm truncate" title={booking.partnerName}>
            <Building2 className="syncz-booking-meta-icon w-4 h-4 text-cyan-400 shrink-0" />
            <span className="syncz-booking-meta-text text-sm font-medium text-white truncate">{booking.partnerName}</span>
          </div>
        </div>
      )}
    </div>
  );
};


