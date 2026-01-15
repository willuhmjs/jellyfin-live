<script>
    import { enhance } from '$app/forms';
    export let data;
    export let form;
</script>

<div class="h-full overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
    <div class="max-w-2xl mx-auto">
        <h1 class="text-3xl font-bold mb-6">Settings</h1>

        {#if form?.success}
            <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200">
                Settings saved successfully.
            </div>
        {/if}

        <form method="POST" use:enhance class="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div>
                <label for="jellyfin_url" class="block text-sm font-medium mb-1">Jellyfin URL</label>
                <input 
                    type="url" 
                    id="jellyfin_url" 
                    name="jellyfin_url" 
                    value={data.jellyfin_url || ''} 
                    required
                    class="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                    placeholder="http://localhost:8096"
                />
            </div>

            <div class="flex items-center">
                <input 
                    type="checkbox" 
                    id="ignore_ssl" 
                    name="ignore_ssl" 
                    checked={data.ignore_ssl} 
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
                <label for="ignore_ssl" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Ignore SSL Errors (Self-signed certificates)
                </label>
            </div>

            <button 
                type="submit" 
                class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-medium"
            >
                Save Settings
            </button>
        </form>
    </div>
</div>
