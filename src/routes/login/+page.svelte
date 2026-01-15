<script>
	export let form;
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-900 text-white">
	<div class="w-full max-w-md rounded-lg bg-gray-800 p-8 shadow-lg">
		<h1 class="mb-6 text-center text-3xl font-bold text-blue-500">Jellyfin Live</h1>
		
		{#if form?.error}
			<div class="mb-4 rounded bg-red-500 p-3 text-sm text-white">
				{form.error}
			</div>
		{/if}

		<form method="POST" class="space-y-6">
			<div>
				<label for="username" class="mb-2 block text-sm font-medium text-gray-400">Username</label>
				<input
					type="text"
					id="username"
					name="username"
					required
					class="w-full rounded border border-gray-700 bg-gray-700 p-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					placeholder="Enter your username"
				/>
			</div>

			<div>
				<label for="password" class="mb-2 block text-sm font-medium text-gray-400">Password</label>
				<input
					type="password"
					id="password"
					name="password"
					class="w-full rounded border border-gray-700 bg-gray-700 p-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					placeholder="Enter your password"
				/>
			</div>

			<button
				type="submit"
				class="w-full rounded bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
			>
				Sign In
			</button>
		</form>
	</div>
</div>
