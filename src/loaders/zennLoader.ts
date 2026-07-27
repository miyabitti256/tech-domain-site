import type { Loader } from "astro/loaders";
import { XMLParser } from "fast-xml-parser";

interface RSSItem {
	title: string;
	description?: string;
	link: string;
	pubDate: string;
	enclosure?: {
		"@_url": string;
	};
}

export function zennLoader(username: string): Loader {
	const feedUrl = `https://zenn.dev/${username}/feed`;

	return {
		name: "zenn-rss-loader",
		load: async ({ store, logger }) => {
			logger.info(`Fetching Zenn RSS: ${feedUrl}`);

			let xmlData: string;
			try {
				const response = await fetch(feedUrl);
				if (!response.ok) {
					logger.error(`Failed to fetch Zenn RSS (HTTP ${response.status})`);
					return;
				}
				xmlData = await response.text();
			} catch (e) {
				logger.error(`Network error while fetching Zenn RSS: ${String(e)}`);
				return;
			}

			const parser = new XMLParser({
				ignoreAttributes: false,
				attributeNamePrefix: "@_",
			});

			let result: {
				rss?: { channel?: { item?: RSSItem | RSSItem[] } };
			};
			try {
				result = parser.parse(xmlData);
			} catch (e) {
				logger.error(`Failed to parse Zenn RSS XML: ${String(e)}`);
				return;
			}

			const rawItems = result.rss?.channel?.item ?? [];
			const items: RSSItem[] = Array.isArray(rawItems) ? rawItems : [rawItems];

			store.clear();

			for (const item of items) {
				// link を ID として使用（URL から一意なスラグを生成）
				const id = item.link.replace(/^https?:\/\//, "").replace(/\//g, "_");
				const imageUrl = item.enclosure?.["@_url"] ?? undefined;

				store.set({
					id,
					data: {
						title: item.title,
						description: item.description
							? item.description.replace(/<[^>]*>?/gm, "").trim()
							: "",
						link: item.link,
						pubDate: item.pubDate,
						imageUrl,
					},
				});
			}

			logger.info(`Loaded ${items.length} articles from Zenn`);
		},
	};
}
