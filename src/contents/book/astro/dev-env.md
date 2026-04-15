---
title: 環境構築
---

## 環境構築

この章では、Astroの開発環境をセットアップする手順を解説します。

### 必要なもの

- **Node.js** v22.12.0以上（[公式サイト](https://nodejs.org/)からインストール）: v23のような奇数バージョンはサポート対象外
- **テキストエディタ**（[VS Code](https://code.visualstudio.com/) 推奨）
- **ターミナル**

Node.jsのバージョンは以下のコマンドで確認できます。

```sh
node -v
```

使用しているエディタがVSCode系であるなら、[Astro拡張機能](https://marketplace.visualstudio.com/items?itemName=astro-build.astro-vscode)を導入しましょう。

### プロジェクトの作成

Astroが公式に提供しているCLIツールを使って、プロジェクトを作成します。

```sh
npm create astro@latest
```

実行するとhoustonによる対話形式でセットアップが進みます。

```bash
astro Launch sequence initiated.

dir Where should we create your new project?
./my-astro-site

tmpl How would you like to start your new project?
— Use blog template

ts Do you plan to write TypeScript?
— Yes

use How strict should TypeScript be?
— Strict

deps Install dependencies?
— Yes

git Initialize a new git repository?
— Yes
```


今回は例としてブログテンプレートを選択していますが、シンプルな構成から始めたい場合は「Empty」を選ぶとよいでしょう。

### 開発サーバーの起動

プロジェクトが作成できたら、ディレクトリに移動して開発サーバーを起動します。

```sh
cd my-astro-site
npm run dev
```

`http://localhost:4321` をブラウザで開くと、Astroのサンプルページが表示されます。これで環境構築は完了です！

### プロジェクトの構造

作成されたプロジェクトの主なディレクトリ・ファイル構成は以下の通りです。

```
my-astro-site/
├── public/ # 画像・フォントなどの静的ファイル
├── src/
│ ├── components/ # 再利用可能なコンポーネント
│ ├── layouts/ # ページレイアウト
│ └── pages/ # ページ（ファイル名がそのままURLになる）
├── astro.config.mjs # Astroの設定ファイル
└── package.json
```

特に重要なのは `src/pages/` ディレクトリです。ここに置いたファイルが自動的にルーティングされ、URLとして公開されます。
詳しくは後ほどの章で解説します。