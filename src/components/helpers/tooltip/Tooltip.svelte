<script lang="ts">
	import type { Snippet } from "svelte";

	// `margin` is the viewport edge inset the box is kept clear of (a universal gap,
	// not a per-chart magic number). `target` is an optional portal destination —
	// a CSS selector matched against the box's *ancestors* (or an element). The box
	// is moved there so it paints above sibling stacking contexts. Default (null)
	// portals to <body>; pass a token-scope container (e.g. ".scrollo-story") to keep
	// inherited font-family and CSS custom properties, which <body> would not have.
	interface Props {
		x?: number;
		y?: number;
		offset?: number;
		margin?: number;
		// Preferred placement relative to the anchor (x, y). `align` is the
		// horizontal justification, `side` the vertical side. These are only
		// *preferences* — the box still flips/clamps to stay on-screen (that's the
		// point of the edge handling), so e.g. align:"center"/side:"bottom" gives
		// "centered beneath the cursor unless an edge would clip it".
		align?: "left" | "center" | "right";
		side?: "top" | "bottom";
		target?: string | HTMLElement | null;
		children: Snippet;
	}

	let {
		x = 0,
		y = 0,
		offset = 8,
		margin = 8,
		align = "left",
		side = "bottom",
		target = null,
		children
	}: Props = $props();

	// Measured box size (via bind:clientWidth/Height below). Positioning is driven
	// by the real dimensions so it adapts to any content — no width assumptions.
	let tooltipWidth = $state(0);
	let tooltipHeight = $state(0);

	// Placement: honor the preferred `align`/`side`; flip to the opposite side when
	// that would overflow the far edge; then clamp to the viewport so the box can
	// never actually clip (guarantee, even if it's wider than the gap on both sides).
	// `center` needs no flip — the clamp slides it in from whichever edge it meets.
	// Use documentElement.clientWidth/Height, not window.innerWidth/Height: the
	// latter include the scrollbar gutter, so clamping to them lets the box slide
	// under the vertical scrollbar on the right. clientWidth is the visible content
	// width (scrollbar excluded), so the box stays clear of it.
	let left = $derived.by(() => {
		const vw =
			typeof document !== "undefined"
				? document.documentElement.clientWidth
				: 1920;
		let l;
		if (align === "center") {
			l = x - tooltipWidth / 2;
		} else if (align === "right") {
			l = x - offset - tooltipWidth; // prefer left of anchor
			if (l < margin) l = x + offset; // flip right if it would clip left
		} else {
			l = x + offset; // prefer right of anchor
			if (l + tooltipWidth > vw - margin) l = x - offset - tooltipWidth; // flip left
		}
		return `${Math.max(margin, Math.min(l, vw - tooltipWidth - margin))}px`;
	});

	let top = $derived.by(() => {
		const vh =
			typeof document !== "undefined"
				? document.documentElement.clientHeight
				: 1080;
		let t;
		if (side === "top") {
			t = y - offset - tooltipHeight; // prefer above anchor
			if (t < margin) t = y + offset; // flip below if it would clip top
		} else {
			t = y + offset; // prefer below anchor
			if (t + tooltipHeight > vh - margin) t = y - offset - tooltipHeight; // flip up
		}
		return `${Math.max(margin, Math.min(t, vh - tooltipHeight - margin))}px`;
	});

	// Portal the box out of the chart's DOM subtree so panel stacking contexts can't
	// cover it — `position: fixed` escapes clipping (geometry) but NOT the paint
	// order of its DOM ancestors, so a later-in-DOM panel (or any panel element that
	// forms a stacking context, e.g. a rotated axis label) would otherwise cover it.
	// Resolve `target` while the node is still in place, so a selector can match a
	// *scoping ancestor* (keeping font/token inheritance); fall back to <body>.
	// Attachment; client-only (doesn't run during SSR).
	function portal(node: HTMLElement) {
		const dest =
			(typeof target === "string" ? node.closest(target) : target) ??
			document.body;
		dest.appendChild(node);
		return () => node.remove();
	}
</script>

<div class="tooltip-container" {@attach portal}>
	<div
		class="tooltip-box"
		style:top
		style:left
		style:visibility={tooltipWidth ? "visible" : "hidden"}
		bind:clientWidth={tooltipWidth}
		bind:clientHeight={tooltipHeight}
	>
		{@render children()}
	</div>
</div>

<style>
	div {
		pointer-events: none;
	}
	.tooltip-box {
		position: fixed;
		/* Above all chart content. Portaled out of the panels (see `portal`), so
		   this sits in the destination's stacking context and can't be trapped. */
		z-index: 9999;
		/* IMPORTANT: Disable all transitions to prevent lag */
		transition: none !important;
		/* Ensure position properties update instantly */
		transform: translateZ(0); /* Force GPU acceleration */
		will-change: auto; /* Don't hint for optimization */
	}
</style>
