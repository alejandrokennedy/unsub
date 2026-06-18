<script lang="ts">
	import { footerState } from "$utils/footerState.svelte";
	// import RefreshCopy from "$components/helpers/RefreshCopy.svelte";

	interface Props {
		copy?: any;
		darkMode?: boolean;
	}

	let { copy, darkMode = false }: Props = $props();
	// let { copy: initialCopy, darkMode = false }: Props = $props();
	// let copy = $state(initialCopy);
	// const DOC_ID = "your-google-doc-id-here";

	const HEADER_H = { mobile: 48, desktop: 65 };
	const FOOTER_H = 54.6;
	const MOBILE_BREAKPOINT = 768;

	let width = $state(1024);
	let height = $state(800);
	let isMobile = $derived(width <= MOBILE_BREAKPOINT);
	let headerH = $derived(isMobile ? HEADER_H.mobile : HEADER_H.desktop);
	let footerH = $derived(footerState.visible ? FOOTER_H : 0);
</script>

<div class="scrollo-story" class:scrollo-dark={darkMode}>
	<div
		id="background"
		bind:clientHeight={height}
		bind:clientWidth={width}
		style:height={`calc(100vh - ${headerH}px - ${footerH}px)`}
		style:top={`${headerH}px`}
	>
		<div class="layout-container">
			<!-- Visualization goes here -->
		</div>
	</div>
	<!-- uncomment below to pull directly from gdoc on page reload -->
	<!-- <RefreshCopy docId={DOC_ID} bind:data={copy} /> -->
</div>

<style>
	.scrollo-story {
		color-scheme: light;
	}

	.scrollo-story.scrollo-dark {
		color-scheme: dark;
	}

	:global(body):has(.scrollo-dark) {
		background-color: black;
	}

	#background {
		position: sticky;
	}

	.layout-container {
		position: relative;
		height: 100%;
		width: 100%;
		overflow: hidden;
	}
</style>
