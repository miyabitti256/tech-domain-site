---
title: "テックブログサイトを公開しました"
description: "Astro + TailwindCSS + StarwindUI + GSAPで構築したテックブログサイトを公開しました。技術選定の背景からこだわりのアニメーション実装、SEO対策まで詳しく解説します。"
publishedAt: 2026-04-12
tags: ["Astro", "TailwindCSS", "Figma","GSAP"]
image: "/assets/images/tech-hero.webp"
---

## はじめに

テック系の発信をするためのサイトを公開しました。

これまでは[Zenn](https://zenn.dev/)を中心にアウトプットしてきましたが、**自分のドメインでコンテンツを育てていきたい**という気持ちが強くなり、自前でテックブログを構築することにしました。せっかく作るなら見た目にもこだわりたいし、パフォーマンスも妥協したくない。そんなモチベーションで今回のサイトを作り上げました。

この記事では、使用した技術スタックの選定理由から、こだわったポイントの実装詳細までを一通りまとめています。

## スタック

| 技術 | 用途 |
|------|------|
| **Astro 6** | フレームワーク (SSG) |
| **TailwindCSS v4** | ユーティリティファーストCSS |
| **StarwindUI** | Astroネイティブのコンポーネントライブラリ |
| **GSAP** | SVGストロークアニメーション |
| **remark / rehype プラグイン** | Markdown拡張（カスタムディレクティブ、リンクカード、OEmbed等） |
| **satori + sharp** | OGP画像の自動生成 |
| **Cloudflare Workers** | ホスティング & エッジ配信 |

### なぜAstroなのか

Astroを選んだ最大の理由は、**デフォルトでクライアントサイドJSがゼロ**という思想です。過去に作ったサイトはSvelteKitでしたが、ブログのように大半が静的コンテンツであるサイトでは、ReactやNext.jsを使用することでクライアントにロードされる重いランタイムは不要です(まあ、SvelteKitのクライアントランタイムはかなり小さいですが)。Astroなら必要な箇所だけインタラクティブにでき(アイランドアーキテクチャ)、不要なJavaScriptはビルド時に完全に除去されます。

また、Content Collectionsによる型安全なMarkdown管理や、View Transitionsによるページ遷移アニメーションなど、ブログ開発に必要な機能が標準で充実している点も決め手でした。

## こだわり

### ヒーローセクションのアニメーション

トップページのヒーローセクションでは、**SVGストロークアニメーション**で手書き風の署名が描画されるようにしています。

https://cruw.co.jp/blog/svg-stroke-animation/

上記の記事を参考にしつつ、独自の工夫を加えて実装しました。

#### 制作の流れ

1. **Figmaでパスを作成** — `Momo Signature`フォントを背景に、ペンツールでなぞってSVGのパスを作成しました
![Figmaで作ったsvgの画像](/assets/images/article/svg-stroke.webp)
2. **パスデータの抽出** — FigmaからSVGをエクスポートし、エディタ上で`<path>`のみをコピーして`.astro`ファイルに貼り付け
3. **GSAPによるアニメーション制御** — CSSの`stroke-dasharray` / `stroke-dashoffset`だけでもストロークアニメーションは実現できますが、**1文字ずつ順番に描画される自然な動き**を表現するため、GSAPのタイムラインを使用しました

#### 技術的なポイント

GSAPのスクリプト内では、FigmaからエクスポートしたSVGの`<path>`データを **`M`（moveto）コマンドごとに分割** し、各セグメントをシーケンシャルにアニメーションさせています。これにより、1つの長いパスを一気に描くのではなく、**筆順に沿って1画ずつ描かれる**ような自然な動きが実現できています。

```javascript
// パスを「M」コマンド単位で分割
const segments = d.split(/(?=M)/);

segments.forEach((seg) => {
  const newPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  newPath.setAttribute("d", seg);
  // ...
});
```

アニメーションの速度は、各セグメントの`getTotalLength()`から算出しパスの長さに比例する`duration`を設定しています。これにより、短い線は素早く、長い曲線はゆっくりと描かれるため、手書き感がより自然になります。

### マーキーセクション

ヒーロー直下のタグマーキー（無限スクロール）は、見た目以上に難しかったです。

#### シームレスなループの実現

CSSの`@keyframes`で`translateX`を使ったループ自体は単純ですが、**途切れなくシームレスに繋がる**ようにするには計算が必要です。

- ビルド時に最低2セットのタグリストをSSRで配置
- クライアント側で、1セット目の実幅を計測し、ビューポートを埋めるのに必要なセット数を動的にクローン
- `--marquee-offset`をpx単位で正確に設定し、ちょうど1セット分だけ移動させてループさせる
- 移動速度は`50px/s`固定とし、セット幅から`duration`を算出

#### アクセシビリティ対応

Lighthouseの監査で、`aria-hidden="true"` の要素内にフォーカス可能な`<a>`タグがあるという警告が出たため、クローンされたセットのリンクには `tabindex="-1"` を付与して対処しています。1セット目だけがキーボード操作によるフォーカスを受け付ける設計です。

#### Simple iconsを使ったアイコン表示
設定されたタグから、動的にアイコンを読み込むため、Viteに`@node_modules`内のSimple-icons-astroを読み込んでもらい、静的解析して、アイコンを表示しています。

```astro title="TagMarquee.astro
---
// ...
// Viteの解析制限を回避するため、globでアイコンを全件スキャン
const iconComponents = import.meta.glob(
	"../../../../node_modules/simple-icons-astro/dist/*.astro",
	{
		eager: true,
	},
);

// タグ名からSimple Iconsのファイル名を生成するユーティリティ
const getIconFileName = (tag: string) => {
	// 基本的な変換規則: 小文字化し、記号を単語に置換
	const name = tag
		.toLowerCase()
		.replace(/\./g, "dot")
		.replace(/\+/g, "plus")
		.replace(/\s+/g, "");

	// 先頭を大文字にする (Simple Icons Astroの命名規則)
	return name.charAt(0).toUpperCase() + name.slice(1);
};

// アイコンコンポーネントを取得
const iconMap = Object.fromEntries(
	uniqueTags.map((tag) => {
		const fileName = getIconFileName(tag);
		const path = `../../../../node_modules/simple-icons-astro/dist/${fileName}.astro`;
		const mod = iconComponents[path];
		return [tag, mod?.default || null];
	}),
);
---
```

### テーマ切り替えアニメーション

https://yui540.com/

のオープニングアニメーションを~~パクっ~~参考に、ほぼ完璧に再現しました。テーマ切り替え時にカーテンが画面を覆い、裏でダーク/ライトの切り替えを行い、カーテンが開くとテーマが切り替わっているという演出です。

### 本風UIとページ遷移アニメーション

`/book` の一覧では、各本を**立体的な表紙付きカード**として表示しています。`perspective` と `transform-style: preserve-3d` で奥行きを付け、背表紙・表紙の表裏・最初のページなどをレイヤー分けしています。ホバー時は表紙だけが左端を軸に `rotateY` で少し開き、その下の「最初のページ」がちら見えするようにして、一覧の上で本をめくるような雰囲気を出しています。

#### 一覧から詳細へ：座標の受け渡しと GSAP

一覧のリンククリック時に、カードの `.book-container` に対して `getBoundingClientRect()` で**画面上の位置とサイズ**を取得し、`sessionStorage` に JSON で保存します。遷移自体は Astro の View Transitions で行い、通常の `<a>` 遷移よりもページ切り替えとスクリプトの流れを制御しやすくしています。

詳細ページ（`/book/[slug]/`）では、`astro:page-load` 時に保存値を読み取り、**遷移元の矩形**と**詳細ページ側の本コンテナの実寸**からスケール比と平行移動量を計算します。その上で GSAP のタイムラインで
1. コンテナ全体をカード位置相当からレイアウト上の位置へ移動・スケール
2. 疑似 3D の表紙をヒンジ（デスクトップは右端、モバイルも右端基準で開く方向を切り替え）で開閉
3. 中身のスライダーやクリップを同期させる
という流れにしています。これで「一覧にあった小さな本が、詳細ページの見開きにスッと広がる」ような連続した印象になります。

#### View Transitions のルートフェードとの両立

サイト全体では `global.css` でルートの `::view-transition-old(new)` に短いフェードを当てていますが、この遷移だけは**ブラウザ標準のクロスフェードと GSAP が二重に効かない**ようにする必要があります。クリック直前に `html` に `disable-vt-fade` を付与し、ルート向けの `::view-transition-group(root)` / `::view-transition-old(root)` / `::view-transition-new(root)` に `animation: none !important` を当ててフェードを止めています（テーマ切り替えの節で触れた、View Transitions と独自演出の共存パターンと同じ発想です）。アニメーション完了後は不要なインラインスタイルを `clearProps` で外し、疑似表紙レイヤーは `display: none` に戻して通常の閲覧 UI に復帰させています。

### 記事詳細ページ

タイポグラフィは`miyabitti.com`で公開しているものと同じスタイルを適用しています。

https://miyabitti.com/note/typography/

### StarwindUI

[こちらの記事](/article/starwind-ui)で紹介したStarwindUIを使っています。

このサイトでは以下のコンポーネントを使用しています。

- **Button** — ヒーローのCTAボタン、記事共有ボタンなど
- **Badge** — 記事タグの表示
- **Card** — 記事カード
- **Breadcrumb** — パンくずナビゲーション
- **Sheet** — モバイルナビゲーションメニュー
- **Pagination** — 記事一覧のページネーション
- **Dropdown** — ヘッダーメニュー

Reactなどの追加フレームワークに依存せず、Astroネイティブな`.astro`コンポーネントとして使えるため、Astroの「ゼロJSデフォルト」という思想と非常に相性が良いです。

### OGP画像の自動生成

各記事のOGP画像は、**satori + sharp** の組み合わせでビルド時に自動生成しています。

satoriはJSXライクなテンプレートからSVGを生成するVercel製のライブラリです。そして、sharpでWebPに変換しています。記事のタイトルからOGP画像を自動で生成できるため、Figmaなどで手動で画像を作る手間が省けます。

### AIクローラー向け対応

近年のLLMブームを受けて、AI が効率的にサイトの内容を把握できるような仕組みも組み込みました。

- **プレーンMarkdown配信** — 各記事のURLの末尾に`.md`とつけることで、HTMLではなくプレーンなMarkdownを返却するようにしました。AIエージェントが記事の内容をHTMLのパースなしに直接取得できます
- **`llms.txt`の設置** — [llms.txt仕様](https://llmstxt.org/)に準拠したファイルを動的に生成。サイトのタイトル、説明、全記事へのリンク（`.md`付き）を一覧で提供し、AIがサイト構造を効率的にクロールできるようにしています

### SEO対策

基本的なSEO対策は一通り実施しています。

| 施策 | 詳細 |
|------|------|
| **title / description** | 全ページに適切なメタタグを設定。記事ページは`{記事タイトル} \| サイト名`の形式 |
| **OGP / Twitter Card** | 全ページに`og:title`, `og:description`, `og:image`およびTwitter Card用メタタグを設定 |
| **構造化データ (JSON-LD)** | トップページに`WebSite`、記事ページに`Article`と`BreadcrumbList`スキーマを埋め込み |
| **sitemap.xml** | Astro公式の`@astrojs/sitemap`で自動生成 |
| **robots.txt** | クローラー向けに簡単なディレクティブを設定 |
| **canonical URL** | 全ページにcanonicalリンクを設定し、重複コンテンツの問題を防止 |
| **RSS** | 最新20件の`rss.xml`と全件の`rss-all.xml`を自動生成 |
| **Google Analytics** | ユーザーの最初のインタラクション（マウス移動、スクロール等）時に遅延読み込みすることで、初期ロードのパフォーマンスを犠牲にしない設計 |

### ホスティング

Cloudflare Workersを使ってデプロイしています。SSGでビルドした静的ファイルをグローバルエッジから高速に配信できます。

## 目標

- 日々の学びを小さくても良いから発信する
- TypeScriptについてや、フロントエンドフレームワーク・ライブラリについて発信する
- 記事を増やしてGoogleにインデックスされる
- Lighthouseスコアは常にパフォーマンス95+,それ以外100を維持する

rssの登録や、SNSフォロー等、応援よろしくお願いします😊