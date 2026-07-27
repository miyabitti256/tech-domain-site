import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
	const articles = await getCollection("article");

	const sortedArticles = articles.sort(
		(a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
	);

	const siteTitle = "miyabittiのテックブログ";
	const siteDescription =
		"miyabittiのテックブログです。フロントエンド/TypeScriptをメインに発信していきます。";
	// 末尾のスラッシュを削除
	const siteUrl = (
		context.site?.toString() || "https://tech.miyabitti.com"
	).replace(/\/$/, "");

	const lines = [
		`# ${siteTitle}`,
		"",
		`> ${siteDescription}`,
		"",
		"## Articles",
		"",
		...sortedArticles.map(
			(article) =>
				`- [${article.data.title}](${siteUrl}/article/${article.id}.md): ${article.data.description}`,
		),
	];

	return new Response(lines.join("\n"), {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
}
