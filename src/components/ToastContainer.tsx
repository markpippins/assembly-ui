import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3 border shadow-xl backdrop-blur-md transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : 'bg-slate-900/90 border-slate-700 text-slate-200'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />}
          <p className="text-sm font-medium flex-1 leading-relaxed">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
