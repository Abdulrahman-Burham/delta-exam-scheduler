import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { isRtl } = useLanguage();

  const addToast = useCallback((type: ToastType, title: string, description?: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description, duration }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (title: string, description?: string) => addToast('success', title, description),
    error: (title: string, description?: string) => addToast('error', title, description),
    info: (title: string, description?: string) => addToast('info', title, description),
    warning: (title: string, description?: string) => addToast('warning', title, description),
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/30 bg-slate-900/95 shadow-emerald-500/10';
      case 'error':
        return 'border-rose-500/30 bg-slate-900/95 shadow-rose-500/10';
      case 'warning':
        return 'border-amber-500/30 bg-slate-900/95 shadow-amber-500/10';
      case 'info':
        return 'border-cyan-500/30 bg-slate-900/95 shadow-cyan-500/10';
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Overlay Container */}
      <div
        className={`fixed bottom-5 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none transition-all ${
          isRtl ? 'left-4 items-start' : 'right-4 items-end'
        }`}
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 w-full p-3.5 rounded-2xl border backdrop-blur-xl shadow-xl transition-all duration-300 transform translate-y-0 opacity-100 animate-in fade-in slide-in-from-bottom-2 ${getBorderColor(
              item.type
            )}`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {getIcon(item.type)}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white leading-tight">{item.title}</h4>
              {item.description && (
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(item.id)}
              className="text-slate-500 hover:text-slate-300 p-0.5 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};
