<script>
	import { onMount } from "svelte";
	import archieml from "archieml";
	let { docId, data = $bindable() } = $props();

	let refreshing = $state(false);

	async function refresh() {
		refreshing = true;
		try {
			const url = `https://docs.google.com/document/d/${docId}/export?format=txt`;
			const response = await fetch(url);
			const text = await response.text();
			const parsed = archieml.load(text);

			data = parsed;
		} catch (err) {
			console.error("Failed to refresh copy:", err);
		} finally {
			refreshing = false;
		}
	}

	onMount(() => {
		refresh();
	});
</script>

<!-- <button onclick={refresh} disabled={refreshing}>
	{refreshing ? "Refreshing..." : "Refresh Copy"}
</button> -->

<!-- <style>
	button {
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 9999;
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	button:hover:not(:disabled) {
		background: #f0f0f0;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style> -->
