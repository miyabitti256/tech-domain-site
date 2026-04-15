import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import type { BookMeta } from "@/contents/book/types";

export async function getStaticPaths() {
	const metas = import.meta.glob<{ default: BookMeta }>(
		"/src/contents/book/*/meta.ts",
		{ eager: true },
	);

	const allChapters = await getCollection("book");

	return Object.entries(metas).map(([filepath, mod]) => {
		const slug = filepath.split("/").at(-2) ?? "";
		const meta = mod.default;

		const chapterEntries: { slug: string; title: string }[] = meta.chapters
			.map((chapterSlug) => {
				const entryId = `${slug}/${chapterSlug}`;
				const entry = allChapters.find((e) => e.id === entryId);
				if (!entry) return null;
				return { slug: chapterSlug, title: entry.data.title };
			})
			.filter(Boolean) as { slug: string; title: string }[];

		return {
			params: { slug },
			props: { slug, meta, chapterEntries },
		};
	});
}

export const GET: APIRoute = async ({ props }) => {
	const { slug, meta, chapterEntries } = props as {
		slug: string;
		meta: BookMeta;
		chapterEntries: { slug: string; title: string }[];
	};

	const frontmatter = [
		"---",
		`title: "${meta.title}"`,
		`description: "${meta.description}"`,
		`publishedAt: "${new Date(meta.publishedAt).toISOString()}"`,
		meta.updatedAt
			? `updatedAt: "${new Date(meta.updatedAt).toISOString()}"`
			: "",
		meta.tags ? `tags: ${JSON.stringify(meta.tags)}` : "",
		meta.coverImg ? `coverImg: "${meta.coverImg}"` : "",
		`slug: "${slug}"`,
		`chaptersCount: ${chapterEntries.length}`,
		"---",
	]
		.filter(Boolean)
		.join("\n");

	const chaptersMd =
		chapterEntries.length > 0
			? [
					"## 目次",
					"",
					...chapterEntries.map(
						(ch, i) => `${i + 1}. [${ch.title}](/book/${slug}/${ch.slug}/)`,
					),
					"",
				].join("\n")
			: "## 目次\n\n（章がまだありません）\n";

	const summary = meta.summary?.trim()
		? `## 概要\n\n${meta.summary.trim()}\n`
		: "";

	// BOM を付けて、file:// 直開きでも文字化けしにくくする
	const rawContent = `\uFEFF${frontmatter}\n\n${chaptersMd}\n${summary}`;

	return new Response(rawContent, {
		headers: {
			"Content-Type": "text/markdown; charset=UTF-8",
			"X-Content-Type-Options": "nosniff",
		},
	});
};
