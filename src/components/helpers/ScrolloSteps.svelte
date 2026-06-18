<script lang="ts">
	/**
	 * ScrolloSteps - Reusable scrollytelling steps with default styling
	 *
	 * @example
	 * <ScrolloSteps
	 *   bind:step
	 *   bind:stepProgress
	 *   chapters={[{ text: "Step 1..." }, { text: "Step 2..." }]}
	 *   top="75vh"
		   smoothIntro={true} // defaults to false
	 * />
	 */

	import Scrollo from "./Scrollo.svelte";

	interface Props {
		step?: number | null | undefined;
		stepProgress?: number | null | undefined;
		chapters: Array<{ text: string }>;
		top?: number | string;
		smoothIntro?: boolean;
	}

	let {
		step = $bindable(),
		stepProgress = $bindable(),
		chapters,
		top = "75vh",
		smoothIntro = false
	}: Props = $props();
</script>

<div id="foreground">
	<Scrollo bind:value={step} bind:stepProgress {top} {smoothIntro}>
		{#each chapters as { text }, i}
			{@const activeStep = step === i}
			<div class="step" class:activeStep>
				<p>{@html text}</p>
				<!-- <p>{text}</p> -->
			</div>
		{/each}
	</Scrollo>
</div>

<style>
	/* ============================================
	   STRUCTURAL STYLES (Component Mechanics)
	   ============================================ */

	/* Foreground container - structural positioning */
	#foreground {
		position: relative;
		pointer-events: none;
		z-index: var(--scrollo-foreground-z, 1);
		width: var(--scrollo-foreground-width, 40vw);
		max-width: var(--scrollo-foreground-max-width, 40rem);
		/* Set to "auto" to center the column horizontally (matches mobile look) */
		margin-inline: var(--scrollo-foreground-margin-inline, 0);
	}

	/* Step container - scroll timing & layout */
	.step {
		margin: 0 auto;
		width: var(--scrollo-step-width, 38vw);
		padding-top: var(--scrollo-step-padding-top, 0vh);
		padding-bottom: var(--scrollo-step-padding-bottom, 60vh);
	}

	/* Step text container - mechanical necessities */
	.step p {
		pointer-events: auto;
		transition:
			background var(--scrollo-transition-duration, 300ms) ease,
			opacity var(--scrollo-transition-duration, 300ms) ease;
	}

	/* ============================================
	   PRESENTATION STYLES (Customize per project)
	   ============================================ */

	/* Foreground alignment */
	#foreground {
		text-align: var(--scrollo-foreground-align, center);
	}

	/* Step text - inactive state (light mode default) */
	.step p {
		padding: var(--scrollo-text-padding, 1rem);
		background: var(--scrollo-text-bg, whitesmoke);
		color: var(--scrollo-text-color, #aaa);
		opacity: var(--scrollo-text-opacity, 0.4);
		border-radius: var(--scrollo-text-radius, 5px);
		box-shadow: var(--scrollo-text-shadow, 1px 1px 10px rgba(0, 0, 0, 0.2));
		text-align: var(--scrollo-text-align, left);
		width: var(--scrollo-text-width, 75%);
		margin: auto;
		max-width: var(--scrollo-text-max-width, 500px);
	}

	/* Step text - active state (light mode default) */
	.step.activeStep p {
		background: var(--scrollo-text-bg-activeStep, white);
		color: var(--scrollo-text-color-activeStep, black);
		opacity: var(--scrollo-text-opacity-activeStep, 0.94);
	}

	/* Dark mode overrides - when inside .scrollo-dark */
	:global(.scrollo-dark) .step p {
		background: var(--scrollo-text-bg-dark, rgba(20, 20, 20, 0.9));
		color: var(--scrollo-text-color-dark, #555);
		box-shadow: var(
			--scrollo-text-shadow-dark,
			1px 1px 10px rgba(0, 0, 0, 0.5)
		);
	}

	:global(.scrollo-dark) .step.activeStep p {
		background: var(--scrollo-text-bg-activeStep-dark, rgba(45, 45, 45, 0.95));
		color: var(--scrollo-text-color-activeStep-dark, white);
	}

	/* Nested paragraph spacing (for multi-paragraph steps) */
	.step p :global(p) {
		margin-top: var(--scrollo-nested-p-margin-top, 0.4rem);
		margin-bottom: var(--scrollo-nested-p-margin-bottom, 16px);
	}

	.step p :global(p:last-child) {
		margin-bottom: var(--scrollo-nested-p-margin-bottom-last, 0.4rem);
	}

	/* Chapter links styling */
	:global(.chapter-link) {
		color: var(--scrollo-link-color, rgb(4, 109, 190));
		text-decoration: underline;
	}

	:global(.chapter-link:hover) {
		text-decoration: none;
	}

	/* ============================================
	   RESPONSIVE STYLES
	   ============================================ */

	@media screen and (max-width: 768px) {
		/* Structural - mobile layout */
		#foreground {
			width: var(--scrollo-foreground-width-mobile, 100%);
			max-width: var(--scrollo-foreground-max-width-mobile, 50rem);
		}

		.step {
			/*padding-top: var(--scrollo-step-padding-top-mobile, 35vh);*/
			/*padding-bottom: var(--scrollo-step-padding-bottom-mobile, 45vh);*/
			width: var(--scrollo-step-width-mobile, 100%);
			max-width: var(--scrollo-step-max-width-mobile, 100%);
		}

		/* Presentation - mobile text styling */
		.step p {
			padding: var(--scrollo-text-padding-mobile, 0.1rem 1rem);
			overflow: auto;
		}

		/* Mobile active state (includes text-stroke effect) */
		.step.activeStep p {
			background: var(
				--scrollo-text-bg-activeStep-mobile,
				rgba(255, 255, 255, 0.75)
			);
			backdrop-filter: var(--scrollo-text-backdrop-filter-mobile, blur(2.5px));
			-webkit-backdrop-filter: var(
				--scrollo-text-backdrop-filter-mobile,
				blur(2.5px)
			);

			/* Text outline using text-shadow */
			--stroke-width: var(--scrollo-text-stroke-width, 2px);
			--stroke-width-n: calc(var(--stroke-width) * -1);
			text-shadow: var(
				--scrollo-text-stroke-shadow,
				var(--stroke-width-n) var(--stroke-width-n) 0 white,
				0 var(--stroke-width-n) 0 white,
				var(--stroke-width) var(--stroke-width-n) 0 white,
				var(--stroke-width) 0 0 white,
				var(--stroke-width) var(--stroke-width) 0 white,
				0 var(--stroke-width) 0 white,
				var(--stroke-width-n) var(--stroke-width) 0 white,
				var(--stroke-width-n) 0 0 white
			);
		}

		/* TODO: Dark mode mobile overrides - uncomment and customize when needed */
		/* :global(.scrollo-dark) .step.activeStep p {
			background: var(--scrollo-text-bg-activeStep-mobile-dark, rgba(45, 45, 45, 0.95));
			text-shadow: var(--scrollo-text-stroke-shadow-dark, none);
		} */
	}

	/* ============================================
	   QUESTIONABLE / REVIEW NEEDED
	   ============================================ */

	/* TODO: Review - Is position: relative needed on .step? */
	/*.step {
		position: relative;
	}*/

	/* TODO: Review - Unused class, kept for reference */
	/* Example glassmorphism effect - apply to .step.activeStep p if desired */
	/*
	.use-this-for-blur-effect {
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		color: black;
	}
	*/

	/* TODO: Review - Span styling, currently commented out in markup */
	/*
	.step p :global(span) {
		padding: 0.1rem;
		border-radius: 3px;
		font-weight: 600;
		letter-spacing: 0.5px;
	}
	*/

	/* ============================================
	   STYLE PRESETS
	   ============================================

	   Copy these CSS variable sets to quickly apply different looks:

	   === PRESET 1: Plastics Treaty (Default) ===
	   Already applied as defaults above!

	   === PRESET 2: Glassmorphism ===
	   <ScrolloForeground
	     {chapters}
	     --scrollo-text-bg="rgba(255, 255, 255, 0.8)"
	     --scrollo-text-bg-activeStep="rgba(255, 255, 255, 0.9)"
	     --scrollo-text-backdrop-filter="blur(8px)"
	     --scrollo-text-color="black"
	     --scrollo-text-opacity="0.9"
	     --scrollo-text-shadow="0 2px 10px rgba(0, 0, 0, 0.1)"
	   />

	   === PRESET 3: Minimal/Clean ===
	   <ScrolloForeground
	     {chapters}
	     --scrollo-text-bg="transparent"
	     --scrollo-text-color="#333"
	     --scrollo-text-opacity="1"
	     --scrollo-text-shadow="none"
	     --scrollo-text-border="1px solid #ddd"
	     --scrollo-text-bg-activeStep="#f8f8f8"
	     --scrollo-text-color-activeStep="#000"
	   />

	   === PRESET 4: High Contrast ===
	   <ScrolloForeground
	     {chapters}
	     --scrollo-text-bg="#1a1a1a"
	     --scrollo-text-color="#999"
	     --scrollo-text-opacity="0.6"
	     --scrollo-text-bg-activeStep="#000"
	     --scrollo-text-color-activeStep="#fff"
	     --scrollo-text-opacity-activeStep="1"
	     --scrollo-text-shadow="0 2px 20px rgba(0, 0, 0, 0.8)"
	   />

	   === PRESET 5: No Mobile Text Stroke ===
	   <ScrolloForeground
	     {chapters}
	     --scrollo-text-stroke-shadow="none"
	     --scrollo-text-bg-activeStep-mobile="rgba(255, 255, 255, 0.95)"
	   />

	   === DARK MODE (Auto-applied inside .scrollo-dark) ===
	   Dark mode is automatically applied when ScrolloSteps is used inside an element with class="scrollo-dark".
	   Default dark mode values:
	   - Inactive: rgba(40, 40, 40, 0.9) background, #888 text
	   - Active: rgba(20, 20, 20, 0.95) background, white text
	   - Mobile: Black text stroke instead of white

	   To customize dark mode, override these CSS variables:
	   <ScrolloSteps
	     {chapters}
	     --scrollo-text-bg-dark="rgba(30, 30, 30, 0.9)"
	     --scrollo-text-color-dark="#999"
	     --scrollo-text-shadow-dark="1px 1px 10px rgba(0, 0, 0, 0.7)"
	     --scrollo-text-bg-activeStep-dark="rgba(10, 10, 10, 0.95)"
	     --scrollo-text-color-activeStep-dark="#fff"
	     --scrollo-text-bg-activeStep-mobile-dark="rgba(20, 20, 20, 0.85)"
	     --scrollo-text-stroke-shadow-dark="custom shadow values"
	   />

	   ============================================ */
</style>
