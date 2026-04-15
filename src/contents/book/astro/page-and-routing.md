---
title: ページとルーティング
---

## ページとルーティング

Astroでは、`src/pages/` ディレクトリに置いたファイルが**そのままURLにマッピング**されます。この仕組みを「ファイルベースルーティング」と呼びます。設定ファイルにルートを書く必要がなく、直感的にページを追加できます。

### ファイルとURLの対応

| ファイルパス | URL |
|---|---|
| `src/pages/index.astro` | `/` |
| `src/pages/about.astro` | `/about` |
| `src/pages/blog/index.astro` | `/blog` |
| `src/pages/blog/first-post.astro` | `/blog/first-post` |

### .astroファイルの基本構造

Astroのページは `.astro` ファイルで記述します。構造はシンプルで、上部の「フロントマタースクリプト」と下部の「HTMLテンプレート」の2つに分かれています。

```astro
---
// フロントマタースクリプト（サーバー側で実行されるJavaScript）
const title = "はじめてのAstroページ";
const author = "Taro";
---

<!-- HTMLテンプレート -->
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <title>{title}</title>
  </head>
  <body>
    <h1>{title}</h1>
    <p>著者: {author}</p>
  </body>
</html>
```

`---` で囲まれた部分がフロントマタースクリプトで、ここに書いたコードはビルド時にサーバー側で実行されます。変数の定義やデータの取得などをここで行い、テンプレート側で `{}` を使って展開します。

### 新しいページを追加してみる

試しに「自己紹介」ページを作成してみましょう。`src/pages/about.astro` を新規作成し、以下のように記述します。

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
  </body>
</html>
```

開発サーバーが起動中であれば、`http://localhost:4321/about` にアクセスするとページが表示されます。配列を `.map()` でループしてリスト表示できるのも、Astroの便利な点です。

### Markdownでページを作る

Astroは `.md` ファイルもそのままページとして扱えます。ブログ記事などのコンテンツは、Markdownで手軽に書けます。

`src/pages/blog/hello.md` を作成し、以下のように記述します。

```md
---
title: はじめての投稿
pubDate: 2026-04-15
---

## こんにちは

これはMarkdownで書いたAstroのページです。
```

`http://localhost:4321/blog/hello` でアクセスできます。ただし、この段階ではスタイルのないシンプルなHTMLが表示されます。