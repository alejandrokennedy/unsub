<script>
	/** Budget payoff: animated $ saved + % of campus demand retained. */
	import { Tween } from "svelte/motion";
	import { cubicOut } from "svelte/easing";
	import { fmtMoney, fmtPct } from "./util.js";

	let {
		savings = 0,
		demandRetained = 1,
		bundleCost,
		canceledCount = 0,
		started = false
	} = $props();

	const savingsT = new Tween(0, { duration: 600, easing: cubicOut });
	const demandT = new Tween(1, { duration: 600, easing: cubicOut });
	const fillT = new Tween(0, { duration: 600, easing: cubicOut });

	$effect(() => {
		savingsT.set(started ? savings : 0);
		demandT.set(started ? demandRetained : 1);
		fillT.set(started ? savings / bundleCost : 0);
	});

	const pct = $derived(fillT.current * 100);
</script>

<div class="meter" class:started>
	<div class="save">
		<div class="big">
			{fmtMoney(savingsT.current)} <span class="pct-inline">{pct.toFixed(1)}%</span>
		</div>
		<div class="cap">
			reclaimed from the bundle · {canceledCount} titles cut
		</div>
		<div class="bar">
			<div class="fill" style:width={`${Math.min(100, pct)}%`}></div>
		</div>
	</div>
	<div class="demand">
		<div class="pct">{fmtPct(demandT.current * 100)}</div>
		<div class="cap">of campus demand still met</div>
	</div>
</div>

<style>
	.meter {
		font-family: Helvetica, Arial, sans-serif;
		display: grid;
		gap: 14px;
		opacity: 0.45;
		transition: opacity 400ms ease;
	}
	.meter.started {
		opacity: 1;
	}
	.big {
		font-size: 34px;
		font-weight: 800;
		line-height: 1;
		color: #1a7a4a;
		font-variant-numeric: tabular-nums;
	}
	.pct-inline {
		font-size: 18px;
		font-weight: 700;
		color: #34a06a;
		margin-left: 4px;
	}
	.pct {
		font-size: 22px;
		font-weight: 800;
		color: #1668b3;
		font-variant-numeric: tabular-nums;
	}
	.cap {
		font-size: 11.5px;
		color: #777;
		margin-top: 3px;
	}
	.bar {
		margin-top: 7px;
		height: 8px;
		border-radius: 4px;
		background: #eee;
		overflow: hidden;
	}
	.fill {
		height: 100%;
		background: linear-gradient(90deg, #1a7a4a, #34c07a);
		border-radius: 4px;
	}
	@media (prefers-reduced-motion: reduce) {
		.meter {
			transition: none;
		}
	}
</style>
