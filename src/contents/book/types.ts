export type BookMeta = {
	/** 本のタイトル */
	title: string;
	/** 本の概要（一覧表示やOGP用） */
	description: string;
	/** 本のサマリー（本のトップページに本文として表示） */
	summary: string;
	/** タグ */
	tags?: string[];
	/** 公開日 */
	publishedAt: string;
	/** 更新日 */
	updatedAt?: string;
	/** カバー画像パス */
	coverImg?: string;
	/** 章のslug一覧（順序を定義） */
	chapters: string[];
};

/**
 * meta.ts で型補完を効かせるためのヘルパー関数
 * @example
 * ```ts
 * import { defineBookMeta } from "../types";
 * export default defineBookMeta({ ... });
 * ```
 */
export function defineBookMeta(meta: BookMeta): BookMeta {
	return meta;
}
