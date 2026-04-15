import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { zennLoader } from "@/loaders/zennLoader";

const article = defineCollection({
	loader: glob({
		pattern: "**/[^_]*.{md,mdx}",
		base: "./src/contents/article",
	}),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		publishedAt: z.coerce.date(),
		updatedAt: z.coerce.date().optional(),
		tags: z.array(z.string()).optional(),
		image: z.string().optional(),
	}),
});

const book = defineCollection({
	loader: glob({
		pattern: "**/[^_]*.{md,mdx}",
		base: "./src/contents/book",
	}),
	schema: z.object({
		title: z.string(),
	}),
});

const zenn = defineCollection({
	loader: zennLoader("miyabitti"),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		link: z.url(),
		pubDate: z.string(),
		imageUrl: z.url().optional(),
	}),
});

export const collections = { article, book, zenn };
