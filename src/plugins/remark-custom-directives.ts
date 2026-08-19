import { h } from "hastscript";
import type { Root, Text } from "mdast";
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

export function remarkCustomDirectives() {
	return (tree: Root) => {
		visit(tree, "containerDirective", (astNode: Node) => {
			if (!("children" in astNode)) return;
			const node = astNode as DirectiveNode;
			if (node.name !== "details") return;

			if (!node.data) {
				node.data = {};
			}
			const data = node.data;
			const attributes = node.attributes || {};

			data.hName = "details";
			data.hProperties = h("details", {
				class:
					"custom-details group border border-border/60 bg-muted/20 my-6 rounded-lg overflow-hidden",
				...attributes,
			}).properties as Record<string, unknown>;

			// :::details[タイトル] 構文のタイトル部分を抽出
			const head = node.children[0] as DirectiveNode | undefined;
			let titleNodes: Node[] = [{ type: "text", value: "詳細" } as Text];
			if (head?.data?.directiveLabel) {
				titleNodes = head.children;
				node.children.shift();
			}

			// サマリー（見出し）部分の構築
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

			// コンテンツ部分のラッパー構築
			const contentWrapper = {
				type: "paragraph",
				data: {
					hName: "div",
					hProperties: {
						class: "border-t border-border/40 px-5 py-4 prose-sm md:prose-base",
					},
				},
				children: node.children,
			};

			node.children = [summaryNode, contentWrapper];
		});
	};
}
