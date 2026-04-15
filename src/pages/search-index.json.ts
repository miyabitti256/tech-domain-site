import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
	const allArticles = await getCollection("article");

	const searchIndex = allArticles
		.sort(
			(a, b) =>
				new Date(b.data.publishedAt).getTime() -
				new Date(a.data.publishedAt).getTime(),
		)
		.map((article) => ({
			id: article.id,
			title: article.data.title,
			description: article.data.description,
			tags: article.data.tags || [],
			publishedAt: article.data.publishedAt.toISOString(),
			image: article.data.image || null,
		}));

	return new Response(JSON.stringify(searchIndex), {
		headers: {
			"Content-Type": "application/json",
		},
	});
};
