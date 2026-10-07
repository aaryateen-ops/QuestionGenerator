import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children, theme = 'dark' }) {
  const [toasts, setToasts] = useState([]);
  const isDark = theme === 'dark';

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Floating Toast Notification Dock */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let icon = <Info className="w-4 h-4 text-sky-400 shrink-0" />;
          let borderClasses = isDark ? 'border-zinc-800 bg-zinc-950/95 text-zinc-100' : 'border-zinc-200 bg-white/95 text-zinc-900 shadow-lg';

          if (toast.type === 'success') {
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
            borderClasses = isDark
              ? 'border-emerald-900/60 bg-zinc-950/95 text-zinc-100'
              : 'border-emerald-200 bg-white/95 text-zinc-900 shadow-lg';
          } else if (toast.type === 'error') {
            icon = <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
            borderClasses = isDark
              ? 'border-rose-900/60 bg-zinc-950/95 text-zinc-100'
              : 'border-rose-200 bg-white/95 text-zinc-900 shadow-lg';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg border backdrop-blur-md text-xs font-medium shadow-xl transition-all duration-200 animate-in slide-in-from-right-4 fade-in ${borderClasses}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {icon}
                <span className="truncate">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: (msg) => console.log('Toast:', msg) };
  }
  return context;
}
