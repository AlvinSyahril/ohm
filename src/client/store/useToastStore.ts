import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, action?: { label: string; onAction: () => void }) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
const MAX_VISIBLE = 3;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, action) => {
    const id = nextId++;
    const toast: Toast = {
      id,
      message,
      actionLabel: action?.label,
      onAction: action?.onAction,
    };
    set((s) => ({ toasts: [...s.toasts, toast].slice(-MAX_VISIBLE) }));
    // Actionable toasts stay long enough to be used
    setTimeout(() => get().dismiss(id), action ? 6000 : 3000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, action?: { label: string; onAction: () => void }) =>
  useToastStore.getState().push(message, action);
