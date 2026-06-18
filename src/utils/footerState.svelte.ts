export const footerState = $state({ visible: false });

$effect.root(() => {
	let closeButton = null;
	let listenerAttached = false;
	let userClosed = false;
	let observer = null;

	const handleClose = () => {
		userClosed = true;
		footerState.visible = false; // Mutate the property
	};

	const checkForBar = () => {
		// Anchor on #article-meter only. The outer wrapper's id varies by
		// environment: live serves #cen-main-metered-bar, but AEM preview leaks
		// template whitespace into the attribute (id="cen-main-meter\n  ed-bar"),
		// so an exact "#cen-main-metered-bar" match returns null there. #article-meter
		// has a clean id in both, so it's the reliable hook.
		const bar = document.querySelector("#article-meter");
		const newCloseButton = bar?.querySelector(".btn-close");

		if (bar && !footerState.visible && !userClosed) {
			footerState.visible = true; // Mutate the property
			if (observer) {
				observer.disconnect();
			}
		}

		if (newCloseButton && !listenerAttached) {
			closeButton = newCloseButton;
			closeButton.addEventListener("click", handleClose);
			listenerAttached = true;
		}
	};

	checkForBar();

	observer = new MutationObserver(() => {
		checkForBar();
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true
	});

	return () => {
		if (observer) {
			observer.disconnect();
		}
		if (closeButton && listenerAttached) {
			closeButton.removeEventListener("click", handleClose);
		}
	};
});
