<script>
	/**
	 * The morphing hero scatter. Dumb/declarative: the parent computes every dot's
	 * pixel {x,y,r} per step and passes them in; CSS transitions on transform + r
	 * make the morph glide (dots are keyed by journal id for object constancy).
	 */
	let {
		journals,
		positions, // Map<id, {x,y,r}>
		canceled, // Set<id>
		width,
		height,
		plot, // {left, top, innerW, innerH}
		xAxis, // {label, ticks:[{v,x}]}
		yAxis = null, // {label, ticks:[{v,y}]} | null
		spotId = null,
		showSpot = false,
		cutActive = false,
		cutY = 0,
		onCutDrag = () => {},
		onhover = () => {}
	} = $props();

	let svgEl;
	let dragging = $state(false);

	function pointerToY(clientY) {
		const r = svgEl.getBoundingClientRect();
		return clientY - r.top;
	}

	function startDrag(e) {
		dragging = true;
		e.target.setPointerCapture?.(e.pointerId);
	}
	function moveDrag(e) {
		if (!dragging) return;
		onCutDrag(pointerToY(e.clientY));
	}
	function endDrag(e) {
		dragging = false;
		e.target.releasePointerCapture?.(e.pointerId);
	}

	const spot = $derived(spotId ? positions.get(spotId) : null);
</script>

<svg
	bind:this={svgEl}
	{width}
	{height}
	role="img"
	aria-label="Scatterplot of journals by cost and usage"
	onpointerleave={() => onhover(null)}
	onpointermove={(e) => {
		// Clear the tooltip when the pointer is over anything that isn't a dot
		// (empty space, axes, cut zone). Dot handlers fire first and re-set it, so
		// hovering a dot keeps the tooltip; leaving it into blank space clears it.
		if (!(e.target instanceof SVGCircleElement) || !e.target.classList.contains("dot"))
			onhover(null);
	}}
>
	<!-- Cancel zone (everything above the threshold line = higher cost-per-use) -->
	{#if cutActive}
		<rect
			class="cut-zone"
			x={plot.left}
			y={plot.top}
			width={plot.innerW}
			height={Math.max(0, cutY - plot.top)}
		/>
	{/if}

	<!-- Axes -->
	<g class="axis" transform={`translate(0,${plot.top + plot.innerH})`}>
		<line x1={plot.left} x2={plot.left + plot.innerW} y1="0" y2="0" />
		{#each xAxis.ticks as t (t.v)}
			<g transform={`translate(${t.x},0)`}>
				<line class="tick" y1="0" y2="6" />
				{#if xAxis.rotate}
					<text
						class="rot"
						transform="rotate(-45)"
						text-anchor="end"
						dx="-0.5em"
						dy="0.9em">{t.label}</text
					>
				{:else}
					<text y="9" dy="0.71em">{t.label}</text>
				{/if}
			</g>
		{/each}
		{#if xAxis.label}
			<text class="axis-label" x={plot.left + plot.innerW} y="32" text-anchor="end"
				>{xAxis.label} →</text
			>
		{/if}
	</g>

	{#if yAxis}
		<g class="axis y" transform={`translate(${plot.left},0)`}>
			<line y1={plot.top} y2={plot.top + plot.innerH} x1="0" x2="0" />
			{#each yAxis.ticks as t (t.v)}
				<g transform={`translate(0,${t.y})`}>
					<line class="tick" x1="0" x2="-6" />
					<text x="-9" dy="0.32em" text-anchor="end">{t.label}</text>
				</g>
			{/each}
			<text class="axis-label" x="0" y={plot.top - 10} text-anchor="start"
				>↑ {yAxis.label}</text
			>
		</g>
	{/if}

	<!-- Dots -->
	<g class="dots">
		{#each journals as d (d.id)}
			{@const p = positions.get(d.id)}
			{#if p}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<circle
					class="dot"
					class:canceled={canceled.has(d.id)}
					class:spot={showSpot && d.id === spotId}
					style:transform={`translate(${p.x}px, ${p.y}px)`}
					r={p.r}
					onpointerenter={(e) => onhover(d, e.clientX, e.clientY)}
					onpointermove={(e) => onhover(d, e.clientX, e.clientY)}
				/>
			{/if}
		{/each}
	</g>

	<!-- Spotlight annotation -->
	{#if showSpot && spot}
		<g class="spotlight" style:transform={`translate(${spot.x}px, ${spot.y}px)`}>
			<circle class="halo" r={spot.r + 7} />
		</g>
		<text
			class="spot-label"
			x={spot.x + spot.r + 12}
			y={spot.y - spot.r - 6}
		>
			mostly free elsewhere →
		</text>
	{/if}

	<!-- Draggable cost-per-use cut line -->
	{#if cutActive}
		<g class="cut" transform={`translate(0,${cutY})`}>
			<line class="cut-line" x1={plot.left} x2={plot.left + plot.innerW} y1="0" y2="0" />
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<line
				class="cut-hit"
				x1={plot.left}
				x2={plot.left + plot.innerW}
				y1="0"
				y2="0"
				onpointerdown={startDrag}
				onpointermove={moveDrag}
				onpointerup={endDrag}
			/>
			<g class="cut-handle" transform={`translate(${plot.left + plot.innerW},0)`}>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<rect
					x="-58"
					y="-11"
					width="58"
					height="22"
					rx="4"
					onpointerdown={startDrag}
					onpointermove={moveDrag}
					onpointerup={endDrag}
				/>
				<text x="-29" dy="0.32em" text-anchor="middle">cancel ▲</text>
			</g>
		</g>
	{/if}
</svg>

<style>
	svg {
		display: block;
		overflow: visible;
		font-family: Helvetica, Arial, sans-serif;
	}

	.dot {
		fill: var(--kept, #1668b3);
		fill-opacity: 0.62;
		stroke: #fff;
		stroke-width: 0.5;
		transition:
			transform 800ms cubic-bezier(0.4, 0, 0.2, 1),
			r 800ms cubic-bezier(0.4, 0, 0.2, 1),
			fill 400ms ease,
			fill-opacity 400ms ease;
	}
	/* Redundant encoding for canceled (never rely on green/red hue alone): a
	   distinct fill AND a dashed hollow-ish look via lower opacity + stroke. */
	.dot.canceled {
		fill: var(--cut, #c0392b);
		fill-opacity: 0.28;
		stroke: var(--cut, #c0392b);
		stroke-width: 1;
		stroke-dasharray: 2 1.5;
	}
	.dot.spot {
		fill: var(--cut, #c0392b);
		fill-opacity: 0.9;
		stroke: #000;
		stroke-width: 1;
	}

	.spotlight .halo {
		fill: none;
		stroke: #000;
		stroke-width: 1.5;
		transition: transform 800ms cubic-bezier(0.4, 0, 0.2, 1);
	}
	.spot-label {
		font-size: 12px;
		font-weight: 700;
		fill: #000;
		paint-order: stroke;
		stroke: #fff;
		stroke-width: 3;
	}

	.axis line {
		stroke: #ccc;
	}
	.axis .tick {
		stroke: #999;
	}
	.axis text {
		font-size: 11px;
		fill: #666;
	}
	.axis text.rot {
		font-size: 10px;
	}
	.axis-label {
		font-size: 12px;
		font-weight: 600;
		fill: #333;
	}

	.cut-zone {
		fill: #c0392b;
		fill-opacity: 0.06;
		transition: height 300ms ease;
	}
	.cut-line {
		stroke: #c0392b;
		stroke-width: 2;
		stroke-dasharray: 6 4;
	}
	.cut-hit {
		stroke: transparent;
		stroke-width: 16;
		cursor: ns-resize;
	}
	.cut-handle rect {
		fill: #c0392b;
		cursor: ns-resize;
	}
	.cut-handle text {
		fill: #fff;
		font-size: 11px;
		font-weight: 700;
		pointer-events: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.dot,
		.spotlight .halo,
		.cut-zone {
			transition: none;
		}
	}
</style>
