import fs from "node:fs";
import path from "node:path";
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

const SIMPLE_ICONS_DIR = path.resolve("./node_modules/simple-icons-astro/dist");
const TABLER_ICONS_DIR = path.resolve(
	"./node_modules/@tabler/icons/icons/outline",
);

// よく使われる表記のエイリアスマップ
const ICON_ALIASES: Record<string, string> = {
	tailwind: "tailwindcss",
	js: "javascript",
	ts: "typescript",
	py: "python",
	rs: "rust",
	rb: "ruby",
	go: "golang",
	next: "nextdotjs",
	nextjs: "nextdotjs",
	vuejs: "vuedotjs",
	vue: "vuedotjs",
	node: "nodedotjs",
	nodejs: "nodedotjs",
	external: "external-link",
	link: "link",
	zap: "bolt",
	cross: "x",
	close: "x",
	twitter: "x-corp",
	"x-twitter": "x-corp",
	"brand-x": "x-corp",
};

// UIアイコンとしてTabler Iconsを優先するキーワード
// Why not: 「x」をSimple Icons優先で探すとTwitter/Xの企業ロゴ（𝕏）がヒットしてしまい、checkと対になる「バツ印（×）」が表示できなくなるため、UI記号はTabler Iconsを優先する
const PREFER_TABLER_ICONS = new Set([
	"x",
	"cross",
	"close",
	"check",
	"star",
	"copy",
	"external-link",
	"bolt",
]);

// ビルドパフォーマンス向上のためのインメモリSVGキャッシュ
const iconCache = new Map<string, string>();
let simpleIconFiles: string[] | null = null;

// Why not: アイコンを静的リストに限定すると新しい技術スタックやUIアイコンを追加するたびにプラグイン修正が必要になるため、マーキーセクションと同様にライブラリ（simple-icons / tabler）から動的に探索・キャッシュする
function resolveIconSvg(rawName: string): string | null {
	const trimmed = rawName.trim();
	if (!trimmed) return null;

	const lower = trimmed.toLowerCase();
	const name = ICON_ALIASES[lower] || trimmed;

	if (iconCache.has(name)) {
		return iconCache.get(name) || null;
	}

	// 0. Twitter / X の特別対応（Simple Icons の X.astro）
	if (name === "x-corp" && fs.existsSync(SIMPLE_ICONS_DIR)) {
		const filePath = path.join(SIMPLE_ICONS_DIR, "X.astro");
		if (fs.existsSync(filePath)) {
			const content = fs.readFileSync(filePath, "utf8");
			const match = content.match(/<path[^>]+>/);
			if (match) {
				const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="inline-block align-middle mx-0.5 shrink-0 text-current">${match[0]}</svg>`;
				iconCache.set(name, svg);
				iconCache.set(trimmed, svg);
				return svg;
			}
		}
	}

	// 1. UIアイコン（x, check, star 等）の場合は先に Tabler Icons を探索
	if (PREFER_TABLER_ICONS.has(name) && fs.existsSync(TABLER_ICONS_DIR)) {
		const kebab = name === "cross" || name === "close" ? "x" : name;
		const filePath = path.join(TABLER_ICONS_DIR, `${kebab}.svg`);
		if (fs.existsSync(filePath)) {
			let svg = fs.readFileSync(filePath, "utf8");
			svg = svg
				.replace(/width="24"/, 'width="14"')
				.replace(/height="24"/, 'height="14"')
				.replace(
					/<svg/,
					'<svg class="inline-block align-middle mx-0.5 shrink-0 text-current"',
				);
			iconCache.set(name, svg);
			iconCache.set(trimmed, svg);
			return svg;
		}
	}

	// 2. simple-icons-astro から探索（技術・ブランドアイコン）
	if (fs.existsSync(SIMPLE_ICONS_DIR)) {
		const clean = name
			.toLowerCase()
			.replace(/\./g, "dot")
			.replace(/\+/g, "plus")
			.replace(/#/g, "sharp")
			.replace(/[\s\-_]/g, "");
		const pascal = clean.charAt(0).toUpperCase() + clean.slice(1);
		const targetFile = `${pascal}.astro`;
		let filePath = path.join(SIMPLE_ICONS_DIR, targetFile);

		if (!fs.existsSync(filePath)) {
			if (!simpleIconFiles) {
				simpleIconFiles = fs.readdirSync(SIMPLE_ICONS_DIR);
			}
			const lowerTarget = targetFile.toLowerCase();
			const matched = simpleIconFiles.find(
				(f) => f.toLowerCase() === lowerTarget,
			);
			if (matched) {
				filePath = path.join(SIMPLE_ICONS_DIR, matched);
			}
		}

		if (filePath && fs.existsSync(filePath)) {
			const content = fs.readFileSync(filePath, "utf8");
			const match = content.match(/<path[^>]+>/);
			if (match) {
				const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="inline-block align-middle mx-0.5 shrink-0 text-current">${match[0]}</svg>`;
				iconCache.set(name, svg);
				iconCache.set(trimmed, svg);
				return svg;
			}
		}
	}

	// 3. @tabler/icons から探索（フォールバック）
	if (fs.existsSync(TABLER_ICONS_DIR)) {
		const kebab = name.toLowerCase().replace(/[\s_]/g, "-");
		const filePath = path.join(TABLER_ICONS_DIR, `${kebab}.svg`);
		if (fs.existsSync(filePath)) {
			let svg = fs.readFileSync(filePath, "utf8");
			svg = svg
				.replace(/width="24"/, 'width="14"')
				.replace(/height="24"/, 'height="14"')
				.replace(
					/<svg/,
					'<svg class="inline-block align-middle mx-0.5 shrink-0 text-current"',
				);
			iconCache.set(name, svg);
			iconCache.set(trimmed, svg);
			return svg;
		}
	}

	return null;
}

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
					// Why not: 半透明度（/80等）や淡いborderを使うと背景と同化してコントラスト比（AA/AAA）が不足するため、文字・ボーダーともに明瞭な不透明トークンを指定する
					const variant = attrs.variant || "default";
					let colorClass =
						"bg-zinc-100 text-zinc-900 border-zinc-300 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600";
					if (variant === "success" || variant === "green") {
						colorClass =
							"bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700/80";
					} else if (
						variant === "warning" ||
						variant === "yellow" ||
						variant === "amber"
					) {
						colorClass =
							"bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/80";
					} else if (
						variant === "danger" ||
						variant === "red" ||
						variant === "error"
					) {
						colorClass =
							"bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700/80";
					} else if (variant === "info" || variant === "blue") {
						colorClass =
							"bg-sky-50 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-700/80";
					} else if (variant === "purple") {
						colorClass =
							"bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-700/80";
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
					// 蛍光ペン風マーカー
					// Why not: インラインstyleで固定カラーを指定するとダークモード時のコントラスト比（白文字の埋没）に対応できないため、CSSクラスでテーマ別に配色とグラデーション高さを制御する
					const rawColor = attrs.color || attrs.variant || "yellow";
					let markColorClass = "custom-mark-yellow";
					if (rawColor === "pink" || rawColor === "red") {
						markColorClass = "custom-mark-pink";
					} else if (rawColor === "green") {
						markColorClass = "custom-mark-green";
					} else if (rawColor === "blue" || rawColor === "cyan") {
						markColorClass = "custom-mark-blue";
					} else if (rawColor === "orange") {
						markColorClass = "custom-mark-orange";
					} else if (rawColor === "purple") {
						markColorClass = "custom-mark-purple";
					}

					directiveNode.data = {
						hName: "mark",
						hProperties: {
							class: `custom-mark ${markColorClass}`,
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
					// インラインアイコン（simple-icons-astro および tabler-icons から動的に探索）
					const labelText =
						directiveNode.children?.[0]?.type === "text"
							? (directiveNode.children[0] as Text).value.trim()
							: "";
					const iconSvg = resolveIconSvg(labelText);
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
