<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="w-full h-full overflow-y-auto">
	{@render children()}
</div>
