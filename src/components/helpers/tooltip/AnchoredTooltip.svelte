<script lang="ts">
	import type { Snippet } from "svelte";
	import Tooltip from "./Tooltip.svelte";

	// Anchors the fixed-position Tooltip shell to a *point* instead of the cursor
	// (the "B adapter"). Place this where the point is — inside a positioned parent
	// whose origin IS the point. With SveltePlot that's `HTMLTooltip`, whose wrapper
	// is absolutely positioned at the hovered datum, so an absolute 0×0 anchor pinned
	// to that wrapper's origin sits exactly on the projected point. Measuring the
	// anchor gives the point's viewport coords — no manual scale projection or facet
	// math, and it survives margins/facets/log scales because the browser does it.
	//
	// Coupling: relies on the parent positioning this component's origin at the point.
	// It degrades to a mis-placed (not broken) tooltip if that ever stops holding.
	interface Props {
		// Any value that changes when the anchored point moves; triggers a re-measure.
		key?: unknown;
		offset?: number;
		margin?: number;
		align?: "left" | "center" | "right";
		side?: "top" | "bottom";
		target?: string | HTMLElement | null;
		children: Snippet;
	}

	let {
		key,
		offset = 8,
		margin = 8,
		align = "left",
		side = "bottom",
		target = null,
		children
	}: Props = $props();

	let x = $state(0);
	let y = $state(0);
	let ready = $state(false);

	// Measure the anchor's viewport position and re-measure whenever the point moves.
	// An attachment (not $derived) because reading layout must happen after the DOM
	// flush — by which point the parent wrapper has repositioned to the new point.
	// Reading `key` makes it re-run on point change, not on every mouse move.
	function measure(node: HTMLSpanElement) {
		key; // dependency: re-run when the point changes
		const r = node.getBoundingClientRect();
		x = r.left;
		y = r.top;
		ready = true;
	}
</script>

<span {@attach measure} class="anchor" aria-hidden="true"></span>
{#if ready}
	<Tooltip {x} {y} {offset} {margin} {align} {side} {target}>
		{@render children()}
	</Tooltip>
{/if}

<style>
	.anchor {
		position: absolute;
		top: 0;
		left: 0;
		width: 0;
		height: 0;
		pointer-events: none;
	}
</style>
