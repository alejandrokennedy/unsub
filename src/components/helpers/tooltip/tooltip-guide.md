# Tooltip — Guide

A general-purpose, framework-agnostic tooltip for Svelte 5. It's a **positioning
shell**: you give it a viewport coordinate and content, and it renders a
`position: fixed` box that follows that point, measures itself, flips/clamps so it
never clips at a viewport edge, and portals out of its DOM subtree so nothing paints
over it. It works with hand-authored SVG/D3, SveltePlot, or plain HTML.

## Files (all in `src/components/helpers/tooltip/`)

| File | Purpose |
|------|---------|
| `Tooltip.svelte` | The positioning shell. Import this. |
| `AnchoredTooltip.svelte` | Adapter that anchors the shell to a *data point* (see "SveltePlot"). |
| `Tooltip.example.svelte` | Standalone demo page. **Do not import into real code** — it renders a full demo (heading, sample SVG, explanations). Importing it by mistake is how you get a giant tooltip. |
| `tooltip-guide.md` | This file. |

---

## `Tooltip.svelte`

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `x` | number | 0 | Anchor X, **viewport** coords (e.g. `event.clientX`). |
| `y` | number | 0 | Anchor Y, viewport coords. |
| `offset` | number | 8 | Gap from the anchor along the `side` axis (px). |
| `margin` | number | 8 | Viewport edge inset the box is kept clear of (px). |
| `align` | `"left"` \| `"center"` \| `"right"` | `"left"` | Preferred horizontal justification relative to `x`. Flips/clamps near edges. |
| `side` | `"top"` \| `"bottom"` | `"bottom"` | Preferred vertical side relative to `y`. Flips near the matching edge. |
| `target` | string \| HTMLElement \| null | null | Portal destination (see "Portaling"). Selector is matched against the box's **ancestors** (`closest`); `null` → `<body>`. |
| `children` | snippet | required | Tooltip content. |

### Quick start (SVG / D3 — cursor-following)

```svelte
<script>
  import Tooltip from "$components/helpers/tooltip/Tooltip.svelte";

  let hovered = $state(null);
  let x = $state(0), y = $state(0);
</script>

<svg>
  <path
    onpointermove={(e) => { x = e.clientX; y = e.clientY; hovered = data; }}
    onpointerleave={() => (hovered = null)}
  />
</svg>

{#if hovered}
  <Tooltip {x} {y} offset={12} align="center">
    <div class="my-tooltip">{hovered.label}: {hovered.value}</div>
  </Tooltip>
{/if}
```

Content is the default `children`, so you can pass it directly (no explicit
`{#snippet children()}` needed). Always feed **viewport** coords (`clientX/clientY`),
never `offsetX`/`layerX`.

---

## `AnchoredTooltip.svelte` — anchoring to a data point

Cursor-following is right for continuous/dense data. For **discrete points**, it
often reads better to pin the tooltip to the datum so it steps with the marker.
`AnchoredTooltip` does that without any manual scale/projection math: it drops a
zero-size anchor at its own mount position and measures it, then feeds those viewport
coords to `Tooltip`. It must therefore be placed somewhere already positioned at the
point — with SveltePlot, that's inside `<HTMLTooltip>` (whose wrapper sits on the
hovered datum).

### Props

Same as `Tooltip` (`offset`, `margin`, `align`, `side`, `target`, `children`) **minus
`x`/`y`** (measured, not passed), **plus**:

| Prop | Type | Description |
|------|------|-------------|
| `key` | unknown | Any value that changes when the anchored point moves (e.g. the `datum`). Triggers a re-measure. Pass it or the box won't follow point-to-point. |

---

## SveltePlot usage (the ProductionVolumes pattern)

SveltePlot hides pointer events behind `Pointer`/`HTMLTooltip`, so:

1. Use `<Pointer>` for the nearest-point search + the `RuleX`/`Dot` marker.
2. Use `<HTMLTooltip>` **only as the datum source** (its own box is `position:absolute`
   inside the plot and clips — we don't use it to render).
3. Render our shell from inside `HTMLTooltip`'s `children` snippet.

```svelte
{#snippet overlay()}
  <HTMLTooltip data={hoverRows} x="date" y={(d) => d.volume || 1e-9}>
    {#snippet children({ datum })}
      {#if datum}
        <!-- anchored to the dot -->
        <AnchoredTooltip key={datum} offset={12} align="center" target=".scrollo-story">
          {@render tipBody(datum)}
        </AnchoredTooltip>
        <!-- …or cursor-following: <Tooltip x={tipX} y={tipY} … /> with a
             pointermove handler on the plot wrapper writing tipX/tipY -->
      {/if}
    {/snippet}
  </HTMLTooltip>
{/snippet}
```

Notes specific to this project:
- **`target=".scrollo-story"`** — our fonts/design tokens are scoped to that
  container, not `:root`. Portaling to `<body>` would drop them (tooltip renders in
  Times New Roman). See "Portaling".
- The **`|| 1e-9`** on `y` works around a SveltePlot bug where a literal `0` collapses
  `HTMLTooltip`'s placement (the displayed value is still the real `0`).
- Also set an explicit `font-family`/`color` on your tooltip content: once portaled it
  no longer inherits from `.chart`.

---

## How it works

### Placement: preference → flip → clamp
Placement uses the box's **measured** size, so it adapts to any content:
- **Prefer** the `align`/`side` position (e.g. `center` + `bottom` = centered beneath).
- **Flip** to the opposite side if the preferred one would overflow the far edge
  (`center` doesn't flip — the clamp handles it).
- **Clamp** the final position to `[margin, viewport − size − margin]`, so it can never
  clip even if the box is larger than the gap on both sides (it sits flush instead).

Viewport size is read from `document.documentElement.clientWidth/Height`, **not**
`window.innerWidth/Height` — the latter include the scrollbar gutter, which would let
the box slide under a vertical scrollbar on the right.

### Portaling (always on top, keep your styles)
The box is portaled (via an `{@attach}`) out of its subtree so it renders in the
destination's stacking context. `position: fixed` escapes *clipping* but not the
*paint order* of DOM ancestors — without the portal, a later sibling (or any ancestor
that forms a stacking context, e.g. a `transform`ed axis label) can paint over it.

**Choosing `target`:**
- Fonts/tokens on `:root`/global → default `<body>` is fine.
- Fonts/tokens scoped to a container (this project: `.scrollo-story`) → set
  `target` to that container. `<body>` is outside the scope, so an inherited
  `font-family` and every `var(--token)` would break. Because `target` uses
  `closest()`, it lands in the nearest matching ancestor while still escaping panels.
- Belt-and-suspenders: set `font-family`/`color` explicitly on your content so it
  never depends on where it's portaled.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Giant tooltip / demo content | You imported `Tooltip.example.svelte`. Import `Tooltip.svelte`. |
| Wrong position | Use `clientX/clientY` (viewport), not `offsetX/layerX`. |
| Renders in Times New Roman / loses colors | Portaled outside the token scope. Set `target` to your scope container (`.scrollo-story`) and/or set `font-family`/`color` on the content. |
| Covered by other elements | It's portaled + `z-index: 9999`; check nothing else uses a higher z-index in the portal target. |
| Clipped at the right edge only | Ensure you're on the current shell — it clamps to `clientWidth` (scrollbar-aware), not `innerWidth`. |
| Cut off at an edge | Automatic (measure + flip + clamp). Want more breathing room? Raise `margin`. |
| Flickers on hover | Increase `offset`; the box already has `pointer-events: none`. |
| Anchored box doesn't follow points | Pass a `key` that changes per point (e.g. `key={datum}`). |

---

**Status:** ✅ Production-ready · Svelte 5 (runes, `{@attach}`, snippets) · TypeScript.
