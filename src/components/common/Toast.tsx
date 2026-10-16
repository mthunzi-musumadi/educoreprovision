import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Animated Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const isSuccess = toast.type === 'success';
            const isError = toast.type === 'error';
            const isWarning = toast.type === 'warning';

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.92, x: 24 }}
                animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.88, x: 30, transition: { duration: 0.18, ease: 'easeOut' } }}
                transition={{ type: 'spring', damping: 24, stiffness: 350 }}
                whileHover={{ scale: 1.015 }}
                className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-white border shadow-lg ${
                  isSuccess
                    ? 'border-emerald-200 text-slate-800 ring-1 ring-emerald-500/10'
                    : isError
                    ? 'border-rose-200 text-slate-800 ring-1 ring-rose-500/10'
                    : isWarning
                    ? 'border-amber-200 text-slate-800 ring-1 ring-amber-500/10'
                    : 'border-blue-200 text-slate-800 ring-1 ring-blue-500/10'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {isError && <AlertCircle className="w-4 h-4 text-rose-600" />}
                  {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                  {!isSuccess && !isError && !isWarning && (
                    <Info className="w-4 h-4 text-blue-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900">{toast.title}</div>
                  {toast.message && (
                    <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {toast.message}
                    </div>
                  )}
                </div>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.15, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => removeToast(toast.id)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition shrink-0 cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Return a fallback no-op if used outside provider
    return {
      showToast: () => {},
    };
  }
  return ctx;
};
