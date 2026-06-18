import adapterStatic from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config = {
	compilerOptions: {
		runes: true
	},
	preprocess: vitePreprocess(),
	vitePlugin: {
		inspector: true
	},
	kit: {
		adapter: adapterStatic({ strict: false }),
		output: {
			bundleStrategy: "inline"
		},
		alias: {
			$actions: "src/actions",
			"$actions/*": "src/actions/*",
			$components: "src/components",
			"$components/*": "src/components/*",
			$data: "src/data",
			"$data/*": "src/data/*",
			$routes: "src/routes",
			"$routes/*": "src/routes/*",
			$runes: "src/runes",
			"$runes/*": "src/runes/*",
			$styles: "src/styles",
			"$styles/*": "src/styles/*",
			$svg: "src/svg",
			"$svg/*": "src/svg/*",
			$utils: "src/utils",
			"$utils/*": "src/utils/*"
		}
	}
};

export default config;
