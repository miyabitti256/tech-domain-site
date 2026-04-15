---
title: 設定ファイルについて
---

## 設定ファイル

Astroプロジェクトには、いくつかの設定ファイルが存在します。それぞれの役割を把握しておくと、プロジェクトのカスタマイズがスムーズになります。

### astro.config.mjs

Astroの中心となる設定ファイルです。プロジェクトルートに配置され、インテグレーションの追加やビルドの挙動などをここで管理します。

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  // サイトのURL（デプロイ先のURL）
  site: 'https://example.com',

  // ベースパス（サブディレクトリにデプロイする場合）
  base: '/',

  // 出力モード: 'static'（SSG）| 'server'（SSR）
  output: 'static',
});
```

よく使う設定項目は以下の通りです。

- **`site`** — デプロイ先のURL。サイトマップ生成などに使われる
- **`base`** — サブディレクトリにデプロイする際のベースパス
- **`output`** — ビルドの出力モード（SSG・SSR・ハイブリッド）
- **`integrations`** — React・Tailwindなどのインテグレーションを追加
- **`build`** — ビルド成果物の出力先などを細かく設定

### インテグレーションの追加例

たとえば、Tailwind CSSを使いたい場合は以下のようにインテグレーションを追加します。

```sh
npx astro add tailwind
```

コマンドを実行すると、`astro.config.mjs` が自動的に更新されます。

```js
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
});
```

### tsconfig.json

TypeScriptの設定ファイルです。AstroはデフォルトでTypeScriptをサポートしており、`tsconfig.json` でその挙動を管理します。

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@components/*": ["src/components/*"],
      "@layouts/*": ["src/layouts/*"]
    }
  }
}
```

`extends` には `astro/tsconfigs/base`・`strict`・`strictest` の3つの厳格度から選べます。`paths` を設定しておくと、`../../components/Button.astro` のような相対パスの代わりに `@components/Button.astro` と書けるようになり便利です。

### .env ファイル

APIキーなどの環境変数は `.env` ファイルで管理します。Astroは [Vite](https://vitejs.dev/) をベースにしているため、Viteの環境変数の仕組みをそのまま利用できます。

```sh
# .env
PUBLIC_SITE_TITLE="My Astro Blog"
SECRET_API_KEY="xxxxxxxxxxxxxxxx"
```

- `PUBLIC_` プレフィックスを付けた変数はクライアント側でも参照可能
- プレフィックスなしの変数はサーバー側（フロントマタースクリプト）でのみ参照可能

```astro
***
// サーバー側でのみ参照可能
const apiKey = import.meta.env.SECRET_API_KEY;

// クライアント側でも参照可能
const siteTitle = import.meta.env.PUBLIC_SITE_TITLE;
***
```

`.env` ファイルには機密情報を含むことが多いため、`.gitignore` に追加してGitの管理対象から外しておきましょう。