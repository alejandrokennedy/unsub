<script>
	// Dummy copy of the real C&EN metered-paywall footer.
	// Its sole purpose is to exercise footerState.svelte.ts, which detects the
	// bar via #article-meter and wires up a click listener on
	// #article-meter .btn-close. The ids/classes below mirror the production
	// markup so that detection logic behaves identically.
	//
	// `aem` toggles which environment's wrapper this renders:
	//   - false (default): the live site — wrapper id="cen-main-metered-bar".
	//   - true: AEM preview — wrapper class="meteredbar-outer-container ..." with
	//     an id mangled by AEM's template-whitespace leak. Detection that keyed
	//     off the wrapper id used to break here; keep this to regression-test that
	//     footerState now anchors on #article-meter instead.

	let { count = "2/3", aem = false } = $props();

	// AEM leaks template whitespace into the id attribute, so the literal value
	// is "cen-main-meter\n  ed-bar" — which #cen-main-metered-bar will NOT match.
	const wrapperId = $derived(
		aem ? "cen-main-meter\n          ed-bar" : "cen-main-metered-bar"
	);
	const wrapperClass = $derived(
		aem ? "meteredbar-outer-container grid-x meteredbar-mustard" : ""
	);

	// Local visual state for the close button so the dummy actually disappears
	// when dismissed, just like the real Bootstrap alert.
	let dismissed = $state(false);
</script>

<!-- Wrapper the C&EN page nests the bar in; footerState no longer depends on it -->
<div id={wrapperId} class={wrapperClass}>
	{#if !dismissed}
		<div
			class="article-meter alert fixed-bottom alert-dismissible fade show"
			role="alert"
			id="article-meter"
		>
			<div class="container">
				<div class="article-meter--row">
					<div class="article-meter--column">
						<div class="article-meter--wrapper">
							<p class="article-meter--counter">{count}</p>
							<p class="article-meter--text">FREE ARTICLES LEFT THIS MONTH</p>
						</div>
					</div>
					<div class="article-meter--column">
						<p class="mb-0 d-flex align-items-center">
							<span class="article-meter--message"
								>Chemistry matters. Join us to get the news you need.</span
							>
							<a
								tabindex="0"
								class="btn btn-primary btn-sm btn-icon-end text-capitalize tooltip-wrapper metered-bar-subscribe"
								aria-label="Get access to more C&EN articles"
								href="/subscribe.html"
								data-subscription-url="/subscribe.html"
							>
								<span class="tooltip-text" aria-hidden="true">Get More </span>
								Get More
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									fill="currentColor"
									class="bi bi-chevron-right"
									viewBox="0 0 16 16"
								>
									<path
										fill-rule="evenodd"
										d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
									></path>
								</svg>
							</a>
						</p>
					</div>
				</div>
			</div>
			<button
				tabindex="0"
				type="button"
				class="btn-close tooltip-wrapper"
				data-bs-dismiss="alert"
				aria-label="Close"
				onclick={() => (dismissed = true)}
			>
				<span class="tooltip-text positionTooltip" aria-hidden="true">Close</span>
			</button>
		</div>
	{/if}
</div>

<style>
	/* Minimal styling so the dummy bar is visible/positioned like the real one.
	   The real bar inherits Bootstrap's .alert/.fixed-bottom styles, which are
	   not present here, so we recreate just enough to make it testable. */
	#article-meter {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 1030;
		box-sizing: border-box;
		height: 54.6px;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		background: #fff;
		border-top: 1px solid #ddd;
		box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
		font-family: var(--font-sans, sans-serif);
	}

	.container {
		width: 100%;
		max-width: 1280px;
		margin: 0 auto;
	}

	.article-meter--row {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		flex-wrap: wrap;
	}

	.article-meter--wrapper {
		text-align: center;
	}

	.article-meter--counter {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
	}

	.article-meter--text {
		font-size: 0.75rem;
		text-transform: uppercase;
		margin: 0;
	}

	.mb-0 {
		margin-bottom: 0;
	}

	.d-flex {
		display: flex;
	}

	.align-items-center {
		align-items: center;
		gap: 12px;
	}

	.article-meter--message {
		font-size: 0.95rem;
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		background: #0d6efd;
		color: #fff;
		padding: 0.4rem 0.75rem;
		border-radius: 4px;
		text-decoration: none;
		white-space: nowrap;
	}

	.tooltip-text {
		position: absolute;
		left: -9999px;
	}

	.btn-close {
		position: absolute;
		top: 0.5rem;
		right: 0.75rem;
		border: none;
		background: transparent;
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
	}

	.btn-close::before {
		content: "\00d7";
	}
</style>
