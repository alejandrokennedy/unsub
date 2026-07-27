/**
 * Pure helpers for the "Anatomy of a Big Deal" scrollytelling prototype.
 *
 * Loads the Unsub Extender export (one row per journal), coerces the handful of
 * fields the story uses, and provides the layout math (beeswarm packing) and the
 * story defaults (where the cancellation threshold starts, which journal to
 * spotlight). Everything here is framework-agnostic so the Svelte components stay
 * declarative.
 */
import unsubRaw from "$data/unsubRaw.csv";
import * as d3 from "d3";

/** @typedef {ReturnType<typeof parse>[number]} Journal */

function parse() {
	return unsubRaw
		.map((d) => ({
			id: d.issn_l, // stable key for object constancy across morphs
			title: d.title,
			publisher: d.publisher,
			subject: d.subject,
			usage: +d.usage,
			cost: +d.subscription_cost, // raw sticker price
			ill: +d.ill_cost, // what you still pay if you cancel
			net: +d.subscription_minus_ill_cost, // cost - ill = true net price
			cpu: +d.cpu, // cost per use
			free: +d.free_instant_usage_percent, // % still fulfilled free (OA + backfile)
			downloads: +d.downloads,
			citations: +d.citations,
			authorships: +d.authorships
		}))
		// Drop rows missing the numbers the story depends on.
		.filter((d) => Number.isFinite(d.cost) && Number.isFinite(d.cpu) && Number.isFinite(d.net));
}

export const journals = parse();

// Field domains (all start at 0 so radius/position read honestly). `free` is a
// percentage, so its domain is fixed 0–100.
export const domains = {
	cost: [0, d3.max(journals, (d) => d.cost)],
	net: [0, d3.max(journals, (d) => d.net)],
	usage: [0, d3.max(journals, (d) => d.usage)],
	cpu: [0, d3.max(journals, (d) => d.cpu)],
	free: [0, 100],
	downloads: [0, d3.max(journals, (d) => d.downloads)],
	citations: [0, d3.max(journals, (d) => d.citations)],
	authorships: [0, d3.max(journals, (d) => d.authorships)]
};

export const usageTotal = d3.sum(journals, (d) => d.usage);
export const bundleCost = d3.sum(journals, (d) => d.cost);
export const bundleNet = d3.sum(journals, (d) => d.net);

/**
 * Default cancellation threshold for the "make the cut" step: cancel worst
 * cost-per-use first, but stop before campus demand drops more than
 * `maxDemandLoss` (default 5%). Return the CPU value at that journal. This ties
 * the passive-scroll story to the real punchline — big savings, ~95% of demand
 * retained (on this data: ~30 titles, ~$287K, 94.9% kept).
 */
export function defaultCutCpu(maxDemandLoss = 0.05) {
	const worstFirst = [...journals].sort((a, b) => d3.descending(a.cpu, b.cpu));
	const budget = maxDemandLoss * usageTotal;
	let lostUsage = 0;
	for (const d of worstFirst) {
		if (lostUsage + d.usage > budget) return d.cpu;
		lostUsage += d.usage;
	}
	return worstFirst.at(-1)?.cpu ?? 0;
}

/**
 * The narrative "trap" dot for step 4: expensive per use, yet mostly free
 * elsewhere — the red dot canceled in a sea of blue. Pick the high-CPU journal
 * with the most free fulfillment.
 */
export function spotlightId() {
	const cpuThresh = d3.quantile(
		journals.map((d) => d.cpu).sort(d3.ascending),
		0.6
	);
	const candidates = journals.filter((d) => d.cpu >= cpuThresh && d.net > 1500);
	const pick = d3.greatest(candidates.length ? candidates : journals, (d) => d.free);
	return pick?.id ?? null;
}

/** Cumulative savings curve (cancel worst-CPU first) for the payoff panel. */
export function cancelCurve() {
	const worstFirst = [...journals].sort((a, b) => d3.descending(a.cpu, b.cpu));
	let cumulative = 0;
	return worstFirst.map((d, i) => {
		cumulative += d.net;
		return { n: i + 1, savings: cumulative };
	});
}

/**
 * Beeswarm packing for the 1-D steps. Given each item's horizontal pixel `x` and
 * radius `r`, return a vertical offset (centered on 0) so circles don't overlap.
 * O(n²) is fine for ~300 points. Ported from the Observable dodge algorithm.
 *
 * @param {{x:number, r:number}[]} items
 * @param {number} padding
 * @returns {number[]} y-offsets, index-aligned to `items`
 */
export function dodge(items, padding = 1) {
	const order = items
		.map((d, i) => ({ i, x: d.x, r: d.r }))
		.sort((a, b) => a.x - b.x);
	const placed = [];
	const yById = new Array(items.length).fill(0);

	for (const c of order) {
		// Candidate y positions: 0, plus the tangent heights against every already
		// placed circle whose x is close enough to possibly collide.
		const candidates = [0];
		for (const p of placed) {
			const R = p.r + c.r + padding;
			const dx = p.x - c.x;
			if (Math.abs(dx) < R) {
				const dy = Math.sqrt(R * R - dx * dx);
				candidates.push(p.y + dy, p.y - dy);
			}
		}
		candidates.sort((a, b) => Math.abs(a) - Math.abs(b));

		// Pick the smallest-magnitude y with no collision.
		let chosen = 0;
		for (const y of candidates) {
			let ok = true;
			for (const p of placed) {
				const R = p.r + c.r + padding;
				const dx = p.x - c.x;
				const dyy = p.y - y;
				if (dx * dx + dyy * dyy < R * R - 1e-6) {
					ok = false;
					break;
				}
			}
			if (ok) {
				chosen = y;
				break;
			}
		}
		c.y = chosen;
		placed.push(c);
		yById[c.i] = chosen;
	}
	return yById;
}

export const fmtMoney = (n) =>
	n >= 1000 ? `$${d3.format(",.0f")(n)}` : `$${d3.format(".0f")(n)}`;
export const fmtMoneyShort = (n) => `$${d3.format(".2~s")(n).replace("G", "B")}`;
export const fmtPct = (n) => `${d3.format(".1f")(n)}%`;
export const fmtInt = (n) => d3.format(",")(Math.round(n));
