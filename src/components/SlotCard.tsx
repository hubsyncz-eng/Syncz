import React from 'react';
import { TimeSlot, Booking } from '../types/index.ts';
import { useRealtime } from '../context/RealtimeContext.tsx';
import {
  Clock,
  CalendarPlus,
  Lock,
  Unlock,
  Trash2,
  Edit3,
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
    toggleSlotStatus,
    deleteSlot,
  } = useRealtime();

  const activeRole = currentUser?.role || 'partner';
  const activePartnerId = currentUser?.role === 'partner' ? currentUser.partnerId : currentPartner?.id;

  const isBooked = slot.status === 'booked';
  const isLocked = slot.status === 'locked';
  const isAvailable = slot.status === 'available';

  // Check if booked by currently active partner
  const isBookedByCurrentPartner =
    isBooked && booking && booking.partnerId === activePartnerId;

  // In partner view, hide other partners' bookings and locked slots completely
  if (activeRole === 'partner') {
    if (isBooked && !isBookedByCurrentPartner) return null;
    if (isLocked) return null;
  }

  const handleCardClick = () => {
    if (activeRole === 'partner') {
      if (isAvailable && onBookSlot) {
        onBookSlot(slot);
      } else if (isBookedByCurrentPartner && onBookSlot) {
        onBookSlot(slot, booking);
      }
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-2xl p-3.5 transition-all duration-200 border relative group ${
        isAvailable
          ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer'
          : isBookedByCurrentPartner
            ? 'bg-blue-950/60 border-blue-500/60 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30 hover:border-blue-400 cursor-pointer'
            : isBooked
              ? 'bg-slate-900/50 border-slate-800 opacity-90'
              : 'bg-slate-900/40 border-slate-800/80 opacity-75'
      }`}
    >
      {/* Top Header: Time & Scheduling Icon */}
      <div className={`flex items-center justify-between gap-2 ${isBooked && booking ? 'mb-2' : ''}`}>
        <div className="flex items-center gap-1.5 font-bold text-sm text-white">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{slot.startTime} - {slot.endTime}</span>
        </div>

        {/* Action icon in top right: Scheduling icon if available, Edit icon if booked by current partner */}
        {isAvailable ? (
          <div
            className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm flex items-center justify-center shrink-0"
            title="Clique para agendar este horário"
          >
            <CalendarPlus className="w-4 h-4" />
          </div>
        ) : isBookedByCurrentPartner ? (
          <div
            className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-sm flex items-center justify-center shrink-0"
            title="Clique para editar este agendamento"
          >
            <Edit3 className="w-4 h-4" />
          </div>
        ) : isLocked ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded-full border border-slate-700/60 shrink-0">
            <Lock className="w-3 h-3" /> Bloqueado
          </span>
        ) : null}
      </div>

      {/* Card Content for Booked Slot: Ícones ao lado do Nome do Cliente, CPF e Parceiro */}
      {isBooked && booking && (
        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold text-xs truncate" title={booking.clientName}>
            <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{booking.clientName || 'Cliente Negocial'}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-300 font-mono text-xs">
            <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{booking.clientCpf || 'Não informado'}</span>
          </div>

          <div className="flex items-center gap-2 text-emerald-400 font-medium text-xs truncate" title={booking.partnerName}>
            <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{booking.partnerName}</span>
          </div>
        </div>
      )}

      {/* Agency Mode Bottom Actions */}
      {activeRole === 'agency' && (
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
          {isBooked && booking ? (
            <div className="flex-1 text-center py-1 px-2 rounded-xl bg-slate-800/80 text-cyan-300 text-[11px] font-medium">
              Agendamento Confirmado
            </div>
          ) : (
              <>
                <button
                  type="button"
                  onClick={() => toggleSlotStatus(slot.id)}
                  title={isAvailable ? 'Bloquear horário' : 'Desbloquear horário'}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-medium transition-colors ${
                    isAvailable
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30'
                  }`}
                >
                  {isAvailable ? (
                    <>
                      <Lock className="w-3 h-3 text-slate-400" /> Bloquear
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 text-amber-400" /> Desbloquear
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => deleteSlot(slot.id)}
                  title="Excluir este horário"
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
    </div>
  );
};
