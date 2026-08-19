---
title: スタイリング
---

## この章で学ぶこと

Astroにおけるスタイリングの方法を学びます。スコープ付きスタイル、グローバルスタイル、そして外部CSSフレームワークの導入方法まで、一通りカバーします。

## スコープ付きスタイル

Astroでは、`.astro` ファイル内に `<style>` タグを書くと、そのスタイルは **自動的にそのコンポーネントにスコープ** されます。

```astro
---
// src/components/Card.astro
---

<div class="card">
  <h3>タイトル</h3>
  <p>説明文がここに入ります。</p>
</div>

<style>
  .card {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 1.5rem;
  }

  h3 {
    color: #333;
    margin-bottom: 0.5rem;
  }
</style>
```

ここで定義した `.card` や `h3` のスタイルは、**このコンポーネントの中だけに適用** されます。他のコンポーネントに同じクラス名があっても影響しません。

Astroは内部的に、各要素にユニークな属性（`data-astro-cid-xxxx`）を自動付与し、CSSセレクタにもその属性を追加することでスコープを実現しています。

## グローバルスタイル

サイト全体に適用するスタイル（リセットCSS、フォント、基本的な色など）は、グローバルスタイルとして定義します。

### 方法1: レイアウトに直接書く

```astro
---
// src/layouts/BaseLayout.astro
---

<html lang="ja">
  <head>
    <style is:global>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: system-ui, sans-serif;
        line-height: 1.6;
        color: #333;
      }

      a {
        color: #0066cc;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <slot />
  </body>
</html>
```

`is:global` ディレクティブを `<style>` タグに追加すると、スコープが解除され、サイト全体にスタイルが適用されます。

### 方法2: 外部CSSファイルをインポート

スタイルが多くなった場合は、外部CSSファイルに切り出してインポートするのが整理しやすくなります。

```css
/* src/styles/global.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, sans-serif;
  line-height: 1.6;
  color: #333;
}
```

```astro
---
// src/layouts/BaseLayout.astro
import '../styles/global.css';
---
```

フロントマターでCSSファイルをインポートすると、ビルド時にバンドルされ、最適化された状態で配信されます。

## CSS変数とデザイントークン

サイト全体で色やフォントサイズを一貫して使うために、CSS変数（カスタムプロパティ）を活用しましょう。

```css
/* src/styles/global.css */
:root {
  /* カラー */
  --color-primary: #6366f1;
  --color-primary-dark: #4f46e5;
  --color-text: #1f2937;
  --color-text-muted: #6b7280;
  --color-bg: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-border: #e5e7eb;

  /* フォントサイズ */
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;

  /* スペーシング */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
}
```

コンポーネント内では `var()` で参照します。

```astro
<style>
  .card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    padding: var(--space-6);
    border-radius: 8px;
  }

  .card h3 {
    color: var(--color-primary);
    font-size: var(--text-xl);
  }
</style>
```

CSS変数を使う利点は、デザインの変更が一箇所で済むことと、ダークモード対応が容易になることです。

```css
/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #f9fafb;
    --color-bg: #111827;
    --color-bg-secondary: #1f2937;
    --color-border: #374151;
  }
}
```

## Tailwind CSSの導入

Tailwind CSSを使いたい場合は、Astroのインテグレーションで簡単に導入できます。

```sh
npx astro add tailwindcss
```

このコマンドを実行すると、必要なパッケージのインストールと `astro.config.mjs` の更新が自動的に行われます。

```js
// astro.config.mjs（自動更新される）
import { defineConfig } from 'astro/config';
import tailwindcss from '@astrojs/tailwindcss';

export default defineConfig({
  integrations: [tailwindcss()],
});
```

以降、`.astro` ファイル内でTailwindのユーティリティクラスが使えるようになります。

```astro
<div class="bg-white border rounded-lg p-6 shadow-sm">
  <h3 class="text-xl font-bold text-indigo-600">タイトル</h3>
  <p class="text-gray-600 mt-2">説明文</p>
</div>
```

## スタイリング手法の比較

Astroで使えるスタイリング手法を比較し、使い分けの指針を示します。

| 手法 | 特徴 | 適したケース |
|---|---|---|
| **Astroスコープ付きCSS** | デフォルトで使える。追加設定不要 | ほとんどのプロジェクト |
| **CSS Modules** | ファイル単位のスコープ。慣れた人向け | React/Next.jsからの移行時 |
| **Tailwind CSS** | ユーティリティファースト。高速な開発 | プロトタイプ、チーム開発 |
| **CSS-in-JS (styled-components等)** | JSと密結合。ランタイムコスト有 | Astroでは基本的に非推奨 |
| **Sass / SCSS** | ネスト、変数、ミックスイン | 大規模プロジェクト |

### Astroでの推奨

Astroの **スコープ付きCSS + CSS変数** の組み合わせが、最もAstroの思想に合っています。理由は以下の通りです。

1. **ゼロランタイム** — CSS-in-JSと違い、ランタイムのJavaScriptを必要としない
2. **追加の設定不要** — 標準で使える
3. **既存のCSS知識がそのまま活きる** — 新しい記法を覚える必要がない

Tailwind CSSもAstroと相性が良い選択肢です。ビルド時に未使用クラスが除去されるため、ランタイムコストがかかりません。チームで統一されたスタイルを保ちたい場合に有効です。

一方、`styled-components` や `Emotion` のようなCSS-in-JSライブラリは、ランタイムでJavaScriptが必要になるため、Astroの「ゼロJS」の思想と相反します。Astroでは使用を避けるのが賢明です。

## まとめ

この章で学んだことを振り返ります。

1. **スコープ付きスタイル** — `<style>` タグのスタイルは自動的にそのコンポーネントにスコープされる
2. **グローバルスタイル** — `is:global` ディレクティブまたは外部CSSのインポートで全体適用
3. **CSS変数** — デザイントークンとして一元管理し、変更やダークモード対応を容易にする
4. **Tailwind CSS** — `npx astro add tailwindcss` で簡単に導入可能

次の章では、Astro Islandsを使って、ページにインタラクティブなUIを追加する方法を学びます。
