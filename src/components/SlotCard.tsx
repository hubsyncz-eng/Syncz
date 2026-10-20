import React from 'react';
import { TimeSlot, Booking } from '../types/index.ts';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { formatPortugueseDate } from '../utils/dateUtils.ts';
import {
  Clock,
  CalendarPlus,
  Trash2,
  User,
  CreditCard,
  Building2,
} from 'lucide-react';

interface SlotCardProps {
  slot: TimeSlot;
  booking?: Booking;
  onBookSlot?: (slot: TimeSlot, booking?: Booking) => void;
}

export const SlotCard: React.FC<SlotCardProps> = ({
  slot,
  booking,
  onBookSlot,
}) => {
  const {
    currentUser,
    currentPartner,
    adminPerspective,
    deleteSlot,
  } = useRealtime();

  const activeRole =
    currentUser?.role === 'admin'
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

  // Check if booked by currently active partner
  const isBookedByCurrentPartner =
    isBooked && booking && booking.partnerId === activePartnerId;

  // In partner view, hide other partners' bookings and locked slots completely
  if (activeRole === 'partner') {
    if (isBooked && !isBookedByCurrentPartner) return null;
    if (isLocked) return null;
  }

  const handleCardClick = () => {
    if (!isBooked && onBookSlot) {
      onBookSlot(slot);
    } else if (isBooked && booking && onBookSlot) {
      if (activeRole === 'agency' || isBookedByCurrentPartner) {
        onBookSlot(slot, booking);
      }
    }
  };

  return (
    <div
      onClick={handleCardClick}
      title={
        isBooked && booking
          ? 'Clique no card para editar este agendamento'
          : !isBooked
            ? 'Clique para agendar este horário'
            : undefined
      }
      className={`syncz-slot-card rounded-2xl p-3.5 transition-all duration-200 border relative group ${
        !isBooked
          ? 'syncz-slot-available bg-slate-900/90 border-cyan-500/40 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer'
          : 'syncz-slot-booked-partner bg-indigo-950/50 border-indigo-500/50 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30 hover:border-cyan-400 cursor-pointer'
      }`}
    >
      {/* Top Header: Time, Weekday & Date + Action Icons */}
      <div className={`flex items-center justify-between gap-2 ${isBooked && booking ? 'pb-1.5 mb-1.5 border-b border-slate-800' : ''}`}>
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

        {/* Action icons in top right: Calendar button (+ Trash button next to it in Agency view) */}
        {!isBooked && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onBookSlot) onBookSlot(slot);
              }}
              className="syncz-slot-action-btn syncz-slot-book-btn p-1.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-gradient-to-r hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 hover:text-white group-hover:bg-gradient-to-r group-hover:from-cyan-500 group-hover:via-blue-500 group-hover:to-indigo-500 group-hover:text-white transition-all shadow-sm flex items-center justify-center shrink-0 cursor-pointer"
              title="Clique para fazer o cadastro deste horário"
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

