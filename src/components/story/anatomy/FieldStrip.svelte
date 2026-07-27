<script>
	/**
	 * A single-axis jittered dot plot with a draggable threshold — a complementary
	 * view that also acts as a filter. Dots are colored by the shared canceled
	 * state; dragging the handle sets an intersective threshold (select side).
	 * Deterministic jitter keeps dots stable across renders.
	 */
	import * as d3 from "d3";

	let {
		journals,
		field,
		domain,
		label,
		unit = "",
		value = null, // current threshold; null = inactive (rest at edge)
		selectSide = "upper", // "upper" = select >= value
		canceled,
		width = 320,
		height = 78,
		onchange = () => {}
	} = $props();

	const M = { top: 6, right: 14, bottom: 18, left: 14 };
	const innerW = $derived(Math.max(10, width - M.left - M.right));
	const innerH = $derived(Math.max(10, height - M.top - M.bottom));

	const x = $derived(d3.scaleLinear().domain(domain).range([0, innerW]).clamp(true));

	// Deterministic per-id vertical jitter in [0,1].
	function jitter(id) {
		let h = 2166136261;
		for (let i = 0; i < id.length; i++) {
			h ^= id.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return ((h >>> 0) % 1000) / 1000;
	}

	const restValue = $derived(selectSide === "upper" ? domain[0] : domain[1]);
	const handleValue = $derived(value ?? restValue);
	const handleX = $derived(x(handleValue));

	// Display precision: small-range fields (e.g. fractional authorships, max ~7)
	// need a decimal so the continuous handle reads sensibly; large ranges round.
	const decimals = $derived(domain[1] - domain[0] < 20 ? 1 : 0);

	// Minimal x-axis: a few compact ticks (0, 2k, 4.8k … / 0, 4 …).
	const ticks = $derived(x.ticks(3));
	const fmtTick = d3.format("~s");

	let svgEl;
	let dragging = $state(false);

	function toValue(clientX) {
		const r = svgEl.getBoundingClientRect();
		return x.invert(clientX - r.left - M.left);
	}
	function start(e) {
		dragging = true;
		e.target.setPointerCapture?.(e.pointerId);
	}
	function move(e) {
		if (!dragging) return;
		// Continuous (pixel-precise); parent clamps. Display rounds for legibility.
		onchange(toValue(e.clientX));
	}
	function end(e) {
		dragging = false;
		e.target.releasePointerCapture?.(e.pointerId);
	}
</script>

<div class="strip">
	<div class="head">
		<span class="label">{label}</span>
		<span class="val" class:active={value != null}>
			{value != null
				? `${selectSide === "upper" ? "≥" : "≤"} ${value.toFixed(decimals)}${unit}`
				: "all"}
		</span>
	</div>
	<svg bind:this={svgEl} {width} {height}>
		<g transform={`translate(${M.left},${M.top})`}>
			<!-- selected region shading -->
			{#if value != null}
				<rect
					class="sel"
					x={selectSide === "upper" ? handleX : 0}
					y="0"
					width={selectSide === "upper" ? innerW - handleX : handleX}
					height={innerH}
				/>
			{/if}
			<line class="base" x1="0" x2={innerW} y1={innerH} y2={innerH} />
			{#each ticks as t (t)}
				<g class="atick" transform={`translate(${x(t)},${innerH})`}>
					<line y1="0" y2="3" />
					<text y="5" dy="0.71em">{fmtTick(t)}</text>
				</g>
			{/each}
			{#each journals as d (d.id)}
				<circle
					class="d"
					class:canceled={canceled.has(d.id)}
					cx={x(d[field])}
					cy={M.top + jitter(d.id) * (innerH - 8)}
					r="2.6"
				/>
			{/each}
			<!-- threshold handle -->
			<g class="handle" transform={`translate(${handleX},0)`}>
				<line class="h-line" y1="-2" y2={innerH} x1="0" x2="0" />
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<rect
					class="h-hit"
					x="-7"
					y="-2"
					width="14"
					height={innerH + 4}
					onpointerdown={start}
					onpointermove={move}
					onpointerup={end}
				/>
				<path class="h-grip" d={`M -4 ${innerH + 2} L 4 ${innerH + 2} L 0 ${innerH + 9} Z`} />
			</g>
		</g>
	</svg>
</div>

<style>
	.strip {
		width: 100%;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		font-family: Helvetica, Arial, sans-serif;
		margin-bottom: 1px;
	}
	.label {
		font-size: 11.5px;
		font-weight: 600;
		color: #333;
	}
	.val {
		font-size: 11px;
		color: #999;
		font-variant-numeric: tabular-nums;
	}
	.val.active {
		color: #c0392b;
		font-weight: 700;
	}
	svg {
		display: block;
		overflow: visible;
	}
	.d {
		fill: #1668b3;
		fill-opacity: 0.5;
		transition:
			fill 300ms ease,
			fill-opacity 300ms ease;
	}
	.d.canceled {
		fill: #c0392b;
		fill-opacity: 0.75;
	}
	.base {
		stroke: #ddd;
	}
	.atick line {
		stroke: #ccc;
	}
	.atick text {
		font-size: 9px;
		fill: #aaa;
		text-anchor: middle;
	}
	.sel {
		fill: #c0392b;
		fill-opacity: 0.07;
	}
	.h-line {
		stroke: #c0392b;
		stroke-width: 1.5;
	}
	.h-hit {
		fill: transparent;
		cursor: ew-resize;
	}
	.h-grip {
		fill: #c0392b;
		cursor: ew-resize;
	}
</style>
