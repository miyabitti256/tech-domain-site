---
title: レイアウトとコンポーネント設計
---

## この章で学ぶこと

ここまで、各ページに `<html>`, `<head>`, `<body>` を繰り返し書いてきました。この章では、**レイアウト** を使ってページ間で共通のHTML構造を共有し、コードの重複を排除する方法を学びます。

## レイアウトとは

レイアウトは、`<html>`, `<head>`, `<meta>`, `<nav>`, `<footer>` といったページ共通の構造を1箇所にまとめるための特殊なコンポーネントです。Astroのレイアウトに特別な構文はなく、**`<slot />` を持つ通常の `.astro` コンポーネント** です。

## ベースレイアウトの作成

最も基本的なレイアウトを作成しましょう。

```astro
---
// src/layouts/BaseLayout.astro
interface Props {
  title: string;
  description?: string;
}

const { title, description = "Astroで作ったサイト" } = Astro.props;
---

<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <title>{title}</title>
  </head>
  <body>
    <nav>
      <a href="/">ホーム</a>
      <a href="/about">サイトについて</a>
      <a href="/blog">ブログ</a>
    </nav>

    <main>
      <slot />
    </main>

    <footer>
      <p>© 2026 My Astro Site</p>
    </footer>
  </body>
</html>
```

ページ側で使うときは、レイアウトをインポートして囲むだけです。

```astro
---
// src/pages/index.astro
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="ホーム">
  <h1>ようこそ！</h1>
  <p>Astroで構築したサイトです。</p>
</BaseLayout>
```

これでナビゲーションやフッター、`<head>` タグなどを毎回書く必要がなくなりました。

## レイアウトのネスト

レイアウトを入れ子にすることもできます。例えば、ベースレイアウトの上にブログ専用のレイアウトを重ねるパターンです。

```astro
---
// src/layouts/BlogPostLayout.astro
import BaseLayout from './BaseLayout.astro';

interface Props {
  title: string;
  pubDate: string;
}

const { title, pubDate } = Astro.props;
---

<BaseLayout title={title}>
  <article>
    <h1>{title}</h1>
    <time datetime={pubDate}>{pubDate}</time>
    <hr />
    <slot />
  </article>
</BaseLayout>
```

`BlogPostLayout` は `BaseLayout` をラップし、記事タイトルと日付を表示する構造を追加しています。

## Markdownレイアウト

Markdownファイルでは、frontmatterの `layout` プロパティでレイアウトを指定できます。

```md
---
title: はじめての記事
pubDate: 2026-04-15
layout: ../../layouts/BlogPostLayout.astro
---

ここに記事の本文を書きます。
Markdownの記法がそのまま使えます。
```

`layout` に指定したレイアウトコンポーネントには、frontmatterの値が自動的にPropsとして渡されます。つまり `BlogPostLayout` 側で `Astro.props.frontmatter.title` のようにアクセスできます。

```astro
---
// Markdownから使う場合、Propsの受け取り方が少し異なる
const { frontmatter } = Astro.props;
const { title, pubDate } = frontmatter;
---
```

ただし、後の章で学ぶ **Content Collections** を使う場合は、この `layout` frontmatterではなく、`[...slug].astro` の動的ルートからレイアウトを直接指定する方法が推奨されます。

## コンポーネント分割の判断基準

「いつコンポーネントに切り出すか」は初心者がよく迷うポイントです。実践的な判断基準を提示します。

### コンポーネントに切り出すべきとき

1. **同じHTMLの塊が2箇所以上で使われている** — DRY原則の適用
2. **ページが長くなりすぎて読みづらい** — 可読性の向上
3. **独立して意味のある単位** — カード、ヘッダー、フッターなど

### コンポーネントに切り出さなくてよいとき

1. **1箇所でしか使わない小さなHTML** — 過度な分割は逆に読みづらい
2. **将来使うかもしれないから** — YAGNI原則（必要になったら切り出す）
3. **行数を減らしたいだけ** — 行数削減が目的なら、分割は適切でない場合がある

### 推奨ディレクトリ構成

```
src/
├── components/
│   ├── common/          # サイト全体で使う共通コンポーネント
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   └── SEOHead.astro
│   ├── blog/            # ブログ機能に関するコンポーネント
│   │   ├── PostCard.astro
│   │   └── TagList.astro
│   └── ui/              # 汎用UIコンポーネント
│       ├── Button.astro
│       └── Card.astro
├── layouts/
│   ├── BaseLayout.astro # 全ページ共通の基盤レイアウト
│   └── BlogPostLayout.astro
└── pages/
```

コンポーネントの分類に正解はありませんが、**「用途別」に分けておくと見通しがよくなります**。小規模なサイトでは `components/` 直下にフラットに置くだけでも十分です。規模が大きくなってから整理しても遅くありません。

## まとめ

この章で学んだことを振り返ります。

1. **レイアウト** — `<slot />` を使ってページ共通の構造を共有する
2. **レイアウトのネスト** — レイアウトを入れ子にして構造を積み重ねられる
3. **Markdownレイアウト** — frontmatterの `layout` プロパティでレイアウトを指定する
4. **コンポーネント設計** — 切り出しの判断基準と推奨ディレクトリ構成

次の章では、スタイリングの方法を学びます。
