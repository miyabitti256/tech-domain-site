# 🚀 tech.miyabitti.com

[![Astro](https://img.shields.io/badge/Astro_6-FF5D01?logo=astro&logoColor=white)](https://astro.build/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS_v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

**パフォーマンスとデザインに妥協しない、個人テックブログサイト。**

Astro 6 + TailwindCSS v4 + GSAP で構築。SSG による静的配信と、こだわり抜いたアニメーション・UIを両立しています。

🔗 **[tech.miyabitti.com](https://tech.miyabitti.com)**

---

## ✨ Features

| 機能 | 概要 |
|------|------|
| 🎨 **SVGストロークアニメーション** | Figmaで作成した手書き署名をGSAPで1画ずつ描画 |
| 🎠 **マーキーセクション** | 動的クローンによるシームレスな無限スクロール |
| 🌓 **テーマ切り替えアニメーション** | カーテン演出でダーク/ライトをシネマティックに切り替え |
| 📖 **本風UI & 3Dページ遷移** | perspective + GSAP で表紙が開くインタラクション |
| 🖼️ **OGP画像の自動生成** | satori + sharp でビルド時に記事タイトルからOGPを生成 |
| 🤖 **AI対応** | llms.txt / Markdown配信でLLMフレンドリー |
| 🔍 **全文検索** | Fuse.jsによるクライアントサイド検索 |
| 📡 **RSS** | 最新20件 + 全件の2種類を自動生成 |

---

## 🛠️ Tech Stack

```
Framework    : Astro 6 (SSG / Islands Architecture)
Styling      : TailwindCSS v4 + Tailwind Typography
Components   : StarwindUI (Astroネイティブ)
Animation    : GSAP (SVGストローク / ページ遷移)
Code Blocks  : Expressive Code (GitHub Dark/Light)
Markdown     : remark + rehype プラグインチェーン
OGP          : satori + sharp
Search       : Fuse.js
Hosting      : Cloudflare Workers
Lint/Format  : Biome
```

### Markdown プラグイン構成

```
remark-mermaid-ssr → remark-github-alerts → remark-breaks
→ remark-directive → remark-custom-directives → remark-embeds
→ remark-link-card-plus → remark-math
→ rehype-slug → rehype-autolink-headings → rehype-external-links
→ rehype-mathjax
```

---

## 🏗️ Architecture

```
src/
├── components/
│   ├── common/          # Header, Footer, ThemeToggle 等
│   ├── layouts/         # ページレイアウト
│   ├── markdown/        # Markdown拡張コンポーネント
│   ├── page/            # ページ固有のUI（Hero, BookCard 等）
│   └── starwind/        # StarwindUI コンポーネント
├── contents/            # Markdown記事 & Bookコンテンツ
├── data/                # サイトメタデータ
├── layouts/             # Astro レイアウト
├── loaders/             # コンテンツローダー
├── pages/               # ルーティング
│   ├── article/         # 記事ページ
│   ├── book/            # Book ページ
│   ├── search/          # 検索ページ
│   ├── llms.txt.ts      # LLM向けサイトマップ
│   ├── rss.xml.ts       # RSS フィード
│   └── rss-all.xml.ts   # RSS 全件フィード
├── plugins/             # remark/rehype カスタムプラグイン
└── styles/              # グローバルCSS
```

---

## 🎯 こだわりの実装

### SVGストロークアニメーション

Figmaでペンツールを使い手書き署名のSVGパスを作成。GSAPタイムラインで `M`（moveto）コマンド単位に分割し、各セグメントを順次アニメーションさせることで **筆順に沿った自然な描画** を実現。

```javascript
// パスを「M」コマンド単位で分割 → 1画ずつ描画
const segments = d.split(/(?=M)/);
segments.forEach((seg) => {
  const newPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  newPath.setAttribute("d", seg);
  // duration は getTotalLength() に比例 → 短い線は速く、長い曲線はゆっくり
});
```

### テーマ切り替えアニメーション

カーテンが画面を覆い → 裏でテーマを差し替え → カーテンが開くシネマティックな演出。View Transitions の DOM スナップショットによるちらつきを回避するため、実 DOM で制御しカーテン以外のアニメーションを一時無効化。

### 本風UI & 3D ページ遷移

- `perspective` + `transform-style: preserve-3d` で立体的な表紙カードを表現
- ホバーで表紙が `rotateY` で開き、最初のページがちら見え
- 一覧→詳細の遷移時は `getBoundingClientRect()` で座標を `sessionStorage` に保存
- 詳細ページで GSAP タイムラインによりカード位置から展開する連続アニメーション
- View Transitions のルートフェードは `disable-vt-fade` クラスで選択的に無効化

### AI フレンドリー設計

- **Markdown 配信**: 記事URLに `.md` を付加するとプレーンMarkdownを返却
- **llms.txt**: [llms.txt仕様](https://llmstxt.org/) 準拠のサイトマップを動的生成

---

## 📊 SEO

| 施策 | 詳細 |
|------|------|
| title / description | 全ページに適切なメタタグを設定 |
| OGP / Twitter Card | 自動生成OGP画像を含む全メタタグ |
| 構造化データ (JSON-LD) | `WebSite` / `Article` / `BreadcrumbList` |
| sitemap.xml | `@astrojs/sitemap` で自動生成 |
| canonical URL | 全ページに設定 |
| RSS | 最新20件 + 全件の2種類 |
| Google Analytics | ユーザー初回インタラクション時に遅延読み込み |

---

## 🚀 Getting Started

### 必要な環境

- **Node.js** >= 22.12.0
- **Bun** (パッケージマネージャ)

### セットアップ

```bash
# 依存関係のインストール
bun install

# 開発サーバー起動 (localhost:4321)
bun dev

# プロダクションビルド
bun build

# ビルドのプレビュー
bun preview
```

### コマンド一覧

| コマンド | 説明 |
|----------|------|
| `bun dev` | 開発サーバー起動（OGP生成 → Astro dev） |
| `bun build` | プロダクションビルド → `./dist/` |
| `bun build:ogp` | OGP画像のみ生成 |
| `bun preview` | ビルドのローカルプレビュー |
| `bun new:article` | 新しい記事テンプレートを生成 |
| `bun new:book` | 新しいBookテンプレートを生成 |

