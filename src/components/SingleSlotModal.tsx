import React, { useState } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { SlotModality } from '../types/index.ts';
import { formatDateToISO } from '../utils/dateUtils.ts';
import { PlusCircle, Video, MapPin, X, Loader2 } from 'lucide-react';

interface SingleSlotModalProps {
  initialDate?: string;
  onClose: () => void;
}

export const SingleSlotModal: React.FC<SingleSlotModalProps> = ({ initialDate, onClose }) => {
  const { consultants, createSingleSlot, currentUser, currentAgency } = useRealtime();

  const [date, setDate] = useState(initialDate || formatDateToISO(new Date()));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const consultantId = consultants[0]?.id || 'c1';
  const serviceCategory = 'Atendimento';
  const [modality, setModality] = useState<SlotModality>('online');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await createSingleSlot({
        agencyId: currentUser?.agencyId || currentAgency?.id || 'ag_1',
        date,
        startTime,
        endTime,
        durationMinutes: 60,
        consultantId,
        serviceCategory,
        modality,
        locationOrLink:
          modality === 'online'
            ? 'Google Meet: Sala Virtual da Central'
            : 'Sala de Reuniões Alpha - Sede Central',
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar horário.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-white shadow-2xl relative my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <PlusCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Adicionar Horário Avulso
            </h2>
            <p className="text-xs text-slate-400">
              Insira um novo horário específico na grade semanal
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs sm:text-sm">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Data do Horário *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs sm:text-sm"
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Início *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Término *
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Modality */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Modalidade
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModality('online')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  modality === 'online'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" /> Online (Meet)
              </button>
              <button
                type="button"
                onClick={() => setModality('presencial')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  modality === 'presencial'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" /> Presencial
              </button>
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
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-cyan-600/30 disabled:opacity-50"
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
