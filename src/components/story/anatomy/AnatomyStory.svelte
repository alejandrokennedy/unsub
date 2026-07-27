<script>
	/**
	 * "Anatomy of a Big Deal" — S1 scrollytelling prototype.
	 * A single scatter of 306 journals morphs through 7 steps (cost → usage → net
	 * cost → cost-vs-value → cost-per-use → the cut → payoff). The parent owns all
	 * state; child components are declarative. Desktop-first.
	 */
	import * as d3 from "d3";
	import { footerState } from "$utils/footerState.svelte";
	import ScrolloSteps from "$components/helpers/ScrolloSteps.svelte";
	import Tooltip from "$components/helpers/tooltip/Tooltip.svelte";
	import HeroScatter from "./HeroScatter.svelte";
	import FieldStrip from "./FieldStrip.svelte";
	import SavingsMeter from "./SavingsMeter.svelte";
	import { chapters } from "./chapters.js";
	import {
		journals,
		domains,
		usageTotal,
		bundleCost,
		defaultCutCpu,
		spotlightId,
		dodge,
		fmtMoney,
		fmtPct,
		fmtInt
	} from "./util.js";

	let { darkMode = false } = $props();

	// ── sticky-frame sizing (mirrors story/story.svelte) ──────────────────────
	const HEADER_H = { mobile: 48, desktop: 65 };
	const FOOTER_H = 54.6;
	const MOBILE_BREAKPOINT = 768;
	let frameW = $state(1024);
	let frameH = $state(800);
	let isMobile = $derived(frameW <= MOBILE_BREAKPOINT);
	let headerH = $derived(isMobile ? HEADER_H.mobile : HEADER_H.desktop);
	let footerH = $derived(footerState.visible ? FOOTER_H : 0);

	// ── step + encoding config ────────────────────────────────────────────────
	// x/y are field keys (null y = 1-D beeswarm); r is the radius field.
	// r can be a field key ("cost"/"usage") or a fixed number (equal-size dots).
	const USAGE_STRIPS = ["free", "downloads", "citations", "authorships"];
	const STEPS = [
		{ x: "cost", y: null, r: 4.5, cancel: false, spot: false, strips: [] },
		{ x: "cost", y: null, r: "usage", cancel: false, spot: false, strips: [] },
		{ x: "net", y: null, r: "usage", cancel: false, spot: false, strips: [] },
		{ x: "net", y: "usage", r: "usage", cancel: false, spot: false, strips: [] },
		{ x: "net", y: "cpu", r: "usage", cancel: false, spot: true, strips: ["free"] },
		{ x: "net", y: "cpu", r: "usage", cancel: true, spot: false, strips: USAGE_STRIPS },
		{ x: "net", y: "cpu", r: "usage", cancel: true, spot: false, strips: USAGE_STRIPS },
		{ x: "subject", y: "cpu", r: "usage", cancel: true, spot: false, strips: [] }
	];
	const LABELS = {
		cost: "Subscription cost",
		net: "Net cost (after interlibrary loan)",
		usage: "Usage (downloads + citations + authorships)",
		cpu: "Cost per use"
	};

	// Complementary strips. `side` sets which end is the cancelable one: "upper"
	// (free — cut titles that are ≥X% free anyway) vs "lower" (usage components —
	// only cut titles with ≤X downloads/citations/papers).
	const STRIP_DEFS = {
		free: { label: "Free elsewhere (open access + back file)", unit: "%", side: "upper" },
		downloads: { label: "Downloads", unit: "", side: "lower" },
		citations: { label: "Citations", unit: "", side: "lower" },
		authorships: { label: "Papers published here", unit: "", side: "lower" }
	};

	let step = $state(null);
	const cfg = $derived(STEPS[step ?? 0]);

	// ── selection state ───────────────────────────────────────────────────────
	const CUT_DEFAULT = defaultCutCpu(0.05);
	let cutCpu = $state(CUT_DEFAULT);
	let cutTouched = $state(false);
	// Per-field intersective thresholds; null = inactive.
	let filters = $state({ free: null, downloads: null, citations: null, authorships: null });
	const SPOT_ID = spotlightId();

	const filtersActive = $derived(Object.values(filters).some((v) => v != null));

	function reset() {
		cutCpu = CUT_DEFAULT;
		cutTouched = false;
		filters = { free: null, downloads: null, citations: null, authorships: null };
	}
	function setFilter(field, v) {
		const { side } = STRIP_DEFS[field];
		const [lo, hi] = domains[field];
		// Snap back to inactive when dragged to the "select nothing" edge.
		if (side === "upper") filters[field] = v <= lo ? null : Math.min(hi, v);
		else filters[field] = v >= hi ? null : Math.max(lo, v);
	}

	// ── static radius scales (dimension-independent) ──────────────────────────
	const rUsage = d3.scaleSqrt().domain([0, domains.usage[1]]).range([2.5, 24]);
	const rCost = d3.scaleSqrt().domain([0, domains.cost[1]]).range([2.5, 24]);

	// Subjects ordered by descending median cost-per-use (for the final "by field"
	// step, so the expensive disciplines land nearest the cut).
	const SUBJECT_ORDER = d3
		.rollups(journals, (v) => d3.median(v, (d) => d.cpu), (d) => d.subject)
		.sort((a, b) => d3.descending(a[1], b[1]))
		.map((d) => d[0]);
	function hashUnit(id) {
		let h = 2166136261;
		for (let i = 0; i < id.length; i++) {
			h ^= id.charCodeAt(i);
			h = Math.imul(h, 16777619);
		}
		return (((h >>> 0) % 1000) / 1000) * 2 - 1; // deterministic [-1, 1]
	}

	// ── hero geometry ─────────────────────────────────────────────────────────
	const M = { top: 30, right: 40, bottom: 42, left: 70 };
	let heroW = $state(0);
	let heroH = $state(0);
	const ready = $derived(heroW > 40 && heroH > 40);

	function scaleFor(field, range) {
		return field === "cpu"
			? d3.scaleSymlog().domain(domains.cpu).constant(1).range(range)
			: d3.scaleLinear().domain(domains[field]).range(range);
	}
	function fmtTick(field, v) {
		if (field === "cost" || field === "net")
			return v >= 1000 ? `$${d3.format("~s")(v)}` : `$${v}`;
		return d3.format("~s")(v);
	}

	// Everything positional derives here so a step change recomputes once.
	const layout = $derived.by(() => {
		if (!ready) return null;
		const c = cfg;
		const categorical = c.x === "subject";
		// Rotated subject labels need a deeper bottom margin.
		const mb = categorical ? 116 : M.bottom;
		const iW = heroW - M.left - M.right;
		const iH = heroH - M.top - mb;
		const xb = categorical
			? d3.scalePoint().domain(SUBJECT_ORDER).range([0, iW]).padding(0.6)
			: null;
		const sx = categorical ? null : scaleFor(c.x, [0, iW]);
		const sy = c.y == null ? null : scaleFor(c.y, [iH, 0]);
		const rGet = (d) =>
			typeof c.r === "number" ? c.r : c.r === "cost" ? rCost(d.cost) : rUsage(d.usage);

		const positions = new Map();
		if (categorical) {
			// Jittered strip per subject; keep CPU on y.
			const amp = Math.min(26, (xb.step() || 40) * 0.42);
			journals.forEach((d) =>
				positions.set(d.id, {
					x: M.left + (xb(d.subject) ?? iW / 2) + hashUnit(d.id) * amp,
					y: M.top + sy(d.cpu),
					r: rGet(d)
				})
			);
		} else if (sy == null) {
			const items = journals.map((d) => ({ x: sx(d[c.x]), r: rGet(d) }));
			const ys = dodge(items, 1.4);
			const cy = M.top + iH / 2;
			journals.forEach((d, i) =>
				positions.set(d.id, {
					x: M.left + items[i].x,
					y: cy + ys[i],
					r: items[i].r
				})
			);
		} else {
			journals.forEach((d) =>
				positions.set(d.id, {
					x: M.left + sx(d[c.x]),
					y: M.top + sy(d[c.y]),
					r: rGet(d)
				})
			);
		}

		const xAxis = categorical
			? {
					label: "",
					rotate: true,
					ticks: SUBJECT_ORDER.map((s) => ({ v: s, x: M.left + xb(s), label: s }))
				}
			: {
					label: LABELS[c.x],
					rotate: false,
					ticks: sx
						.ticks(6)
						.map((v) => ({ v, x: M.left + sx(v), label: fmtTick(c.x, v) }))
				};
		const yAxis = sy
			? {
					label: LABELS[c.y],
					ticks: sy
						.ticks(6)
						.map((v) => ({ v, y: M.top + sy(v), label: fmtTick(c.y, v) }))
				}
			: null;

		const plot = { left: M.left, top: M.top, innerW: iW, innerH: iH };
		const cutY = c.cancel && sy && c.y === "cpu" ? M.top + sy(cutCpu) : M.top;
		const cpuFromY =
			sy && c.y === "cpu" ? (py) => sy.invert(py - M.top) : () => cutCpu;
		return { positions, xAxis, yAxis, plot, cutY, cpuFromY };
	});

	function onCutDrag(py) {
		const cpu = layout?.cpuFromY(py);
		if (cpu == null || Number.isNaN(cpu)) return;
		cutCpu = Math.max(domains.cpu[0], Math.min(domains.cpu[1], cpu));
		cutTouched = true;
	}

	// ── canceled set + payoff ─────────────────────────────────────────────────
	const canceled = $derived.by(() => {
		const s = new Set();
		if (!cfg.cancel) return s;
		const active = Object.entries(filters).filter(([, v]) => v != null);
		for (const d of journals) {
			if (d.cpu < cutCpu) continue;
			const passes = active.every(([field, v]) =>
				STRIP_DEFS[field].side === "upper" ? d[field] >= v : d[field] <= v
			);
			if (passes) s.add(d.id);
		}
		return s;
	});
	const savings = $derived(
		journals.reduce((sum, d) => sum + (canceled.has(d.id) ? d.net : 0), 0)
	);
	const demandRetained = $derived(
		1 -
			journals.reduce((sum, d) => sum + (canceled.has(d.id) ? d.usage : 0), 0) /
				usageTotal
	);

	// ── tooltip ───────────────────────────────────────────────────────────────
	let hover = $state(null); // { d, x, y }
	function onhover(d, x, y) {
		hover = d ? { d, x, y } : null;
	}
</script>

<div class="scrollo-story" class:scrollo-dark={darkMode}>
	<div
		id="background"
		bind:clientHeight={frameH}
		bind:clientWidth={frameW}
		style:height={`calc(100vh - ${headerH}px - ${footerH}px)`}
		style:top={`${headerH}px`}
	>
		<div class="layout-container">
			<div class="dash">
				<div class="hero" bind:clientWidth={heroW} bind:clientHeight={heroH}>
					{#if ready && layout}
						<HeroScatter
							{journals}
							positions={layout.positions}
							{canceled}
							width={heroW}
							height={heroH}
							plot={layout.plot}
							xAxis={layout.xAxis}
							yAxis={layout.yAxis}
							spotId={SPOT_ID}
							showSpot={cfg.spot}
							cutActive={cfg.cancel}
							cutY={layout.cutY}
							{onCutDrag}
							{onhover}
						/>
					{/if}
				</div>

				<aside class="rail">
					<SavingsMeter
						{savings}
						{demandRetained}
						{bundleCost}
						canceledCount={canceled.size}
						started={cfg.cancel}
					/>
					{#if cfg.strips.length}
						<div class="strips">
							{#each cfg.strips as field (field)}
								<FieldStrip
									{journals}
									{field}
									label={STRIP_DEFS[field].label}
									unit={STRIP_DEFS[field].unit}
									domain={domains[field]}
									value={filters[field]}
									selectSide={STRIP_DEFS[field].side}
									{canceled}
									height={62}
									onchange={(v) => setFilter(field, v)}
								/>
							{/each}
							<p class="hint">
								{cfg.cancel
									? "Drag any handle to refine which titles get cut."
									: "Complementary views — some pricey titles are mostly free anyway."}
							</p>
						</div>
					{/if}
					{#if cutTouched || filtersActive}
						<button class="reset" onclick={reset}
							>↺ Reset to story defaults</button
						>
					{/if}
				</aside>
			</div>
		</div>
	</div>

	<ScrolloSteps
		bind:step
		{chapters}
		--scrollo-foreground-width="34vw"
		--scrollo-foreground-max-width="30rem"
		--scrollo-foreground-margin-inline="3vw auto"
		--scrollo-step-width="32vw"
		--scrollo-text-width="100%"
		--scrollo-text-max-width="30rem"
	/>
</div>

{#if hover}
	<Tooltip
		x={hover.x}
		y={hover.y}
		target=".scrollo-story"
		align="center"
		side="top"
	>
		<div class="tt">
			<div class="tt-title">{hover.d.title}</div>
			<div class="tt-sub">{hover.d.subject} · {hover.d.publisher}</div>
			<dl class="tt-grid">
				<dt>Cost</dt>
				<dd>{fmtMoney(hover.d.cost)}</dd>
				<dt>Net (after ILL)</dt>
				<dd>{fmtMoney(hover.d.net)}</dd>
				<dt>Cost per use</dt>
				<dd>
					${hover.d.cpu < 10 ? hover.d.cpu.toFixed(2) : Math.round(hover.d.cpu)}
				</dd>
				<dt>Usage</dt>
				<dd>{fmtInt(hover.d.usage)}</dd>
				<dt>Free elsewhere</dt>
				<dd>{fmtPct(hover.d.free)}</dd>
			</dl>
			<div class="tt-break">
				{fmtInt(hover.d.downloads)} downloads · {fmtInt(hover.d.citations)} citations
				· {fmtInt(hover.d.authorships)} papers
			</div>
			{#if canceled.has(hover.d.id)}<div class="tt-flag">✕ canceled</div>{/if}
		</div>
	</Tooltip>
{/if}

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

	.dash {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 400px;
		gap: 10px;
		height: 100%;
		padding: 12px 24px 20px;
		box-sizing: border-box;
	}
	.hero {
		position: relative;
		min-width: 0;
		height: 100%;
	}
	.rail {
		align-self: stretch;
		display: grid;
		gap: 16px;
		align-content: start;
		padding: 4vh 0 12px;
		overflow-y: auto;
		/* sits above the sticky graphic; keeps its own pointer events */
	}
	.strips {
		display: grid;
		gap: 10px;
		background: rgba(255, 255, 255, 0.7);
		border: 1px solid #eee;
		border-radius: 8px;
		padding: 10px 12px;
	}
	.hint {
		margin: 6px 0 0;
		font-family: Helvetica, Arial, sans-serif;
		font-size: 11px;
		color: #888;
		line-height: 1.35;
	}
	.reset {
		justify-self: start;
		font-family: Helvetica, Arial, sans-serif;
		font-size: 11.5px;
		color: #555;
		background: #f4f4f4;
		border: 1px solid #ddd;
		border-radius: 6px;
		padding: 5px 10px;
		cursor: pointer;
	}
	.reset:hover {
		background: #ececec;
	}

	/* tooltip content */
	.tt {
		pointer-events: none;
		font-family: Helvetica, Arial, sans-serif;
		background: #fff;
		border: 1px solid rgba(0, 0, 0, 0.15);
		border-radius: 5px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
		padding: 9px 11px;
		max-width: 260px;
		color: #111;
	}
	.tt-title {
		font-weight: 700;
		font-size: 12.5px;
		line-height: 1.25;
	}
	.tt-sub {
		font-size: 11px;
		color: #777;
		margin: 1px 0 6px;
	}
	.tt-grid {
		display: grid;
		grid-template-columns: auto auto;
		gap: 1px 10px;
		margin: 0;
		font-size: 11.5px;
	}
	.tt-grid dt {
		color: #777;
	}
	.tt-grid dd {
		margin: 0;
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
	.tt-break {
		margin-top: 6px;
		font-size: 10.5px;
		color: #888;
	}
	.tt-flag {
		margin-top: 5px;
		font-size: 11px;
		font-weight: 700;
		color: #c0392b;
	}

	@media (max-width: 900px) {
		.dash {
			grid-template-columns: 1fr;
		}
	}
</style>
