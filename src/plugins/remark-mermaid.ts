import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import type { Code, Html, Root } from "mdast";
import type { Parent } from "unist";
import { visit } from "unist-util-visit";

const isDev =
	process.env.NODE_ENV === "development" &&
	process.env.npm_lifecycle_event !== "build";
const CACHE_DIR = join(process.cwd(), ".cache", "mermaid");

function getCacheKey(source: string): string {
	return createHash("sha256").update(source.trim()).digest("hex");
}

async function getCachedSvg(cacheKey: string): Promise<string | null> {
	try {
		const filePath = join(CACHE_DIR, `${cacheKey}.svg`);
		return await readFile(filePath, "utf-8");
	} catch {
		// Why not throw: Cache miss is expected before initial generation
		return null;
	}
}

async function saveCachedSvg(cacheKey: string, svg: string): Promise<void> {
	try {
		await mkdir(CACHE_DIR, { recursive: true });
		const filePath = join(CACHE_DIR, `${cacheKey}.svg`);
		await writeFile(filePath, svg, "utf-8");
	} catch (err) {
		// Why not fail build: Failing to write disk cache should not abort SSG
		console.warn("[remark-mermaid] Failed to write SVG cache:", err);
	}
}

function encodeMermaidInk(source: string): string {
	const payload = JSON.stringify({
		code: source,
		mermaid: { theme: "default" },
	});
	return Buffer.from(deflateSync(payload, { level: 9 })).toString("base64url");
}

function encodeKroki(source: string): string {
	return Buffer.from(deflateSync(source, { level: 9 })).toString("base64url");
}

async function fetchSvgWithRetry(
	source: string,
	maxRetries = 2,
): Promise<string> {
	const endpoints = [
		`https://mermaid.ink/svg/pako:${encodeMermaidInk(source)}`,
		`https://kroki.io/mermaid/svg/${encodeKroki(source)}`,
	];

	let lastError: unknown;

	for (const url of endpoints) {
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const res = await fetch(url, {
					signal: AbortSignal.timeout(7000),
				});
				if (!res.ok) {
					throw new Error(`HTTP ${res.status}: ${res.statusText}`);
				}
				const svg = await res.text();
				if (!svg.startsWith("<svg")) {
					throw new Error("Response is not an SVG");
				}
				return svg;
			} catch (err) {
				lastError = err;
				if (attempt < maxRetries) {
					// Why not static delay: Exponential backoff avoids slamming remote endpoints
					await new Promise((resolve) => setTimeout(resolve, attempt * 500));
				}
			}
		}
	}

	throw lastError;
}

interface MermaidTask {
	node: Code;
	index: number;
	parent: Parent;
}

// Why not unbounded parallelism: Throttling requests avoids rate limiting and 500/502 errors
async function runWithConcurrencyLimit(
	tasks: (() => Promise<void>)[],
	limit: number,
): Promise<void> {
	let index = 0;
	async function worker() {
		while (index < tasks.length) {
			const currentIndex = index++;
			await tasks[currentIndex]();
		}
	}
	const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
		worker(),
	);
	await Promise.all(workers);
}

export function remarkMermaidSsr() {
	return async (tree: Root) => {
		const tasks: MermaidTask[] = [];

		visit(tree, "code", (node: Code, index?: number, parent?: Parent) => {
			if (node.lang === "mermaid" && parent && typeof index === "number") {
				tasks.push({ node, index, parent });
			}
		});

		if (tasks.length === 0) {
			return;
		}

		if (isDev) {
			for (const { node, index, parent } of tasks) {
				const safeValue = node.value
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;");
				parent.children[index] = {
					type: "html",
					value: `<pre class="mermaid my-8 flex text-foreground justify-center">${safeValue}</pre>`,
				} as Html;
			}
			return;
		}

		const renderTasks = tasks.map(({ node, index, parent }) => async () => {
			const cacheKey = getCacheKey(node.value);

			try {
				let svg = await getCachedSvg(cacheKey);

				if (!svg) {
					svg = await fetchSvgWithRetry(node.value);
					await saveCachedSvg(cacheKey, svg);
				}

				parent.children[index] = {
					type: "html",
					value: `<div class="mermaid-diagram my-8 flex justify-center [&>svg]:max-w-full [&>svg]:h-auto">${svg}</div>`,
				} as Html;
			} catch (err) {
				console.error(
					"[remark-mermaid] Failed to render Mermaid diagram:",
					err,
				);
				// Why not crash build: Safe fallback allows pages to render even if external APIs are down
				const safeValue = node.value
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;");
				parent.children[index] = {
					type: "html",
					value: `<pre class="mermaid my-8 flex text-foreground justify-center">${safeValue}</pre>`,
				} as Html;
			}
		});

		await runWithConcurrencyLimit(renderTasks, 2);
	};
}
