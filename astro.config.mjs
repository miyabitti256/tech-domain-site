// @ts-check

import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import expressiveCode from "astro-expressive-code";
import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeMathjax from "rehype-mathjax/svg";
import rehypeSlug from "rehype-slug";
import remarkBreaks from "remark-breaks";
import remarkDirective from "remark-directive";
import remarkGithubAlerts from "remark-github-alerts";
import remarkLinkCard from "remark-link-card-plus";
import remarkMath from "remark-math";
import { remarkCustomDirectives } from "./src/plugins/remark-custom-directives.ts";
import { remarkEmbeds } from "./src/plugins/remark-embeds.ts";
import { remarkMermaidSsr } from "./src/plugins/remark-mermaid.ts";

// https://astro.build/config
export default defineConfig({
	site: "https://tech.miyabitti.com",
	output: "static",
	vite: {
		plugins: [tailwindcss()],
	},
	build: {
		inlineStylesheets: "always"
	},

	markdown: {
		processor: unified({
			remarkPlugins: [
				remarkMermaidSsr,
				remarkGithubAlerts,
				remarkBreaks,
				remarkDirective,
				remarkCustomDirectives,
				remarkEmbeds,
				[remarkLinkCard, { cache: true }],
				remarkMath,
			],
			rehypePlugins: [
				rehypeSlug,
				[
					rehypeAutolinkHeadings,
					{
						behavior: "prepend",
						properties: {
							className: ["heading-anchor"],
							ariaHidden: true,
							tabIndex: -1,
						},
						content: { type: "text", value: "#" },
					},
				],
				[
					rehypeExternalLinks,
					{ target: "_blank", rel: ["noopener", "noreferrer"] },
				],
				rehypeMathjax,
			],
		}),
	},

	integrations: [
		expressiveCode({
			themes: ["github-dark", "github-light"],
			// ダークモードの切り替えをCSSクラス（.dark）で行うための設定
			themeCssSelector: (theme) =>
				theme.name === "github-dark" ? ".dark" : ":root:not(.dark)",
		}),
		sitemap({
			filter: (page) =>
				!page.includes("/search") && !page.endsWith(".md"),
		}),
	],
	fonts: [
		{
			name: "Zen Kaku Gothic New",
			cssVariable: "--font-zen-kaku-gothic",
			provider: fontProviders.fontsource(),
			weights: [300, 400, 500, 700, 900],
			styles: ["normal"],
			fallbacks: ["sans-serif"],
		},
		{
			name: "Lilex",
			cssVariable: "--font-lilex",
			provider: fontProviders.fontsource(),
			weights: [300, 400, 500, 600],
			styles: ["normal"],
			fallbacks: ["monospace"],
		},
	],
});
