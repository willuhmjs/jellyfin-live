<div class="flex h-screen items-center justify-center bg-gray-900">
	<div class="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-lg">
		<h1 class="mb-6 text-center text-3xl font-bold text-white">Setup</h1>
		
		<form method="POST" class="space-y-6">
			<div>
				<label for="url" class="mb-2 block text-sm font-medium text-gray-300">
					Jellyfin Server URL
				</label>
				<input
					type="url"
					name="url"
					id="url"
					placeholder="http://192.168.1.5:8096"
					required
					class="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				/>
			</div>

			<div class="flex items-center">
				<input
					type="checkbox"
					name="ignore_ssl"
					id="ignore_ssl"
					class="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
				/>
				<label for="ignore_ssl" class="ml-2 block text-sm text-gray-300">
					Ignore SSL Certificate Errors (Self-Signed)
				</label>
			</div>

			<button
				type="submit"
				class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
			>
				Save & Continue
			</button>
		</form>
	</div>
</div>
