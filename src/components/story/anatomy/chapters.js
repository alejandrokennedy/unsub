/**
 * Step copy for the scrollytelling. One entry per step; `text` is HTML (rendered
 * with {@html}). Index aligns 1:1 with STEPS in AnatomyStory.svelte.
 * Draft copy — swap for editor-written / Google-Doc copy later.
 */
export const chapters = [
	{
		text: `<h2>What does a journal cost?</h2>
		<p>Every dot is one academic journal a university library subscribes to — 306 of them, from a single publisher's <strong>&ldquo;big deal&rdquo;</strong> bundle. Spread them out by price and the shock lands fast: the most expensive title runs about <strong>$24,000 a year</strong>. For one journal.</p>`
	},
	{
		text: `<p>But price alone doesn't tell you what's worth keeping. Resize each dot by <strong>how much the campus actually uses it</strong> — downloads, citations, and papers published in it. Some pricey titles are used constantly. Some cheap ones, barely at all.</p>`
	},
	{
		text: `<p>And the sticker price isn't the real price. Cancel a journal and readers still reach the odd article through <strong>interlibrary loan</strong> — a small per-article fee you'd pay anyway. Subtract that, and every dot slides left to its true <strong>net cost</strong>.</p>`
	},
	{
		text: `<h2>Cost versus value</h2>
		<p>Now lift the crowd off the floor. Put <strong>usage on the vertical axis</strong>, net cost on the horizontal. High and cheap is a bargain; low and expensive is not. This is the trade-off every librarian is really weighing.</p>`
	},
	{
		text: `<p>Divide one by the other and you get a single number: <strong>cost per use</strong>. Swap it onto the vertical axis and the worst deals float to the top. But watch the highlighted dot — expensive per use, yet <strong>most of its content is already free elsewhere</strong>. A trap hiding in plain sight.</p>`
	},
	{
		text: `<h2>Make the cut</h2>
		<p>Drag the line to cancel everything above it — the worst cost-per-use titles first — or just watch the obvious cuts fall away. The savings meter fills as demand stays almost untouched, because open access and back files quietly cover the gap.</p>`
	},
	{
		text: `<h2>The payoff</h2>
		<p>A few dozen cancellations. <strong>Hundreds of thousands of dollars</strong> back in the budget — and the campus barely notices. Multiply that across every publisher, every vendor, every university, and the numbers get very large indeed.</p>`
	},
	{
		text: `<h2>Where do the cuts land?</h2>
		<p>Sort the same journals by <strong>field</strong> — still ranked by cost per use. The dashed line is the same cut, now cast across every discipline: expensive-per-use titles in economics, math and physics take the hit, while heavily used fields are largely spared. No single department carries it alone.</p>`
	}
];
