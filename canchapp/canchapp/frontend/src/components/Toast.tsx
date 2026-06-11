'use client';

import { useEffect, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

// Singleton para disparar toasts desde cualquier parte
type ToastListener = (message: string, type: ToastType) => void;
let listener: ToastListener | null = null;

export function showToast(message: string, type: ToastType = 'success') {
  if (listener) listener(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    listener = addToast;
    return () => { listener = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            flex items-center gap-3 px-4 py-3 border-2 border-ink shadow-brut
            font-medium text-sm max-w-[320px] pointer-events-auto
            animate-in slide-in-from-right-4 duration-200
            ${t.type === 'success' ? 'bg-pitch-400 text-ink' :
              t.type === 'error' ? 'bg-clay text-cream' :
              'bg-ink text-cream'}
          `}
        >
          <span className="text-lg shrink-0">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
