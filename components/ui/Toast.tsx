'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  push: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 3500);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'rounded-md px-4 py-2 text-sm shadow-md animate-fade-in',
              item.kind === 'success' && 'bg-green-600 text-white',
              item.kind === 'error' && 'bg-red-600 text-white',
              item.kind === 'info' && 'bg-navy-900 text-white',
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: (msg) => {
        if (typeof window !== 'undefined') window.alert(msg);
      },
    };
  }
  return ctx;
}
