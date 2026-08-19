---
title: 環境構築
---

## この章で学ぶこと

この章では、Astroの開発環境をセットアップし、最初のプロジェクトを作成して動かすところまでを行います。

## 必要なもの

- **Node.js** v22.12.0以上（[公式サイト](https://nodejs.org/)からLTS版をインストール）
  - v23のような奇数バージョンはサポート対象外です
- **テキストエディタ**（[VS Code](https://code.visualstudio.com/) 推奨）
- **ターミナル**

Node.jsのバージョンは以下のコマンドで確認できます。

```sh
node -v
```

## プロジェクトの作成

Astroが公式に提供しているCLIツールを使って、プロジェクトを作成します。

```sh
npm create astro@latest
```

実行すると、Houstonによる対話形式でセットアップが進みます。

```
astro   Launch sequence initiated.

dir   Where should we create your new project?
      ./my-astro-site

tmpl  How would you like to start your new project?
      — Empty

ts    Do you plan to write TypeScript?
      — Yes

use   How strict should TypeScript be?
      — Strict

deps  Install dependencies?
      — Yes

git   Initialize a new git repository?
      — Yes
```

テンプレートは **Empty** を選択してください。本書ではゼロから構築していくため、ブログテンプレートなどの既成品は使いません。

## VS Code拡張の導入

VS Codeを使用している場合は、[Astro拡張機能](https://marketplace.visualstudio.com/items?itemName=astro-build.astro-vscode)を導入しましょう。`.astro` ファイルのシンタックスハイライト、型チェック、自動補完が利用できるようになります。

## 開発サーバーの起動

プロジェクトが作成できたら、ディレクトリに移動して開発サーバーを起動します。

```sh
cd my-astro-site
npm run dev
```

`http://localhost:4321` をブラウザで開くと、Astroの初期ページが表示されます。

開発サーバーはファイルの変更を自動検知し、ブラウザをリアルタイムで更新してくれます（HMR: Hot Module Replacement）。コードを書いたらすぐに結果を確認できます。

## プロジェクトの構造

作成されたプロジェクトの構成を確認しましょう。

```
my-astro-site/
├── public/           # 静的ファイル（画像・フォントなど）
├── src/
│   └── pages/        # ページ（ファイル名がそのままURLになる）
│       └── index.astro
├── astro.config.mjs  # Astroの設定ファイル
├── tsconfig.json     # TypeScript設定
└── package.json
```

### astro.config.mjs

Astroの中心となる設定ファイルです。インテグレーションの追加やビルドの挙動など、プロジェクト全体の設定をここで管理します。

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  // サイトのURL（デプロイ先のURL）
  site: 'https://example.com',
});
```

初期状態ではほぼ空ですが、後の章でインテグレーションの追加やSSR設定などを行う際にここに追記していきます。各設定項目は必要になったタイミングで解説します。

### tsconfig.json

TypeScriptの設定ファイルです。AstroはデフォルトでTypeScriptをサポートしています。

```json
{
  "extends": "astro/tsconfigs/strict"
}
```

`extends` にはAstroが提供する3つのプリセットから選べます。

- `astro/tsconfigs/base` — 最低限
- `astro/tsconfigs/strict` — 厳格（推奨）
- `astro/tsconfigs/strictest` — 最も厳格

パスエイリアスを設定しておくと、深いディレクトリからのインポートが楽になります。

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

これにより、`../../components/Button.astro` のような相対パスの代わりに `@components/Button.astro` と書けるようになります。

### src/pages/

**最も重要なディレクトリ**です。ここに置いたファイルが自動的にURLにマッピングされます。詳しくは「ページとルーティング」の章で解説します。

### public/

画像やフォント、`favicon.ico` など、ビルド処理なしにそのまま配信したいファイルを置くディレクトリです。`public/images/logo.png` に置いたファイルは、`/images/logo.png` というURLでアクセスできます。

## まとめ

この章で行ったことを振り返ります。

1. `npm create astro@latest` でプロジェクトを作成
2. `npm run dev` で開発サーバーを起動
3. プロジェクトの基本構造を理解

次の章では、Astroの核となる `.astro` ファイルの書き方を学んでいきます。
