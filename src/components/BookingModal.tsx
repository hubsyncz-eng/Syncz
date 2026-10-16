import React, { useState } from 'react';
import { TimeSlot, Booking, PropertyType } from '../types/index.ts';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { formatFullPortugueseDate } from '../utils/dateUtils.ts';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  Building,
  Home,
  User,
  CreditCard,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';

interface BookingModalProps {
  slot: TimeSlot;
  existingBooking?: Booking;
  onClose: () => void;
  onBookingSuccess: (booking: Booking) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  slot,
  existingBooking,
  onClose,
  onBookingSuccess,
}) => {
  const { currentPartner, currentUser, bookSlot, updateBooking, slots } = useRealtime();

  const partnerProfile = currentUser?.role === 'partner'
    ? {
        id: currentUser.partnerId || currentUser.id,
        name: currentUser.name,
        representative: currentUser.representative || currentUser.name,
        email: currentUser.email,
        phone: '',
        cnpj: currentUser.cnpj || '',
      }
    : (currentPartner || {
        id: 'p_temp',
        name: 'Parceiro Negocial',
        representative: 'Representante',
        email: 'parceiro@empresa.com',
        phone: '',
        cnpj: '',
      });

  // Verify real-time slot state in case another partner booked it
  const currentSlotInState = slots.find((s) => s.id === slot.id) || slot;
  const isSlotStillAvailable = existingBooking || currentSlotInState.status === 'available';

  // Specific Booking Fields: Cliente, CPF, Seletor Imóvel/Empreendimento, Notas
  const [clientName, setClientName] = useState(existingBooking?.clientName || '');
  const [clientCpf, setClientCpf] = useState(existingBooking?.clientCpf || '');
  const [propertyType, setPropertyType] = useState<PropertyType>(
    existingBooking?.propertyType || 'Imóvel Individual'
  );
  const [partnerNotes, setPartnerNotes] = useState(existingBooking?.partnerNotes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper for CPF masking (000.000.000-00)
  const formatCPF = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingBooking && !isSlotStillAvailable) {
      setErrorMsg('Este horário acabou de ser reservado por outro parceiro ou bloqueado pela agência.');
      return;
    }

    if (!clientName.trim()) {
      setErrorMsg('Por favor informe o nome do Cliente.');
      return;
    }

    if (!clientCpf.trim() || clientCpf.replace(/\D/g, '').length < 11) {
      setErrorMsg('Por favor informe um CPF válido (11 dígitos).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (existingBooking) {
        const updated = await updateBooking(existingBooking.id, {
          clientName: clientName.trim(),
          clientCpf: clientCpf.trim(),
          propertyType,
          partnerNotes: partnerNotes.trim() ? partnerNotes.trim() : undefined,
        });
        onBookingSuccess(updated);
        return;
      }

      const result = await bookSlot({
        slotId: slot.id,
        partnerId: partnerProfile.id,
        partnerName: partnerProfile.name,
        partnerRepresentative: partnerProfile.representative,
        partnerEmail: partnerProfile.email,
        partnerPhone: partnerProfile.phone,
        partnerCnpj: partnerProfile.cnpj,
        clientName: clientName.trim(),
        clientCpf: clientCpf.trim(),
        propertyType,
        agendaTopic: `${propertyType}: ${clientName.trim()}`,
        partnerNotes: partnerNotes.trim() ? partnerNotes.trim() : undefined,
      });

      // Fire celebratory confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      onBookingSuccess(result.booking);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar agendamento.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 sm:p-8 text-white shadow-2xl relative my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header: Apenas Data e Horário */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 pr-10">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-base font-bold text-white">
            <div className="flex items-center gap-1.5 text-blue-400">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
              <span className="capitalize">{formatFullPortugueseDate(slot.date)}</span>
            </div>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
              <span>{slot.startTime} às {slot.endTime}</span>
            </div>
          </div>
        </div>

        {/* Slot Warning if occupied during open modal */}
        {!isSlotStillAvailable && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-start gap-3 text-rose-200 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Horário Indisponível!</strong>
              Este horário acabou de ser confirmado por outro parceiro negocial na rede. Por favor, feche esta janela e escolha outro horário aberto.
            </div>
          </div>
        )}

        {/* Booking Form with Specific Requested Fields */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs sm:text-sm">
          
          {/* Cliente & CPF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cliente *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs sm:text-sm placeholder:text-slate-600"
                  placeholder="Nome completo do cliente"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                CPF *
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={clientCpf}
                  maxLength={14}
                  onChange={(e) => setClientCpf(formatCPF(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none focus:border-cyan-500 text-xs sm:text-sm placeholder:text-slate-600"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
          </div>

          {/* Seletor: Imóvel Individual ou Empreendimento */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tipo de Imóvel / Negócio *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPropertyType('Imóvel Individual')}
                className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  propertyType === 'Imóvel Individual'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Imóvel Individual</span>
              </button>

              <button
                type="button"
                onClick={() => setPropertyType('Empreendimento')}
                className={`py-3 px-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  propertyType === 'Empreendimento'
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Empreendimento</span>
              </button>
            </div>
          </div>

          {/* Espaço para Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notas / Observações
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <textarea
                rows={3}
                value={partnerNotes}
                onChange={(e) => setPartnerNotes(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs sm:text-sm resize-none placeholder:text-slate-600"
                placeholder="Insira anotações sobre a negociação, detalhes ou observações..."
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !isSlotStillAvailable}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {existingBooking ? 'Salvando...' : 'Confirmando...'}
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  {existingBooking ? 'Salvar Dados do Agendamento' : 'Confirmar Agendamento Automático'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
