import { h } from "hastscript";
import type { Root, Text } from "mdast";
import { directiveFromMarkdown } from "mdast-util-directive";
import { directive } from "micromark-extension-directive";
import type { Plugin, Processor } from "unified";
import type { Node, Parent } from "unist";
import { visit } from "unist-util-visit";

interface DirectiveNode extends Parent {
	name: string;
	attributes?: Record<string, string>;
	data?: {
		hName?: string;
		hProperties?: Record<string, unknown>;
		hChildren?: unknown[];
		directiveLabel?: boolean;
		[key: string]: unknown;
	};
}

interface CustomUnifiedData {
	micromarkExtensions?: unknown[];
	fromMarkdownExtensions?: unknown[];
	[key: string]: unknown;
}

// サポートするインラインディレクティブとコンテナディレクティブのホワイトリスト
const SUPPORTED_TEXT_DIRECTIVES = new Set([
	"kbd",
	"badge",
	"ruby",
	"mark",
	"file",
	"spoiler",
	"icon",
]);
const SUPPORTED_CONTAINER_DIRECTIVES = new Set(["details", "steps"]);

// インラインアイコンのSVG辞書
const INLINE_ICONS: Record<string, string> = {
	check: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-green-600 dark:text-green-400 inline-block"><polyline points="20 6 9 17 4 12"/></svg>`,
	x: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-red-600 dark:text-red-400 inline-block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
	star: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="text-amber-500 inline-block"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
	zap: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" class="text-amber-500 inline-block"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
	external: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground inline-block"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
	copy: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground inline-block"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
	github: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="inline-block"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`,
};

const FILE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground shrink-0"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;

export const remarkCustomDirectives: Plugin<[], Root> = function (
	this: Processor,
) {
	const data = this.data() as CustomUnifiedData;
	if (!data.micromarkExtensions) {
		data.micromarkExtensions = [];
	}
	if (!data.fromMarkdownExtensions) {
		data.fromMarkdownExtensions = [];
	}

	// 全ディレクティブ構文（text, leaf, container）をmicromarkパーサーに登録
	data.micromarkExtensions.push(directive());
	data.fromMarkdownExtensions.push(directiveFromMarkdown());

	return (tree: Root) => {
		// 1. インラインディレクティブ（:name[...]）の変換とフォールバック
		visit(
			tree,
			"textDirective",
			(node: Node, index: number | undefined, parent: Parent | undefined) => {
				if (index === undefined || !parent) return;
				const directiveNode = node as DirectiveNode;

				// Why not: 全コロン構文を放置すると「4.5:1」のような比率表記まで空divになって破壊されるため、ホワイトリスト外はプレーンテキストへ復元する
				if (!SUPPORTED_TEXT_DIRECTIVES.has(directiveNode.name)) {
					const textNodes: Node[] = [
						{ type: "text", value: `:${directiveNode.name}` } as Text,
						...(directiveNode.children || []),
					];
					parent.children.splice(index, 1, ...textNodes);
					return index + textNodes.length;
				}

				const name = directiveNode.name;
				const attrs = directiveNode.attributes || {};

				if (name === "kbd") {
					// キートップ風スタイル
					directiveNode.data = {
						hName: "kbd",
						hProperties: {
							class:
								"inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-mono font-semibold text-foreground bg-muted/80 border border-border border-b-2 rounded shadow-2xs align-baseline mx-0.5",
						},
					};
				} else if (name === "badge") {
					// ピルバッジスタイル
					const variant = attrs.variant || "default";
					let colorClass = "bg-muted text-muted-foreground border-border";
					if (variant === "success" || variant === "green") {
						colorClass =
							"bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30";
					} else if (
						variant === "warning" ||
						variant === "yellow" ||
						variant === "amber"
					) {
						colorClass =
							"bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
					} else if (
						variant === "danger" ||
						variant === "red" ||
						variant === "error"
					) {
						colorClass =
							"bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30";
					} else if (variant === "info" || variant === "blue") {
						colorClass =
							"bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
					} else if (variant === "purple") {
						colorClass =
							"bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
					}

					directiveNode.data = {
						hName: "span",
						hProperties: {
							class: `inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full border leading-tight mx-1 align-baseline ${colorClass}`,
						},
					};
				} else if (name === "ruby") {
					// ルビ（ふりがな）
					const rtText = attrs.rt || "";
					directiveNode.data = {
						hName: "ruby",
						hProperties: { class: "ruby font-medium" },
						hChildren: [
							...(directiveNode.children as unknown[]),
							h("rp", ["("]),
							h(
								"rt",
								{ class: "text-[0.65em] text-muted-foreground font-normal" },
								[rtText],
							),
							h("rp", [")"]),
						],
					};
					directiveNode.children = [];
				} else if (name === "mark") {
					// 蛍光ペン風マーカー（文字の下部60%に色が被る定番スタイル）
					const color = attrs.color || attrs.variant || "yellow";
					let markerColor = "rgba(250, 204, 21, 0.45)"; // yellow
					if (color === "pink" || color === "red") {
						markerColor = "rgba(244, 114, 182, 0.45)";
					} else if (color === "green") {
						markerColor = "rgba(74, 222, 128, 0.45)";
					} else if (color === "blue" || color === "cyan") {
						markerColor = "rgba(96, 165, 250, 0.45)";
					} else if (color === "orange") {
						markerColor = "rgba(251, 146, 60, 0.45)";
					} else if (color === "purple") {
						markerColor = "rgba(192, 132, 252, 0.45)";
					}

					directiveNode.data = {
						hName: "mark",
						hProperties: {
							class:
								"font-semibold px-0.5 rounded-xs text-inherit bg-transparent",
							style: `background: linear-gradient(transparent 60%, ${markerColor} 60%);`,
						},
					};
				} else if (name === "file") {
					// ファイルパス・ファイル名表記（📄 アイコン付き）
					directiveNode.data = {
						hName: "span",
						hProperties: {
							class:
								"inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono text-foreground bg-muted/70 border border-border/80 rounded-md align-baseline mx-0.5 shadow-2xs",
						},
						hChildren: [
							{ type: "raw", value: FILE_ICON_SVG } as unknown,
							...(directiveNode.children as unknown[]),
						],
					};
					directiveNode.children = [];
				} else if (name === "spoiler") {
					// 伏せ字・ぼかし（ホバーまたはタップで解除）
					directiveNode.data = {
						hName: "span",
						hProperties: {
							class:
								"inline-block px-1.5 py-0.5 rounded-sm bg-muted/80 blur-xs hover:blur-none focus:blur-none active:blur-none transition-all duration-200 cursor-pointer select-none hover:select-text",
							title: "ホバーまたはクリックで表示",
						},
					};
				} else if (name === "icon") {
					// インラインアイコン
					const labelText =
						directiveNode.children?.[0]?.type === "text"
							? (directiveNode.children[0] as Text).value.trim()
							: "";
					const iconSvg = INLINE_ICONS[labelText] || "";
					if (iconSvg) {
						directiveNode.data = {
							hName: "span",
							hProperties: {
								class:
									"inline-flex items-center align-middle mx-0.5 text-current",
							},
							hChildren: [{ type: "raw", value: iconSvg } as unknown],
						};
						directiveNode.children = [];
					}
				}
			},
		);

		// 2. コンテナディレクティブ（:::details, :::steps）の変換
		visit(tree, "containerDirective", (astNode: Node) => {
			if (!("children" in astNode)) return;
			const node = astNode as DirectiveNode;
			if (!SUPPORTED_CONTAINER_DIRECTIVES.has(node.name)) return;

			if (!node.data) {
				node.data = {};
			}
			const data = node.data;
			const attributes = node.attributes || {};

			// :::steps の処理
			if (node.name === "steps") {
				data.hName = "div";
				data.hProperties = {
					class: "custom-steps",
				};
				return;
			}

			// :::details の処理
			if (node.name === "details") {
				data.hName = "details";
				data.hProperties = h("details", {
					class:
						"custom-details group border border-border/60 bg-muted/20 my-6 rounded-lg overflow-hidden",
					...attributes,
				}).properties as Record<string, unknown>;

				// タイトル部分の抽出
				const head = node.children[0] as DirectiveNode | undefined;
				let titleNodes: Node[] = [{ type: "text", value: "詳細" } as Text];
				if (head?.data?.directiveLabel) {
					titleNodes = head.children;
					node.children.shift();
				}

				const summaryNode = {
					type: "paragraph",
					data: {
						hName: "summary",
						hProperties: {
							class:
								"flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-bold text-foreground transition-colors hover:bg-muted/30 [&::-webkit-details-marker]:hidden",
						},
					},
					children: [
						{
							type: "paragraph",
							data: { hName: "span", hProperties: { class: "flex-1" } },
							children: titleNodes,
						},
						{
							type: "paragraph",
							data: {
								hName: "span",
								hProperties: {
									class: "text-muted-foreground",
									"data-chevron": "true",
								},
							},
							children: [
								{
									type: "html",
									value: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>`,
								},
							],
						},
					],
				};

				const contentWrapper = {
					type: "paragraph",
					data: {
						hName: "div",
						hProperties: {
							class:
								"border-t border-border/40 px-5 py-4 prose-sm md:prose-base",
						},
					},
					children: node.children,
				};

				node.children = [summaryNode, contentWrapper];
			}
		});
	};
};
