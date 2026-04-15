import { type CollectionEntry, getCollection } from "astro:content";
import type { APIRoute } from "astro";
import type { BookMeta } from "@/contents/book/types";

export async function getStaticPaths() {
	const allChapters = await getCollection("book");

	const metaModules = import.meta.glob<{ default: BookMeta }>(
		"/src/contents/book/*/meta.ts",
		{ eager: true },
	);

	const paths: {
		params: { slug: string; chapter: string };
		props: {
			entry: CollectionEntry<"book">;
			meta: BookMeta;
			slug: string;
			chapter: string;
		};
	}[] = [];

	for (const [filepath, mod] of Object.entries(metaModules)) {
		const slug = filepath.split("/").at(-2) ?? "";
		const meta = mod.default;

		for (const chapter of meta.chapters) {
			const entryId = `${slug}/${chapter}`;
			const entry = allChapters.find((e) => e.id === entryId);
			if (!entry) continue;

			paths.push({
				params: { slug, chapter },
				props: { entry, meta, slug, chapter },
			});
		}
	}

	return paths;
}

export const GET: APIRoute = async ({ props }) => {
	const { entry, meta, slug, chapter } = props as {
		entry: CollectionEntry<"book">;
		meta: BookMeta;
		slug: string;
		chapter: string;
	};

	const frontmatter = [
		"---",
		`title: "${entry.data.title}"`,
		`bookTitle: "${meta.title}"`,
		`bookSlug: "${slug}"`,
		`chapterSlug: "${chapter}"`,
		`publishedAt: "${new Date(meta.publishedAt).toISOString()}"`,
		meta.updatedAt
			? `updatedAt: "${new Date(meta.updatedAt).toISOString()}"`
			: "",
		meta.tags ? `tags: ${JSON.stringify(meta.tags)}` : "",
		"---",
	]
		.filter(Boolean)
		.join("\n");

	// BOM を付けて、file:// 直開きでも文字化けしにくくする
	const rawContent = `\uFEFF${frontmatter}\n${entry.body || ""}`;

	return new Response(rawContent, {
		headers: {
			"Content-Type": "text/markdown; charset=UTF-8",
			"X-Content-Type-Options": "nosniff",
		},
	});
};
