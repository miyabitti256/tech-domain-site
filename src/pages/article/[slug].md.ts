import { type CollectionEntry, getCollection } from "astro:content";
import type { APIRoute } from "astro";

export async function getStaticPaths() {
	const articles = await getCollection("article");
	return articles.map((entry) => ({
		params: { slug: entry.id },
		props: { entry },
	}));
}

export const GET: APIRoute = async ({ props }) => {
	const { entry } = props as { entry: CollectionEntry<"article"> };

	// Frontmatterを再構築して返す
	const frontmatter = [
		"---",
		`title: "${entry.data.title}"`,
		`description: "${entry.data.description}"`,
		`publishedAt: "${new Date(entry.data.publishedAt).toISOString()}"`,
		entry.data.tags ? `tags: ${JSON.stringify(entry.data.tags)}` : "",
		entry.data.image ? `image: "${entry.data.image}"` : "",
		"---",
	]
		.filter(Boolean)
		.join("\n");

	const rawContent = `${frontmatter}\n${entry.body || ""}`;

	return new Response(rawContent, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
		},
	});
};
