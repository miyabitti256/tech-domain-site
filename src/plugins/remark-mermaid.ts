import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";
import type { Code, Html, Root } from "mdast";
import type { Parent } from "unist";
import { visit } from "unist-util-visit";

// 現在の環境が開発モードか判定
const isDev = import.meta.env.DEV;

function encodeKroki(source: string) {
	return Buffer.from(deflateSync(source, { level: 9 })).toString("base64url");
}

export function remarkMermaidSsr() {
	return async (tree: Root) => {
		const promises: Promise<void>[] = [];

		visit(tree, "code", (node: Code, index?: number, parent?: Parent) => {
			if (node.lang === "mermaid") {
				if (isDev) {
					// Dev時はクライアントで描画するためのプレーンなタグを出力
					const safeValue = node.value
						.replace(/</g, "&lt;")
						.replace(/>/g, "&gt;");
					if (parent && typeof index === "number") {
						parent.children[index] = {
							type: "html",
							value: `<pre class="mermaid my-8 flex text-foreground justify-center">${safeValue}</pre>`,
						} as Html;
					}
				} else {
					// 本番時はKroki APIで静的なSVGに変換
					const encoded = encodeKroki(node.value);
					const url = `https://kroki.io/mermaid/svg/${encoded}`;
					promises.push(
						fetch(url)
							.then((res) => res.text())
							.then((svg) => {
								if (parent && typeof index === "number") {
									parent.children[index] = {
										type: "html",
										value: `<div class="mermaid-diagram my-8 flex justify-center [&>svg]:max-w-full [&>svg]:h-auto">${svg}</div>`,
									} as Html;
								}
							})
							.catch((err) => console.error("Mermaid SSR error:", err)),
					);
				}
			}
		});
		await Promise.all(promises);
	};
}
