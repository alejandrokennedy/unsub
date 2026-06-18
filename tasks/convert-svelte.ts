/**
 * convert-svelte.ts
 *
 * Splits the inlined SvelteKit build (`build/index.html`, produced because
 * svelte.config.js sets kit.output.bundleStrategy = "inline") into the four
 * assets a C&EN Adobe AEM import needs:
 *
 *   - <name>.html   the body markup (no doctype/html/head/body), svelte-scoped
 *   - <name>.css    the extracted <style> blocks, prefixed with the C&EN reset
 *   - <name>.js     head-protection guard + Svelte runtime + scrolly/static wrapper
 *   - import.html   the author-safe link snippet pasted once into the AEM component
 *
 * Faithful TS port of misc/Svelte-Conversion/extract-svelte-html.py. Run via
 * `pnpm convert:aem` (or `pnpm build:aem` to build first). Settings come from
 * an optional aem.config.json in the repo root; CLI flags override it.
 */

import {
	readFileSync,
	writeFileSync,
	mkdirSync,
	existsSync,
	statSync
} from "node:fs";
import { dirname, join, resolve, basename } from "node:path";

// ---------------------------------------------------------------------------
// Static fragments carried over verbatim from the Python version
// ---------------------------------------------------------------------------

const CSS_PREFIX = `.div-w-100 { overflow: visible; }

:where(.svelte-scope) :is(a, button, div, input, li) {
    -webkit-transition: none;
    transition: none;
}

`;

const BLOCK_HEAD_JS = String.raw`// Block Svelte from modifying document head
(function() {
    var originalTitle = document.title;

    Object.defineProperty(document, 'title', {
        get: function() { return originalTitle; },
        set: function(val) { /* blocked */ },
        configurable: true
    });

    var originalAppendChild = document.head.appendChild.bind(document.head);
    document.head.appendChild = function(node) {
        if (node && node.tagName) {
            var tag = node.tagName.toLowerCase();
            if (tag === 'meta' || tag === 'title') return node;
            if (tag === 'link') {
                var rel = node.getAttribute('rel');
                if (rel === 'canonical' || rel === 'preload') return node;
            }
        }
        return originalAppendChild(node);
    };

    var originalInsertBefore = document.head.insertBefore.bind(document.head);
    document.head.insertBefore = function(node, ref) {
        if (node && node.tagName) {
            var tag = node.tagName.toLowerCase();
            if (tag === 'meta' || tag === 'title') return node;
            if (tag === 'link') {
                var rel = node.getAttribute('rel');
                if (rel === 'canonical' || rel === 'preload') return node;
            }
        }
        return originalInsertBefore(node, ref);
    };

    var originalReplaceChild = document.head.replaceChild.bind(document.head);
    document.head.replaceChild = function(newNode, oldNode) {
        if (newNode && newNode.tagName) {
            var tag = newNode.tagName.toLowerCase();
            if (tag === 'meta' || tag === 'title') return oldNode;
            if (tag === 'link') {
                var rel = newNode.getAttribute('rel');
                if (rel === 'canonical' || rel === 'preload') return oldNode;
            }
        }
        return originalReplaceChild(newNode, oldNode);
    };

    var titleEl = document.querySelector('title');
    if (titleEl) {
        Object.defineProperty(titleEl, 'textContent', {
            get: function() { return originalTitle; },
            set: function(val) { /* blocked */ },
            configurable: true
        });
        Object.defineProperty(titleEl, 'innerHTML', {
            get: function() { return originalTitle; },
            set: function(val) { /* blocked */ },
            configurable: true
        });
        Object.defineProperty(titleEl, 'innerText', {
            get: function() { return originalTitle; },
            set: function(val) { /* blocked */ },
            configurable: true
        });
    }
})();
`;

// ---------------------------------------------------------------------------
// Small helpers (mirrors of the Python functions)
// ---------------------------------------------------------------------------

type Metadata = Record<string, string>;

/** json.dumps(value, ensure_ascii=False) equivalent. */
function jsString(value: string): string {
	return JSON.stringify(value ?? "");
}

function normalizeDamBase(value: string): string {
	return value.endsWith("/") ? value : value + "/";
}

function defaultRootId(name: string): string {
	const slug = name.startsWith("svelte-") ? name.slice(7) : name;
	return `${slug}-import-root`;
}

function loadMetadata(path: string | null): Metadata {
	if (!path) return {};

	let data: unknown;
	try {
		data = JSON.parse(readFileSync(path, "utf-8"));
	} catch (exc) {
		throw new Error(`metadata JSON is invalid: ${path}\n${exc}`);
	}
	if (typeof data !== "object" || data === null || Array.isArray(data)) {
		throw new Error(`metadata must be a JSON object: ${path}`);
	}

	const out: Metadata = {};
	for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
		out[String(key)] = value == null ? "" : String(value);
	}
	return out;
}

/** Prefix a value with "Label: " unless it already starts with it. */
function labelLine(label: string, value: string): string {
	value = (value ?? "").trim();
	if (!value) return "";
	const re = new RegExp(`^${label}\\s*:`, "i");
	if (re.test(value)) return value;
	return `${label}: ${value}`;
}

function creditHtml(metadata: Metadata, includeNote: boolean): string {
	const lines = [labelLine("Source", metadata.source ?? "")];
	if (includeNote) lines.push(labelLine("Note", metadata.note ?? ""));
	lines.push(labelLine("Credit", metadata.credit ?? ""));
	return lines.filter((line) => line).join("<br>");
}

// ---------------------------------------------------------------------------
// Extraction — pull CSS / HTML / JS out of the inlined build
// ---------------------------------------------------------------------------

function extractParts(source: string): {
	html: string;
	css: string;
	js: string;
} {
	const styleBlocks = [
		...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)
	].map((m) => m[1]);

	const bodyMatch = source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
	if (!bodyMatch) {
		throw new Error("input file does not contain a <body>...</body> block.");
	}

	const body = bodyMatch[1];
	const scriptBlocks = [
		...body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)
	].map((m) => m[1]);
	const stripped = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
	const html = addSvelteScope(stripped);

	return {
		html,
		css: styleBlocks.join("\n"),
		js: scriptBlocks.join("\n")
	};
}

/** Add the `svelte-scope` class to the first <div> so the C&EN CSS reset applies. */
function addSvelteScope(html: string): string {
	// `replace` with a non-global regex touches only the first match.
	return html.replace(/<div\b[^>]*>/i, (tag) => {
		const classMatch = tag.match(/\bclass\s*=\s*(['"])([\s\S]*?)\1/i);
		if (classMatch) {
			const classes = classMatch[2].split(/\s+/);
			if (classes.includes("svelte-scope")) return tag;
			const quote = classMatch[1];
			const oldAttr = classMatch[0];
			const newAttr = `class=${quote}svelte-scope ${classMatch[2]}${quote}`;
			return tag.replace(oldAttr, newAttr);
		}
		return tag.replace(/^<div\b/i, '<div class="svelte-scope"');
	});
}

// ---------------------------------------------------------------------------
// Output wrappers — appended after the Svelte runtime in <name>.js
// ---------------------------------------------------------------------------

function staticWrapperJs(metadata: Metadata): string {
	const title = (metadata.title ?? "").trim();
	const topCaption = (metadata.topCaption ?? "").trim();
	const credits = creditHtml(metadata, true);

	return String.raw`
// Wrap static Svelte output in C&EN image markup after hydration completes
(function() {
    var mountRoot = (document.currentScript && document.currentScript.parentElement) || null;
    var meta = {
        title: ${jsString(title)},
        topCaption: ${jsString(topCaption)},
        creditHtml: ${jsString(credits)}
    };

    function wrapContentDiv() {
        var contentDiv = mountRoot ? mountRoot.querySelector('#content') : null;
        if (!contentDiv) return;
        if (mountRoot.querySelector('.svelte-static-image-wrapper')) return;

        if (!contentDiv.parentElement.classList.contains('div-w-100')) {
            var wrapper = document.createElement('div');
            wrapper.className = 'div-w-100';
            contentDiv.parentNode.insertBefore(wrapper, contentDiv);
            wrapper.appendChild(contentDiv);
        }

        var contentWrapper = contentDiv.parentElement;
        var parentNode = contentWrapper.parentNode;
        var nextSibling = contentWrapper.nextSibling;
        var figure = document.createElement('figure');
        figure.className = 'img-fluid mt-5 mb-5';

        if (meta.title || meta.topCaption) {
            var topMeta = document.createElement('div');
            topMeta.className = 'div-w-75';
            topMeta.style.marginBottom = '15px';
            topMeta.innerHTML =
                (meta.title ? '<h3 class="heading-line-bottom fs-6 fw-bold">' + meta.title + '</h3>' : '') +
                (meta.topCaption ? '<figcaption class="top-caption">' + meta.topCaption + '</figcaption>' : '');
            figure.appendChild(topMeta);
        }

        figure.appendChild(contentWrapper);

        if (meta.creditHtml) {
            var bottomMeta = document.createElement('div');
            bottomMeta.className = 'div-w-100 svelte-static-credit';
            bottomMeta.innerHTML = '<figcaption class="svelte-credit-offset" style="margin-top: 30px; margin-left: 9%;"><div class="credit">' + meta.creditHtml + '</div></figcaption>';
            figure.appendChild(bottomMeta);
        }

        var imageDiv = document.createElement('div');
        imageDiv.className = 'image svelte-static-image-wrapper';
        imageDiv.appendChild(figure);

        if (nextSibling) {
            parentNode.insertBefore(imageDiv, nextSibling);
        } else {
            parentNode.appendChild(imageDiv);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(wrapContentDiv, 0);
        });
    } else {
        setTimeout(wrapContentDiv, 0);
    }
})();
`;
}

function scrollyWrapperJs(metadata: Metadata): string {
	const credits = creditHtml(metadata, false);

	return String.raw`
// Wrap scrolly Svelte output in full-width markup after hydration completes
(function() {
    var mountRoot = (document.currentScript && document.currentScript.parentElement) || null;
    var creditHtml = ${jsString(credits)};

    function wrapContentDiv() {
        var contentDiv = mountRoot ? mountRoot.querySelector('#content') : null;
        if (!contentDiv) return;

        if (!contentDiv.parentElement.classList.contains('div-w-100')) {
            var wrapper = document.createElement('div');
            wrapper.className = 'div-w-100';
            contentDiv.parentNode.insertBefore(wrapper, contentDiv);
            wrapper.appendChild(contentDiv);
        }

        if (!creditHtml || mountRoot.querySelector('.svelte-scrolly-credit')) return;

        var contentWrapper = contentDiv.parentElement;
        var creditDiv = document.createElement('div');
        creditDiv.className = 'div-w-100 svelte-scrolly-credit';
        creditDiv.innerHTML = '<div class="svelte-credit-offset" style="margin-top: 10px; margin-bottom: 50px; margin-left: 9%;"><div class="credit">' + creditHtml + '</div></div>';
        contentWrapper.parentNode.insertBefore(creditDiv, contentWrapper.nextSibling);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(wrapContentDiv, 0);
        });
    } else {
        setTimeout(wrapContentDiv, 0);
    }
})();
`;
}

// ---------------------------------------------------------------------------
// import.html — the author-safe AEM snippet
// ---------------------------------------------------------------------------

function importHtml(name: string, rootId: string, damBase: string): string {
	const cssFile = `${name}.css`;
	const htmlFile = `${name}.html`;
	const jsFile = `${name}.js`;
	const consoleLabel = `[${name} import]`;

	return String.raw`<link rel="stylesheet" href="${damBase}${cssFile}">

<div id="${rootId}" class="svelte-scope"></div>

<script>
(function () {
    var DAM_BASE = ${jsString(damBase)};
    var ROOT_ID = ${jsString(rootId)};
    var HTML_FILE = ${jsString(htmlFile)};
    var JS_FILE = ${jsString(jsFile)};
    var FORCE_INTERACTIVE = /[?&]cenForceInteractive=1(?:&|$)/.test(window.location.search);
    var el = document.getElementById(ROOT_ID);
    if (!el) return;

    function isAemAuthorMode() {
        var href = window.location.href;
        var topHref = "";
        var inIframe = false;
        try {
            inIframe = window.self !== window.top;
            topHref = inIframe && window.top && window.top.location ? window.top.location.href : "";
        } catch (e) {
            inIframe = true;
        }

        if (inIframe) return true;
        if (/\/editor\.html\//i.test(href)) return true;
        if (/\/editor\.html\//i.test(topHref)) return true;
        if (/[?&]wcmmode=(edit|preview|design)\b/i.test(href)) return true;
        if (/[?&]wcmmode=(edit|preview|design)\b/i.test(topHref)) return true;
        if (document.documentElement && /\bcq-wcm-edit\b|\bwcmmode-edit\b/i.test(document.documentElement.className || "")) return true;
        if (document.body && (document.body.classList.contains("aem-AuthorLayer-Edit") || document.body.classList.contains("editor-AuthorLayer-Edit"))) return true;
        return !!document.querySelector(".cq-Overlay, .editor-GlobalBar, .aem-AuthorLayer");
    }

    if (el.dataset.cenImportMounted === "1") return;
    el.dataset.cenImportMounted = "1";
    el.classList.add("svelte-scope");

    if (isAemAuthorMode() && !FORCE_INTERACTIVE) {
        el.innerHTML = '<div style="padding:12px;border:1px solid #ddd;background:#fff;font-family:Inter,sans-serif;color:#242424;">Interactive module paused in AEM editor to keep authoring responsive. Add <code>?cenForceInteractive=1</code> to test live behavior.</div>';
        return;
    }

    fetch(DAM_BASE + HTML_FILE)
        .then(function (res) {
            if (!res.ok) throw new Error("Failed to load " + HTML_FILE + ": " + res.status);
            return res.text();
        })
        .then(function (html) {
            if (!document.body.contains(el)) return;
            el.innerHTML = html;

            var script = document.createElement("script");
            script.src = DAM_BASE + JS_FILE;
            script.defer = true;
            script.dataset.cenImportScript = ROOT_ID;

            function mountScript() {
                if (!document.body.contains(el)) return;
                el.appendChild(script);
            }

            if ("requestIdleCallback" in window) {
                window.requestIdleCallback(mountScript, { timeout: 1500 });
            } else {
                setTimeout(mountScript, 0);
            }
        })
        .catch(function (err) {
            console.error(${jsString(consoleLabel)}, err);
            el.dataset.cenImportMounted = "";
        });
})();
</script>
`;
}

// ---------------------------------------------------------------------------
// Config + CLI resolution
// ---------------------------------------------------------------------------

interface Options {
	mode: "static" | "scrolly";
	input: string;
	outDir: string;
	name: string;
	damBase: string;
	rootId: string | null;
	metadata: string | null; // path to a metadata JSON file
	inlineMetadata: Metadata; // metadata supplied inline in aem.config.json
}

/** Parse `--key value` / `--flag` pairs into a plain object keyed by flag name. */
function parseArgs(argv: string[]): Record<string, string | boolean> {
	const out: Record<string, string | boolean> = {};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg.startsWith("--")) continue;
		const key = arg.slice(2);
		if (key === "yes") {
			out.yes = true;
			continue;
		}
		out[key] = argv[++i];
	}
	return out;
}

function resolveOptions(argv: string[]): Options {
	const cli = parseArgs(argv);

	// defaults (tuned for this starter's inlined build)
	const opts: Options = {
		mode: "scrolly",
		input: "build/index.html",
		outDir: "aem-dist",
		name: "svelte-converted",
		damBase: "/content/dam/cen/static/code/",
		rootId: null,
		metadata: null,
		inlineMetadata: {}
	};

	// layer 2: optional aem.config.json (path overridable with --config)
	const configPath = resolve(String(cli.config ?? "aem.config.json"));
	if (existsSync(configPath)) {
		const cfg = JSON.parse(readFileSync(configPath, "utf-8"));
		if (cfg.mode) opts.mode = cfg.mode;
		if (cfg.input) opts.input = cfg.input;
		if (cfg.outDir) opts.outDir = cfg.outDir;
		if (cfg.name) opts.name = cfg.name;
		if (cfg.damBase) opts.damBase = cfg.damBase;
		if (cfg.rootId) opts.rootId = cfg.rootId;
		if (cfg.metadataPath) opts.metadata = cfg.metadataPath;
		if (cfg.metadata && typeof cfg.metadata === "object") {
			opts.inlineMetadata = cfg.metadata as Metadata;
		}
		console.log(`Using config: ${configPath}`);
	}

	// layer 3: CLI flags win
	if (cli.mode) opts.mode = cli.mode as Options["mode"];
	if (cli.input) opts.input = String(cli.input);
	if (cli["out-dir"]) opts.outDir = String(cli["out-dir"]);
	if (cli.name) opts.name = String(cli.name);
	if (cli["dam-base"]) opts.damBase = String(cli["dam-base"]);
	if (cli["root-id"]) opts.rootId = String(cli["root-id"]);
	if (cli.metadata) opts.metadata = String(cli.metadata);

	return opts;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main(argv: string[]): number {
	const opts = resolveOptions(argv);

	const inputPath = resolve(opts.input);
	const outDir = resolve(opts.outDir);
	const name = opts.name;
	const rootId = opts.rootId || defaultRootId(name);
	const damBase = normalizeDamBase(opts.damBase);

	// Inline metadata from config, overridden by a metadata file if given.
	const metadata: Metadata = {
		...opts.inlineMetadata,
		...loadMetadata(opts.metadata ? resolve(opts.metadata) : null)
	};

	if (!existsSync(inputPath)) {
		console.error(`Error: input file not found: ${inputPath}`);
		console.error(`Run \`pnpm build\` first, or pass --input <file>.`);
		return 1;
	}

	const source = readFileSync(inputPath, "utf-8");
	const { html, css, js } = extractParts(source);
	const wrapperJs =
		opts.mode === "static"
			? staticWrapperJs(metadata)
			: scrollyWrapperJs(metadata);

	const outputs: Record<string, string> = {
		[join(outDir, `${name}.html`)]: html,
		[join(outDir, `${name}.css`)]: CSS_PREFIX + css,
		[join(outDir, `${name}.js`)]: `${BLOCK_HEAD_JS}\n${js}\n${wrapperJs}`,
		[join(outDir, "import.html")]: importHtml(name, rootId, damBase)
	};

	console.log(`Converting ${basename(inputPath)} as ${opts.mode} content...`);

	// aem-dist is a regenerated build artifact, so overwrite freely.
	for (const [path, content] of Object.entries(outputs)) {
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, content, "utf-8");
	}

	console.log("");
	console.log("============================================");
	console.log("Extraction complete!");
	console.log("============================================");
	console.log("");
	console.log("Output files:");
	for (const path of Object.keys(outputs)) {
		console.log(`  ${basename(path)}: ${path} (${statSync(path).size} bytes)`);
	}
	console.log("");
	console.log("AEM import settings:");
	console.log(`  DAM base: ${damBase}`);
	console.log(`  Root ID:  ${rootId}`);
	return 0;
}

process.exit(main(process.argv.slice(2)));
