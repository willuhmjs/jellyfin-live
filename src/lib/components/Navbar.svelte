<script>
	import { page } from '$app/stores';
</script>

<nav class="bg-gray-900 text-white border-b border-gray-800 shrink-0">
	<div class="px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between h-16">
			<div class="flex items-center gap-8">
				<div class="flex-shrink-0 font-bold text-xl text-blue-500">
					Jellyfin DVR
				</div>
				<div class="hidden md:block">
					<div class="flex items-baseline space-x-4">
						<a
							href="/dashboard"
							class="px-3 py-2 rounded-md text-sm font-medium transition-colors {$page.url.pathname.startsWith('/dashboard')
								? 'bg-gray-800 text-white'
								: 'text-gray-300 hover:bg-gray-700 hover:text-white'}"
						>
							Dashboard
						</a>
						<a
							href="/guide"
							class="px-3 py-2 rounded-md text-sm font-medium transition-colors {$page.url.pathname.startsWith('/guide')
								? 'bg-gray-800 text-white'
								: 'text-gray-300 hover:bg-gray-700 hover:text-white'}"
						>
							TV Guide
						</a>
						<a
							href="/library"
							class="px-3 py-2 rounded-md text-sm font-medium transition-colors {$page.url.pathname.startsWith('/library')
								? 'bg-gray-800 text-white'
								: 'text-gray-300 hover:bg-gray-700 hover:text-white'}"
						>
							Library
						</a>
						<a
							href="/settings"
							class="px-3 py-2 rounded-md text-sm font-medium transition-colors {$page.url.pathname.startsWith('/settings')
								? 'bg-gray-800 text-white'
								: 'text-gray-300 hover:bg-gray-700 hover:text-white'}"
						>
							Settings
						</a>
					</div>
				</div>
			</div>
							     <!-- Mobile Menu Placeholder -->
							     <div class="md:hidden flex space-x-4">
							          <a href="/dashboard" class="text-gray-300 hover:text-white">Dash</a>
							          <a href="/guide" class="text-gray-300 hover:text-white">Guide</a>
							          <a href="/library" class="text-gray-300 hover:text-white">Lib</a>
							          <a href="/settings" class="text-gray-300 hover:text-white">Set</a>
							     </div>
		</div>
	</div>
</nav>
