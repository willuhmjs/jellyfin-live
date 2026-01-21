<script lang="ts">
    import { toast } from '$lib/stores/toast';
    import { fade, fly } from 'svelte/transition';
    import { flip } from 'svelte/animate';
</script>

<div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
    {#each $toast as t (t.id)}
        <div
            animate:flip
            in:fly={{ y: 20 }}
            out:fade
            class="flex items-center gap-2 rounded-lg px-4 py-3 text-white shadow-lg min-w-[300px]"
            class:bg-green-600={t.type === 'success'}
            class:bg-red-600={t.type === 'error'}
            class:bg-blue-600={t.type === 'info'}
        >
            <div class="flex-1 text-sm font-medium">{t.message}</div>
            <button
                class="ml-2 text-white/80 hover:text-white cursor-pointer"
                on:click={() => toast.remove(t.id)}
            >
                ✕
            </button>
        </div>
    {/each}
</div>
