import { defineBookMeta } from "../types";

export default defineBookMeta({
	title: "Astroに入門してみる",
	description: "筆者がAstroについて学んだ事をまとめて行きます",
	summary: `## この本について
この本では、Astroを使ったWebサイト構築をゼロから学んでいきます。環境構築から始まり、ページ作成、コンポーネントの活用、そしてデプロイまでを順を追って解説していく予定です。Astroに興味があるWeb開発初心者の方から、他フレームワークからの乗り換えを検討している方まで、幅広く役立てていただける内容を目指します。
本シリーズは未完成です。随時更新していきますので、ご了承ください。
`,
	tags: ["astro", "typescript"],
	publishedAt: "2026-04-15",
	chapters: ["introduction", "dev-env", "astro-settings", "page-and-routing"],
});
