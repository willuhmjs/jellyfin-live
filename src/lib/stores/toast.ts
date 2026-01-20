import { writable } from 'svelte/store';

export interface Toast {
    id: string;
    message: string;
    type: 'info' | 'error' | 'success';
    duration?: number;
}

function createToastStore() {
    const { subscribe, update } = writable<Toast[]>([]);

    return {
        subscribe,
        add: (message: string, type: 'info' | 'error' | 'success' = 'info', duration: number = 3000) => {
            const id = Math.random().toString(36).substr(2, 9);
            update(toasts => [...toasts, { id, message, type, duration }]);

            setTimeout(() => {
                update(toasts => toasts.filter(t => t.id !== id));
            }, duration);
        },
        remove: (id: string) => {
            update(toasts => toasts.filter(t => t.id !== id));
        }
    };
}

export const toast = createToastStore();
