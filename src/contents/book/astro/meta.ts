import { defineBookMeta } from "../types";

export default defineBookMeta({
	title: "Astroに入門してみる",
	description:
		"Astroの選定理由から実践的なサイト構築まで、公式ドキュメントにはない独自の視点で解説するAstro入門書",
	summary: `## この本について
この本では、「なぜAstroを選ぶのか」という問いから始まり、ブログサイトやドキュメントサイトを実際に構築できるようになるまでを段階的に解説します。

公式ドキュメントとの差別化として、フレームワーク選定のフローチャート、Islands Architectureの歴史的背景、パフォーマンス計測のハンズオン、実践的なプロジェクト構成パターンなど、独自の解説を各章に盛り込んでいます。

Astroに興味があるWeb開発初心者の方から、他フレームワークからの乗り換えを検討している方まで、幅広く役立てていただける内容を目指します。
`,
	tags: ["astro", "typescript"],
	publishedAt: "2026-04-15",
	chapters: [
		"introduction",
		"how-astro-works",
		"dev-env",
		"astro-syntax",
		"pages-and-routing",
		"layouts-and-components",
		"styling",
		"islands",
		"content-collections",
		"build-blog",
		"build-docs",
		"deploy",
	],
});
