import { writable } from 'svelte/store';

function createToastStore() {
    const { subscribe, update } = writable([]);

    return {
        subscribe,
        add: (message, type = 'info', duration = 3000) => {
            const id = Math.random().toString(36).substr(2, 9);
            update(toasts => [...toasts, { id, message, type }]);

            setTimeout(() => {
                update(toasts => toasts.filter(t => t.id !== id));
            }, duration);
        },
        remove: (id) => {
            update(toasts => toasts.filter(t => t.id !== id));
        }
    };
}

export const toast = createToastStore();
