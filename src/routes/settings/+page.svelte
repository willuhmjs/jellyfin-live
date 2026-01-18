<script>
    import { enhance } from '$app/forms';
    export let data;
    export let form;
</script>

<div class="h-full overflow-y-auto p-6">
    <div class="max-w-2xl mx-auto">
        <h1 class="text-3xl font-bold text-white mb-6">Settings</h1>

        {#if form?.success}
            <div class="bg-green-900/30 border border-green-800 text-green-200 px-4 py-3 rounded-xl mb-6">
                Settings saved successfully.
            </div>
        {/if}

        <form method="POST" use:enhance class="space-y-6 bg-card p-8 rounded-2xl shadow-xl border border-white/5">
            <div>
                <label for="jellyfin_url" class="block text-sm font-medium text-gray-200 mb-2">Jellyfin URL</label>
                <input
                    type="url"
                    id="jellyfin_url"
                    name="jellyfin_url"
                    value={data.jellyfin_url || ''}
                    required
                    class="block w-full px-4 py-3 border border-white/10 rounded-xl bg-background/50 text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-background focus:ring-1 focus:ring-accent transition-colors duration-200"
                    placeholder="http://localhost:8096"
                />
            </div>

            <div class="flex items-center">
                <input
                    type="checkbox"
                    id="ignore_ssl"
                    name="ignore_ssl"
                    checked={data.ignore_ssl}
                    class="h-5 w-5 text-accent focus:ring-accent border-white/10 rounded bg-background/50"
                />
                <label for="ignore_ssl" class="ml-3 block text-sm text-gray-300">
                    Ignore SSL Errors (Self-signed certificates)
                </label>
            </div>

            <button
                type="submit"
                class="w-full rounded bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
                Save Settings
            </button>
        </form>
    </div>
</div>
