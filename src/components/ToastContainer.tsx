import React from 'react';
import { useRealtime } from '../context/RealtimeContext.tsx';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useRealtime();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-right-4 ${
              isSuccess
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100'
                : isWarning
                  ? 'bg-amber-950/90 border-amber-500/40 text-amber-100'
                  : isError
                    ? 'bg-rose-950/90 border-rose-500/40 text-rose-100'
                    : 'bg-slate-900/90 border-slate-700/60 text-slate-100'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-cyan-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{toast.title}</div>
              <div className="text-xs opacity-90 mt-0.5 leading-relaxed">{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
