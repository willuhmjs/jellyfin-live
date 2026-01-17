<script>
	let { children } = $props();
</script>

<div class="w-full h-full overflow-y-auto">
	{@render children()}
</div>
