<script lang="ts">
	let { children } = $props();
</script>

<div id="story-container">
	{@render children()}
</div>

<style>
	#story-container {
		width: 100%;
		max-width: 125rem;
		margin: 0 auto;
		padding: 0;
		font-size: 1.125rem;
	}
</style>
