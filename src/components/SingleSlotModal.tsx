import React, { useState } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { SlotModality } from '../types/index.ts';
import { formatDateToISO } from '../utils/dateUtils.ts';
import { PlusCircle, X, Loader2 } from 'lucide-react';

interface SingleSlotModalProps {
  initialDate?: string;
  onClose: () => void;
}

export const SingleSlotModal: React.FC<SingleSlotModalProps> = ({ initialDate, onClose }) => {
  const { consultants, createSingleSlot, currentUser, currentAgency } = useRealtime();

  const [date, setDate] = useState(initialDate || formatDateToISO(new Date()));
  const [startTime, setStartTime] = useState('10:00');
  const consultantId = consultants[0]?.id || 'c1';
  const serviceCategory = 'Atendimento';
  const modality: SlotModality = 'online';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const computeEndTime = (start: string, durationMinutes = 60) => {
    const [h, m] = start.split(':').map(Number);
    const totalMinutes = (h * 60 + m + durationMinutes) % (24 * 60);
    const endH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const endM = String(totalMinutes % 60).padStart(2, '0');
    return `${endH}:${endM}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await createSingleSlot({
        agencyId: currentUser?.agencyId || currentAgency?.id || 'ag_1',
        date,
        startTime,
        endTime: computeEndTime(startTime, 60),
        durationMinutes: 60,
        consultantId,
        serviceCategory,
        modality,
        locationOrLink: 'Google Meet: Sala Virtual da Central',
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar horário.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-5 sm:p-6 text-white shadow-2xl relative my-auto overflow-hidden box-border">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-10 pb-4 border-b border-slate-800">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
              Adicionar Horário Avulso
            </h2>
            <p className="text-xs text-slate-400 truncate">
              Insira um novo horário específico na grade semanal
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs sm:text-sm min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 min-w-0">
            {/* Date */}
            <div className="min-w-0 w-full">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Data do Horário *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full max-w-full min-w-0 box-border appearance-none px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs sm:text-sm"
              />
            </div>

            {/* Start Time */}
            <div className="min-w-0 w-full">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Início *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="block w-full max-w-full min-w-0 box-border appearance-none px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-cyan-600/30 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  Criar e Publicar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
