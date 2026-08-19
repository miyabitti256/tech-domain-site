---
title: ページとルーティング
---

## この章で学ぶこと

Astroの **ファイルベースルーティング** の仕組みを理解し、静的ページや動的ページを作成する方法を学びます。

## ファイルベースルーティング

Astroでは、`src/pages/` ディレクトリに置いたファイルが **そのままURLにマッピング** されます。設定ファイルにルートを書く必要はありません。

### ファイルとURLの対応

| ファイルパス | URL |
|---|---|
| `src/pages/index.astro` | `/` |
| `src/pages/about.astro` | `/about` |
| `src/pages/blog/index.astro` | `/blog` |
| `src/pages/blog/first-post.astro` | `/blog/first-post` |

ディレクトリ構造がそのままURLの階層になる、直感的なルーティングです。

### 対応するファイル形式

`src/pages/` ディレクトリでは、以下のファイル形式がページとして認識されます。

- `.astro` — Astroコンポーネント
- `.md` / `.mdx` — Markdown / MDX
- `.html` — 静的HTML

## 静的ページを作ってみる

実際にページを作成してみましょう。`src/pages/about.astro` を新規作成します。

```astro
---
const name = "Taro";
const skills = ["HTML", "CSS", "JavaScript", "Astro"];
---

<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <title>自己紹介</title>
  </head>
  <body>
    <h1>{name}の自己紹介</h1>
    <h2>スキル</h2>
    <ul>
      {skills.map((skill) => <li>{skill}</li>)}
    </ul>
    <a href="/">トップに戻る</a>
  </body>
</html>
```

開発サーバーが起動中であれば、`http://localhost:4321/about` でアクセスできます。

## Markdownでページを作る

Astroは `.md` ファイルもページとして扱えます。ブログ記事のようなテキスト中心のコンテンツは、Markdownで書くのが効率的です。

`src/pages/blog/hello.md` を作成してみましょう。

```md
---
title: はじめての投稿
layout: ../layouts/BaseLayout.astro
---

## こんにちは

これはMarkdownで書いたAstroのページです。
リストも普通に使えます:

- Astroは高速
- Markdownが使える
- 設定が簡単
```

`http://localhost:4321/blog/hello` でアクセスできます。frontmatterの `layout` プロパティについては、次章「レイアウトとコンポーネント設計」で詳しく解説します。

## 動的ルーティング

ブログの記事ページのように、同じテンプレートで異なるデータを表示したい場合は **動的ルーティング** を使います。

### 基本の動的ルート

ファイル名に `[]` を使うと、その部分がパラメータになります。

```astro
---
// src/pages/blog/[slug].astro
import type { GetStaticPaths } from 'astro';

export const getStaticPaths: GetStaticPaths = () => {
  return [
    { params: { slug: 'first-post' }, props: { title: '最初の記事' } },
    { params: { slug: 'second-post' }, props: { title: '2番目の記事' } },
    { params: { slug: 'third-post' }, props: { title: '3番目の記事' } },
  ];
};

const { slug } = Astro.params;
const { title } = Astro.props;
---

<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <title>{title}</title>
  </head>
  <body>
    <h1>{title}</h1>
    <p>スラッグ: {slug}</p>
    <a href="/blog">← 記事一覧に戻る</a>
  </body>
</html>
```

`getStaticPaths()` はSSG（静的生成）モードで使用する関数です。ビルド時に生成するすべてのパスを返す必要があります。この例では `/blog/first-post`、`/blog/second-post`、`/blog/third-post` の3ページが生成されます。

### レストパラメータ

`[...slug]` を使うと、複数階層のパスをまとめてキャッチできます。

```astro
---
// src/pages/docs/[...slug].astro
import type { GetStaticPaths } from 'astro';

export const getStaticPaths: GetStaticPaths = () => {
  return [
    { params: { slug: 'getting-started' } },
    { params: { slug: 'guides/routing' } },
    { params: { slug: 'guides/styling' } },
    { params: { slug: 'api/config' } },
  ];
};

const { slug } = Astro.params;
---

<h1>ドキュメント: {slug}</h1>
```

これにより `/docs/getting-started`、`/docs/guides/routing`、`/docs/guides/styling`、`/docs/api/config` の4ページが生成されます。

## ルーティング設計のベストプラクティス

URL設計のベストプラクティスを、SEOとユーザビリティの観点から解説します。

### URL設計のルール

良いURL設計は、ユーザーにとっても検索エンジンにとっても重要です。

| ルール | 良い例 | 悪い例 |
|---|---|---|
| 小文字を使う | `/blog/my-first-post` | `/Blog/My_First_Post` |
| ハイフンで区切る | `/about-us` | `/about_us` |
| 階層を浅く保つ | `/blog/astro-guide` | `/blog/2026/04/15/astro-guide` |
| 意味のある名前をつける | `/docs/routing` | `/docs/page-3` |
| 末尾スラッシュを統一する | `/about/` or `/about` | 混在はNG |

### サイト種別ごとの推奨URL構造

```
【ブログサイト】
/                    トップページ
/blog/               記事一覧
/blog/[slug]/        記事詳細
/tags/               タグ一覧
/tags/[tag]/         タグ別記事一覧
/about/              このサイトについて

【ドキュメントサイト】
/                    トップページ
/docs/               ドキュメントトップ
/docs/[...slug]/     各ドキュメントページ
/blog/               更新情報ブログ
```

日付ベースのURL（`/blog/2026/04/15/my-post`）は避けることを推奨します。記事の内容は変わらないのにURLが日付に依存してしまうため、リライトや更新時にURLが変わりにくい `slug` ベースのURLが望ましいです。

## まとめ

この章で学んだことを振り返ります。

1. **ファイルベースルーティング** — `src/pages/` のファイル構造がそのままURLになる
2. **静的ページ** — `.astro` ファイルや `.md` ファイルでページを作成できる
3. **動的ルーティング** — `[slug].astro` や `[...slug].astro` でパラメータ付きのページを生成できる
4. **`getStaticPaths()`** — SSGモードで動的ルートの全パスを定義する

次の章では、レイアウトを使ってページ間で共通のHTML構造を共有する方法を学びます。
