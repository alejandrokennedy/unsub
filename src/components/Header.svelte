<script>
	import cenLogo from "$svg/logo-cen-tagline-red.svg";
	// Simulated C&EN site header — visual cue only, no real functionality.
	// Heights mirror story.svelte's HEADER_H = { mobile: 48, desktop: 65 }
	// and the 768px MOBILE_BREAKPOINT, so the sticky chart sits right below it.
</script>

<header class="site-header">
	<div class="site-header--inner">
		<!-- Left: menu + search icons -->
		<ul class="site-header--navigation" role="list">
			<li>
				<button class="icon-btn" type="button" aria-label="main menu">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 -960 960 960"
						fill="#242424"
						aria-hidden="true"
					>
						<path
							d="M140-254.62v-50.25h680v50.25H140Zm0-200.25v-50.26h680v50.26H140Zm0-200.26v-50.25h680v50.25H140Z"
						/>
					</svg>
				</button>
			</li>
			<li>
				<button class="icon-btn" type="button" aria-label="search">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 -960 960 960"
						fill="#242424"
						aria-hidden="true"
					>
						<path
							d="M787.64-137.33 530.87-394.1q-29.9 25.86-69.4 40.06-39.51 14.19-81.78 14.19-102.1 0-172.82-70.68-70.71-70.68-70.71-171.84 0-101.17 70.68-171.91t171.99-70.74q101.31 0 172.03 70.69 70.73 70.7 70.73 171.9 0 42.3-14.39 81.84-14.38 39.54-40.53 70.69l257.17 256.1-36.2 36.47ZM379.28-390.1q80.41 0 136.23-55.96 55.82-55.97 55.82-136.38t-55.82-136.37q-55.82-55.96-136.23-55.96-80.75 0-136.81 55.96t-56.06 136.37q0 80.41 56.06 136.38 56.06 55.96 136.81 55.96Z"
						/>
					</svg>
				</button>
			</li>
		</ul>

		<!-- Center: logo -->
		<div class="site-header--logo">
			<a href="https://cen.acs.org" target="_self" aria-label="C&EN homepage"
				>{@html cenLogo}</a
			>
		</div>

		<!-- Right: account buttons -->
		<div class="site-header--account">
			<button class="btn btn-primary" type="button">Subscribe</button>
			<button class="btn btn-white" type="button">Log In</button>
		</div>
	</div>
</header>

<style>
	.site-header {
		position: sticky;
		top: 0;
		z-index: 1000;
		width: 100%;
		height: 65px;
		background: #fff;
		border-bottom: 1px solid #e5e5e5;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		font-family: Helvetica, Arial, sans-serif;
	}

	.site-header--inner {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		height: 100%;
		padding: 0 16px;
		gap: 8px;
	}

	.site-header--navigation {
		display: flex;
		align-items: center;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
		justify-self: start;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
	}

	.icon-btn svg {
		width: 26px;
		height: 26px;
	}

	.site-header--logo {
		justify-self: center;
		display: flex;
		align-items: center;
	}

	.site-header--logo a {
		display: block;
		border: none;
		line-height: 0;
	}

	.site-header--logo a:hover {
		background-color: transparent;
	}

	.site-header--logo :global(svg) {
		height: 40px;
		width: auto;
		display: block;
	}

	.site-header--account {
		display: flex;
		align-items: center;
		gap: 8px;
		justify-self: end;
	}

	.btn {
		font-size: 14px;
		font-weight: 600;
		padding: 6px 14px;
		border-radius: 4px;
		border: 1px solid transparent;
		cursor: pointer;
		white-space: nowrap;
		line-height: 1.2;
	}

	.btn-primary {
		background: #c8102e;
		color: #fff;
		border-color: #c8102e;
	}

	.btn-white {
		background: #fff;
		color: #242424;
		border-color: #ccc;
	}

	/* Mobile: 48px tall (matches HEADER_H.mobile at the 768px breakpoint),
	   smaller logo, hide the account buttons to keep it tidy. */
	@media (max-width: 768px) {
		.site-header {
			height: 48px;
		}

		.site-header--inner {
			padding: 0 8px;
		}

		.icon-btn {
			width: 34px;
			height: 34px;
		}

		.icon-btn svg {
			width: 22px;
			height: 22px;
		}

		.site-header--logo :global(svg) {
			height: 28px;
		}

		.site-header--account {
			display: none;
		}
	}
</style>
