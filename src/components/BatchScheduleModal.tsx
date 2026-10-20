import React, { useState, useMemo } from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { SlotModality } from '../types/index.ts';
import {
  DAYS_OF_WEEK,
  getMonday,
  addDays,
  formatDateToISO,
  formatPortugueseDate,
} from '../utils/dateUtils.ts';
import {
  CalendarRange,
  Clock,
  Video,
  MapPin,
  Coffee,
  Check,
  Loader2,
  X,
  Layers,
} from 'lucide-react';

interface BatchScheduleModalProps {
  onClose: () => void;
}

export const BatchScheduleModal: React.FC<BatchScheduleModalProps> = ({ onClose }) => {
  const { consultants, batchGenerateSlots, currentUser, currentAgency } = useRealtime();

  const today = new Date();
  const defaultMonday = getMonday(today);
  const defaultFriday = addDays(defaultMonday, 4);

  const [startDate, setStartDate] = useState(formatDateToISO(defaultMonday));
  const [endDate, setEndDate] = useState(formatDateToISO(defaultFriday));
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Seg a Sex

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState(60);

  const [includeLunchBreak, setIncludeLunchBreak] = useState(true);
  const [lunchBreakStart, setLunchBreakStart] = useState('12:00');
  const [lunchBreakEnd, setLunchBreakEnd] = useState('13:30');

  const consultantId = consultants[0]?.id || 'c1';
  const serviceCategory = 'Atendimento';
  const [modality, setModality] = useState<SlotModality>('online');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Toggle day checkbox
  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  // Estimate slot count
  const estimatedSlotCount = useMemo(() => {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const sMin = toMinutes(startTime);
    const eMin = toMinutes(endTime);
    const dur = Number(durationMinutes) || 60;
    const lStart = includeLunchBreak ? toMinutes(lunchBreakStart) : -1;
    const lEnd = includeLunchBreak ? toMinutes(lunchBreakEnd) : -1;

    let dailyCount = 0;
    for (let cur = sMin; cur + dur <= eMin; cur += dur) {
      if (lStart !== -1 && lEnd !== -1 && cur < lEnd && cur + dur > lStart) {
        continue;
      }
      dailyCount++;
    }

    // Days count in range matching selectedDays
    const startD = new Date(startDate + 'T00:00:00');
    const endD = new Date(endDate + 'T23:59:59');
    let matchedDays = 0;
    for (let cur = new Date(startD); cur <= endD; cur.setDate(cur.getDate() + 1)) {
      if (selectedDays.includes(cur.getDay())) {
        matchedDays++;
      }
    }

    return dailyCount * matchedDays;
  }, [startDate, endDate, selectedDays, startTime, endTime, durationMinutes, includeLunchBreak, lunchBreakStart, lunchBreakEnd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDays.length) {
      setErrorMsg('Selecione pelo menos um dia da semana.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await batchGenerateSlots({
        agencyId: currentUser?.agencyId || currentAgency?.id || 'ag_1',
        startDate,
        endDate,
        selectedDays,
        startTime,
        endTime,
        durationMinutes,
        lunchBreakStart: includeLunchBreak ? lunchBreakStart : undefined,
        lunchBreakEnd: includeLunchBreak ? lunchBreakEnd : undefined,
        consultantId,
        serviceCategory,
        modality,
        locationOrLink:
          modality === 'online'
            ? 'Google Meet: Sala Corporativa da Agência'
            : 'Sala Nobre de Reuniões - Sede Central, 8º andar',
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao gerar grade de horários.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-5 sm:p-8 text-white shadow-2xl relative my-auto overflow-hidden box-border">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-10 pb-5 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Layers className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Abertura de Grade Semanal em Lote
            </h2>
            <p className="text-xs text-slate-400">
              Disponibilize automaticamente múltiplos horários para parceiros negociais
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs sm:text-sm min-w-0">
          
          {/* Week Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            <div className="min-w-0 w-full">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data Inicial (Ex: Segunda-feira)
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full max-w-full min-w-0 box-border appearance-none px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>

            <div className="min-w-0 w-full">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data Final (Ex: Sexta-feira)
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full max-w-full min-w-0 box-border appearance-none px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Days of the Week Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Dias da Semana com Agendas Abertas:
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = selectedDays.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border border-blue-400 shadow-md shadow-blue-600/30'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Business Hours & Slot Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Horário Inicial
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Horário Final
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Duração de Cada Sessão
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs sm:text-sm"
              >
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>60 minutos (Padrão)</option>
                <option value={90}>90 minutos</option>
              </select>
            </div>
          </div>

          {/* Lunch Break Exclusion */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                <input
                  type="checkbox"
                  checked={includeLunchBreak}
                  onChange={(e) => setIncludeLunchBreak(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                />
                <Coffee className="w-4 h-4 text-amber-400" />
                Bloquear intervalo de almoço na grade
              </label>
            </div>

            {includeLunchBreak && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Início Almoço</span>
                  <input
                    type="time"
                    value={lunchBreakStart}
                    onChange={(e) => setLunchBreakStart(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Fim Almoço</span>
                  <input
                    type="time"
                    value={lunchBreakEnd}
                    onChange={(e) => setLunchBreakEnd(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                </div>
              </div>
            )}
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
              disabled={isSubmitting || estimatedSlotCount <= 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publicando Grade...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  Publicar Grade na Central
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
