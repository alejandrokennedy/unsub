<script lang="ts">
	import { onMount } from "svelte";
	import unsubRaw from "$data/unsubRaw.csv";
	import type { UnsubRow } from "$data/unsub";
	import * as d3 from "d3";
	import { Plot, Dot, Line, AreaY, BoxX } from "svelteplot";

	// svelteplot sizes its charts from the measured container width, which only
	// exists in the browser. Rendering during SSR produces NaN coordinates (and
	// a flood of SVG attribute errors on hydration), so gate the charts until
	// after mount.
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});

	const unsub: UnsubRow[] = unsubRaw.map((d) => {
		const row = d3.autoType({ ...d }) as unknown as UnsubRow;
		// Keep subscribed as its raw four-state value; autoType would coerce the
		// blank state to null and is case-sensitive about "true"/"false".
		return { ...row, subscribed: d.subscribed as UnsubRow["subscribed"] };
	});
	let height = $state(280);

	// Shared colour scale for the four `subscribed` states, so the encoding is
	// consistent across charts (blank/unknown rendered grey).
	const subscribedColor = {
		legend: true,
		domain: ["TRUE", "MAYBE", "FALSE", ""],
		range: ["#2e7d32", "#f9a825", "#c62828", "#bdbdbd"]
	};

	const subjectOrder = d3.groupSort(
		unsub,
		(group) => -d3.mean(group, (d) => d.subscription_cost),
		(d) => d.subject
	);

	const subjectOrderUsage = d3.groupSort(
		unsub,
		(group) => -d3.mean(group, (d) => d.usage),
		(d) => d.subject
	);

	const subjectOrderCpu = d3.groupSort(
		unsub,
		(group) => -d3.mean(group, (d) => d.cpu),
		(d) => d.subject
	);

	// Cancellation savings curve: cancel journals worst-cost-per-use first and
	// track the cumulative subscription spend recovered as you cut deeper.
	const cancelCurve = (() => {
		const worstFirst = [...unsub].sort((a, b) => d3.descending(a.cpu, b.cpu));
		let cumulative = 0;
		return worstFirst.map((d, i) => {
			cumulative += d.subscription_cost;
			return { journalsCancelled: i + 1, cumulativeSavings: cumulative };
		});
	})();

	// Two points defining the break-even diagonal (ill_cost === subscription_cost).
	const costMax =
		d3.max(unsub, (d) => Math.max(d.subscription_cost, d.ill_cost)) ?? 0;
	const breakEven = [{ v: 0 }, { v: costMax }];
	console.log("unsub", unsub);
</script>

<div class="layout-container">
	<!-- bind:clientWidth={chartWidth}
		bind:clientHeight={chartHeight} -->
	<div class="chart-container">
		{#if mounted && unsub?.length}
			<h1>Unsub Story Analysis</h1>

			<Plot {height} title="Subscription cost distribution" x={{ zero: true }}>
				<Dot data={unsub} x="subscription_cost" y={0} fill dodgeY="bottom" />
			</Plot>

			<Plot
				{height}
				title="Subscription cost distribution (sized by usage)"
				x={{ zero: true }}
			>
				<Dot
					data={unsub}
					x="subscription_cost"
					r="usage"
					y={0}
					fill
					dodgeY="bottom"
				/>
			</Plot>

			<Plot
				{height}
				title="Subscription (-ILL) cost distribution (sized by usage)"
				x={{ zero: true }}
			>
				<Dot
					data={unsub}
					x="subscription_minus_ill_cost"
					r="usage"
					y={0}
					fill
					dodgeY="bottom"
				/>
			</Plot>

			<Plot
				height={height * 2.5}
				title="Usage vs. subscription (-ILL) cost. Sized by usage. (Dual encoded❗️)"
				y={{ zero: true }}
				x={{ zero: true }}
			>
				<Dot
					data={unsub}
					x="subscription_minus_ill_cost"
					r="cpu"
					y="usage"
					fill
					opacity="0.7"
				/>
			</Plot>

			<Plot
				height={height * 2.5}
				title="CPU vs. subscription (-ILL) cost. Sized by usage"
				y={{ zero: true }}
				x={{ zero: true }}
				color={{ legend: true }}
			>
				<!-- r="cpu" -->
				<Dot
					data={unsub}
					y="cpu"
					x="subscription_minus_ill_cost"
					r="usage"
					fill
					opacity="0.7"
				/>
			</Plot>
			<!-- fill="free_instant_usage_percent" -->

			<Plot
				height={height * 2.5}
				title="CPU vs. subscription (-ILL) cost. Sized by usage, colored by free instant usage %"
				y={{ zero: true }}
				x={{ zero: true }}
				color={{ legend: true, scheme: "turbo" }}
			>
				<Dot
					data={unsub}
					y="cpu"
					x="subscription_minus_ill_cost"
					r="usage"
					fill="free_instant_usage_percent"
					opacity="0.7"
				/>
			</Plot>

			<Plot
				height={height * 4}
				title="Subscription (-ILL) cost by subject (sized by cpu)"
				x={{ grid: true, zero: true }}
				fy={{ domain: subjectOrder }}
				frame="true"
			>
				<Dot
					data={unsub}
					x="subscription_minus_ill_cost"
					r="cpu"
					y={0}
					fill="free_instant_usage_percent"
					dodgeY="bottom"
					fy="subject"
				/>
			</Plot>

			<Plot
				height={height * 12}
				frame
				title="Usage by subject (sized by subscription cost)"
				x={{ grid: true }}
				fy={{ domain: subjectOrderUsage }}
			>
				<Dot
					data={unsub}
					x="usage"
					r="subscription_cost"
					y={0}
					fill
					dodgeY="middle"
					fy="subject"
				/>
			</Plot>
			<Plot
				height={height * 18}
				frame
				title="CPU by subject (sized by subscription cost)"
				x={{ grid: true }}
				fy={{ domain: subjectOrderCpu }}
			>
				<Dot
					data={unsub}
					x="cpu"
					r="subscription_cost"
					y={0}
					fill
					dodgeY="middle"
					fy="subject"
				/>
			</Plot>
			<Plot
				height={height * 2.5}
				frame
				grid
				color={{ legend: true }}
				title="CPU by usage (sized by subscription cost)"
			>
				<Dot
					data={unsub}
					x="cpu"
					y="usage"
					r="subscription_cost"
					fill="free_instant_usage_percent"
					opacity={0.4}
				/>
			</Plot>

			<!-- 1. Value for money: expensive-but-unused journals sit lower-right. -->
			<!-- r={{ legend: true }} -->
			<Plot
				height={height * 2.5}
				frame
				grid
				color={{ type: "symlog", legend: true, label: "Cost per use ($)" }}
				y={{ type: "symlog", label: "Usage ↑" }}
				x={{ type: "symlog", label: "→ Subscription cost ($)" }}
				title="Value for money: usage vs subscription cost"
				subtitle="Lower-right (high cost, low usage) are prime cancellation candidates"
			>
				<Dot
					data={unsub}
					x="subscription_minus_ill_cost"
					y="usage"
					r="free_instant_usage_percent"
					fill="cpu"
					opacity={0.9}
				/>
			</Plot>

			<!-- 2. Cancel economics: anything below the diagonal is cheaper via ILL. -->
			<Plot
				height={height * 2.5}
				frame
				grid
				color={subscribedColor}
				x={{ type: "symlog", label: "Subscription cost ($) →" }}
				y={{ type: "symlog", label: "↑ ILL fallback cost ($)" }}
				title="Cancel economics: subscription cost vs ILL fallback"
				subtitle="Below the diagonal, ILL costs less than subscribing — cancelling saves money"
			>
				<Line
					data={breakEven}
					x="v"
					y="v"
					stroke="#999"
					strokeDasharray="5,4"
				/>
				<Dot
					data={unsub}
					x="subscription_cost"
					y="ill_cost"
					fill="subscribed"
					opacity={0.5}
				/>
			</Plot>

			<!-- 3. Savings curve: cancel worst cost-per-use first, recover spend. -->
			<Plot
				height={height * 2.5}
				frame
				grid
				x={{ label: "Journals cancelled (worst cost-per-use first) →" }}
				y={{ label: "↑ Cumulative annual cost recovered ($)" }}
				title="Cancellation savings curve"
				subtitle="How much subscription spend is recovered as you cut the least cost-effective journals"
			>
				<AreaY
					data={cancelCurve}
					x="journalsCancelled"
					y="cumulativeSavings"
					fillOpacity={0.15}
				/>
				<Line data={cancelCurve} x="journalsCancelled" y="cumulativeSavings" />
			</Plot>

			<!-- 4. Free access vs cost: high & right = pay a lot, keep most for free. -->
			<Plot
				height={height * 2.5}
				frame
				grid
				color={{ legend: true }}
				x={{ label: "Free instant access retained if cancelled (%) →" }}
				y={{ type: "symlog", label: "↑ Subscription cost ($)" }}
				title="Free access vs cost: what you keep if you cancel"
				subtitle="Right = most demand still met free (size = usage); upper-right = pay a lot for access you'd largely keep"
			>
				<Dot
					data={unsub}
					x="free_instant_usage_percent"
					y="subscription_cost"
					r="usage"
					fill="subscribed"
					opacity={0.5}
				/>
			</Plot>

			<!-- 5. Cost-per-use spread by discipline. -->
			<Plot
				height={height * 6}
				frame
				marginLeft={150}
				x={{ type: "symlog", grid: true, label: "Cost per use ($, symlog) →" }}
				y={{ domain: subjectOrderCpu }}
				title="Cost-per-use spread by subject"
				subtitle="Median and range of cost-per-use within each discipline"
			>
				<!-- BoxX types `data` as a generic record (no index signature on
				UnsubRow), so assert to a structurally-compatible row type here. -->
				<BoxX
					data={unsub as unknown as Record<
						string | symbol,
						string | number | boolean
					>[]}
					x="cpu"
					y="subject"
				/>
			</Plot>

			<!-- 6. Faceted scatter: cost vs usage across subject × subscription status.
			The first (non-faceted) Dot repeats the whole dataset faintly in every
			cell as context, like the penguins example. -->
			<Plot
				frame
				grid
				inset={10}
				height={height * 8}
				marginTop={35}
				marginBottom={40}
				marginRight={130}
				x={{ type: "symlog", label: "Subscription cost ($) →" }}
				y={{ type: "symlog", label: "↑ Usage" }}
				fy={{ domain: subjectOrder }}
				color={subscribedColor}
				title="Cost vs usage, faceted by subject and subscription status"
				subtitle="Grey points repeat the full dataset in each cell for context"
			>
				<Dot
					data={unsub}
					x="subscription_cost"
					y="usage"
					r={2}
					opacity={0.1}
					canvas
				/>
				<Dot
					data={unsub}
					x="subscription_cost"
					y="usage"
					fx="subscribed"
					fy="subject"
					fill="subscribed"
					r={3}
					canvas
				/>
			</Plot>
		{/if}
	</div>
</div>

<style>
	.chart-container {
		width: 92%;
		/*height: 96%;*/
		margin: 0 auto;
		font-family: Helvetica, Arial, sans-serif;
	}
</style>
