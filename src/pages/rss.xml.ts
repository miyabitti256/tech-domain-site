import { getCollection } from "astro:content";
import rss from "@astrojs/rss";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
	const articles = await getCollection("article");

	const sortedArticles = articles.sort(
		(a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf(),
	);

	return rss({
		title: "miyabittiのテックブログ",
		description:
			"miyabittiのテックブログです。フロントエンド/TypeScriptをメインに発信していきます。",
		site: context.site || "https://tech.miyabitti.com",
		items: sortedArticles.slice(0, 20).map((article) => ({
			title: article.data.title,
			pubDate: article.data.publishedAt,
			description: article.data.description,
			link: `/article/${article.id}/`,
			customData: article.data.updatedAt
				? `<updated>${article.data.updatedAt.toISOString()}</updated>`
				: undefined,
		})),
		customData: `<language>ja-jp</language>`,
	});
}
