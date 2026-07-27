/**
 * localStorageを用いた読了状況の管理ユーティリティ
 */

const STORAGE_KEY = "tech-domain-book-progress";

export type BookProgressMap = Record<string, string[]>;

/**
 * localStorageから全読了データを取得する
 * Note: SSR環境ではlocalStorageが存在しないためガードを入れている (Why not direct access)
 */
export function getAllBookProgress(): BookProgressMap {
	if (typeof window === "undefined") return {};
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		return data ? JSON.parse(data) : {};
	} catch {
		return {};
	}
}

/**
 * 指定した本の読了章リストを取得する
 */
export function getReadChapters(bookSlug: string): string[] {
	const all = getAllBookProgress();
	return all[bookSlug] || [];
}

/**
 * 指定した章が読了済みかを判定する
 */
export function isChapterRead(bookSlug: string, chapterSlug: string): boolean {
	const read = getReadChapters(bookSlug);
	return read.includes(chapterSlug);
}

/**
 * 指定した章の読了状態を切り替え、カスタムイベントを通知する
 */
export function toggleChapterRead(
	bookSlug: string,
	chapterSlug: string,
): boolean {
	if (typeof window === "undefined") return false;

	const all = getAllBookProgress();
	const current = all[bookSlug] || [];
	const isRead = current.includes(chapterSlug);

	let next: string[];
	if (isRead) {
		next = current.filter((c) => c !== chapterSlug);
	} else {
		next = [...current, chapterSlug];
	}

	all[bookSlug] = next;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
		window.dispatchEvent(
			new CustomEvent("book-progress-updated", {
				detail: { bookSlug, chapterSlug, isRead: !isRead, readChapters: next },
			}),
		);
	} catch (e) {
		console.error("Failed to save book progress", e);
	}

	return !isRead;
}

/**
 * 本の読了率と読了数を計算する
 */
export function getBookProgress(
	bookSlug: string,
	totalChapters: number,
): { readCount: number; percentage: number } {
	if (totalChapters === 0) return { readCount: 0, percentage: 0 };
	const read = getReadChapters(bookSlug);
	const readCount = read.length;
	const percentage = Math.min(
		100,
		Math.round((readCount / totalChapters) * 100),
	);
	return { readCount, percentage };
}
