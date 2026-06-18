<script lang="ts">
	import "$styles/scoped.css";
	import Header from "$components/Header.svelte";

	let { children } = $props();
</script>

<Header />
<div id="content">
	{@render children?.()}
</div>
