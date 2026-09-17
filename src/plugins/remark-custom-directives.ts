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
const SUPPORTED_TEXT_DIRECTIVES = new Set(["kbd", "badge", "ruby", "mark"]);
const SUPPORTED_CONTAINER_DIRECTIVES = new Set(["details"]);

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
				}
			},
		);

		// 2. コンテナディレクティブ（:::details のみ）の変換
		visit(tree, "containerDirective", (astNode: Node) => {
			if (!("children" in astNode)) return;
			const node = astNode as DirectiveNode;
			if (!SUPPORTED_CONTAINER_DIRECTIVES.has(node.name)) return;

			if (!node.data) {
				node.data = {};
			}
			const data = node.data;
			const attributes = node.attributes || {};

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
