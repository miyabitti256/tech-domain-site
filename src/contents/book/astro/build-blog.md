---
title: ブログサイトを作る
---

## この章で学ぶこと

ここまで学んできた知識を総動員して、実際のブログサイトを構築します。記事一覧、記事詳細、タグページ、RSSフィード、サイトマップまで実装します。

完成形のコードは [GitHub リポジトリ](https://github.com/) で公開しています（※準備中）。この章では要点を順に解説していきます。

## プロジェクトの全体構成

実際のブログサイトに適したディレクトリ構成を以下に示します。

```
my-blog/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── BaseHead.astro        # <head>の共通部分
│   │   ├── Header.astro          # ヘッダーナビゲーション
│   │   ├── Footer.astro          # フッター
│   │   ├── PostCard.astro        # 記事カード
│   │   └── TagList.astro         # タグリスト
│   ├── content/
│   │   └── blog/                 # ブログ記事（Markdown）
│   │       ├── first-post.md
│   │       └── second-post.md
│   ├── layouts/
│   │   ├── BaseLayout.astro      # 基本レイアウト
│   │   └── BlogPostLayout.astro  # 記事レイアウト
│   ├── pages/
│   │   ├── index.astro           # トップページ
│   │   ├── blog/
│   │   │   ├── index.astro       # 記事一覧
│   │   │   └── [id].astro        # 記事詳細（動的ルート）
│   │   ├── tags/
│   │   │   ├── index.astro       # タグ一覧
│   │   │   └── [tag].astro       # タグ別記事一覧
│   │   └── rss.xml.ts            # RSSフィード
│   ├── styles/
│   │   └── global.css            # グローバルスタイル
│   └── content.config.ts         # Content Collections設定
├── astro.config.mjs
├── tsconfig.json
└── package.json
```

## コンテンツスキーマの定義

前章で学んだContent Collectionsを設定します。

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    heroImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

## 記事一覧ページ

ブログの核となる記事一覧ページを実装します。

```astro
---
// src/pages/blog/index.astro
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';

const posts = (await getCollection('blog'))
  .filter((post) => !post.data.draft)
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
---

<BaseLayout title="ブログ" description="ブログ記事一覧">
  <h1>ブログ</h1>
  <div class="post-list">
    {posts.map((post) => (
      <PostCard
        title={post.data.title}
        description={post.data.description}
        pubDate={post.data.pubDate}
        tags={post.data.tags}
        href={`/blog/${post.id}`}
      />
    ))}
  </div>
</BaseLayout>

<style>
  .post-list {
    display: grid;
    gap: 1.5rem;
    max-width: 48rem;
  }
</style>
```

`PostCard` コンポーネントで各記事の表示を部品化しています。

```astro
---
// src/components/PostCard.astro
interface Props {
  title: string;
  description: string;
  pubDate: Date;
  tags: string[];
  href: string;
}

const { title, description, pubDate, tags, href } = Astro.props;
---

<article class="card">
  <a href={href}>
    <h2>{title}</h2>
    <time datetime={pubDate.toISOString()}>
      {pubDate.toLocaleDateString('ja-JP')}
    </time>
    <p>{description}</p>
    {tags.length > 0 && (
      <div class="tags">
        {tags.map((tag) => (
          <span class="tag">{tag}</span>
        ))}
      </div>
    )}
  </a>
</article>

<style>
  .card {
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 8px;
    padding: 1.5rem;
    transition: box-shadow 0.2s;
  }

  .card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .card a {
    text-decoration: none;
    color: inherit;
  }

  h2 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }

  time {
    color: var(--color-text-muted, #6b7280);
    font-size: 0.875rem;
  }

  p {
    margin-top: 0.5rem;
    color: var(--color-text-muted, #6b7280);
  }

  .tags {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;
  }

  .tag {
    background: var(--color-bg-secondary, #f3f4f6);
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }
</style>
```

## 記事詳細ページ

動的ルーティングで各記事のページを生成します。

```astro
---
// src/pages/blog/[id].astro
import type { GetStaticPaths } from 'astro';
import { getCollection, render } from 'astro:content';
import BlogPostLayout from '../../layouts/BlogPostLayout.astro';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('blog');
  return posts
    .filter((post) => !post.data.draft)
    .map((post) => ({
      params: { id: post.id },
      props: { post },
    }));
};

const { post } = Astro.props;
const { Content } = await render(post);
---

<BlogPostLayout
  title={post.data.title}
  description={post.data.description}
  pubDate={post.data.pubDate}
  updatedDate={post.data.updatedDate}
  tags={post.data.tags}
>
  <Content />
</BlogPostLayout>
```

## タグページ

タグ一覧と、タグ別の記事一覧ページを実装します。

```astro
---
// src/pages/tags/index.astro
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

const posts = await getCollection('blog');
const tags = [...new Set(posts.flatMap((post) => post.data.tags))].sort();
---

<BaseLayout title="タグ一覧">
  <h1>タグ一覧</h1>
  <ul class="tag-list">
    {tags.map((tag) => (
      <li>
        <a href={`/tags/${tag}`}>{tag}</a>
      </li>
    ))}
  </ul>
</BaseLayout>

<style>
  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    list-style: none;
    padding: 0;
  }

  .tag-list a {
    display: inline-block;
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 4px;
    text-decoration: none;
    font-size: 0.875rem;
  }

  .tag-list a:hover {
    background: var(--color-bg-secondary, #f3f4f6);
  }
</style>
```

```astro
---
// src/pages/tags/[tag].astro
import type { GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import PostCard from '../../components/PostCard.astro';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('blog');
  const tags = [...new Set(posts.flatMap((post) => post.data.tags))];

  return tags.map((tag) => ({
    params: { tag },
    props: {
      posts: posts
        .filter((post) => post.data.tags.includes(tag))
        .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()),
    },
  }));
};

const { tag } = Astro.params;
const { posts } = Astro.props;
---

<BaseLayout title={`タグ: ${tag}`}>
  <h1>タグ: {tag}</h1>
  <p>{posts.length}件の記事</p>
  <div class="post-list">
    {posts.map((post) => (
      <PostCard
        title={post.data.title}
        description={post.data.description}
        pubDate={post.data.pubDate}
        tags={post.data.tags}
        href={`/blog/${post.id}`}
      />
    ))}
  </div>
  <a href="/tags">← すべてのタグ</a>
</BaseLayout>

<style>
  .post-list {
    display: grid;
    gap: 1.5rem;
    max-width: 48rem;
    margin: 1rem 0;
  }
</style>
```

## RSSフィード

`@astrojs/rss` パッケージを使って、RSSフィードを生成します。

```sh
npm install @astrojs/rss
```

```ts
// src/pages/rss.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog'))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: 'My Astro Blog',
    description: 'Astroで構築したブログ',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}`,
    })),
  });
}
```

`astro.config.mjs` に `site` が設定されていることを確認してください。

```js
export default defineConfig({
  site: 'https://example.com',
});
```

## サイトマップ

`@astrojs/sitemap` インテグレーションを使えば、サイトマップを自動生成できます。

```sh
npx astro add sitemap
```

これだけで、ビルド時に全ページのサイトマップが `sitemap-index.xml` として生成されます。

## 記事数がスケールしたときの考え方

ブログ記事が増えたときの対応策について解説します。

### 100記事以下の場合

上記の構成でまったく問題ありません。AstroのSSGビルドは非常に高速で、100ページ程度のビルドは数秒で完了します。

### 100〜1000記事の場合

以下のポイントを意識しましょう。

- **一覧ページのページネーション** を実装する（1ページに全記事を表示しない）
- **画像の最適化** — `<Image />` コンポーネントを使って自動的にWebP変換・リサイズする
- **ビルドキャッシュ** を活用する（Astro 7.2の実験的な増分ビルド機能）

### 1000記事以上の場合

- **SSRモードの検討** — すべてのページをビルド時に生成するのではなく、リクエスト時に生成する
- **ページネーション + 検索機能** — 記事を探す手段を充実させる
- **カテゴリやシリーズでの整理** — 情報アーキテクチャの見直し

重要なのは、**最初から大規模を想定して複雑にしない** ことです。SSGで始めて、必要に応じてSSRに移行するのがAstroの正しい使い方です。

## まとめ

この章で構築したブログサイトの構成を振り返ります。

1. **Content Collections** でスキーマ定義 + 型安全な記事管理
2. **記事一覧** — `getCollection()` + フィルタ + ソート
3. **記事詳細** — 動的ルーティング + `render()`
4. **タグページ** — `flatMap()` + `Set` でユニークなタグを抽出
5. **RSS / サイトマップ** — 公式パッケージで簡単に生成

次の章では、ドキュメントサイトの構築方法を学びます。
