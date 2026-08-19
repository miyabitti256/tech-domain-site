---
title: Astroの構文
---

## この章で学ぶこと

Astroの核となる `.astro` ファイルの書き方を学びます。コンポーネント、Props、スロットなど、Astroのテンプレート構文を一通り理解することがこの章のゴールです。

## .astroファイルの基本構造

`.astro` ファイルは、上部の **フロントマタースクリプト** と下部の **HTMLテンプレート** の2つに分かれています。

```astro
---
// フロントマタースクリプト（サーバー側で実行される）
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

`---`（コードフェンス）で囲まれた部分がフロントマタースクリプトです。ここに書いたコードは **ビルド時にサーバー側で実行** され、ブラウザには送られません。テンプレート側で `{変数名}` を使って値を展開します。

## 式の埋め込み

テンプレート内では `{}` を使ってJavaScriptの式を埋め込めます。

```astro
---
const name = "Astro";
const year = 2026;
const items = ["HTML", "CSS", "JavaScript"];
---

<p>{name}を{year}年に学ぶ</p>
<p>合計: {1 + 2 + 3}</p>
<p>大文字: {name.toUpperCase()}</p>
```

## 条件分岐

テンプレート内での条件分岐には、JavaScriptの論理演算子や三項演算子を使います。

```astro
---
const isLoggedIn = true;
const role = "admin";
---

<!-- 論理AND演算子: 条件がtrueのときだけ表示 -->
{isLoggedIn && <p>ログイン済みです</p>}

<!-- 三項演算子: 条件によって表示を切り替え -->
<p>{role === "admin" ? "管理者" : "一般ユーザー"}</p>
```

## リストのレンダリング

配列のデータを `.map()` でループして表示できます。

```astro
---
const skills = ["HTML", "CSS", "JavaScript", "Astro"];
---

<ul>
  {skills.map((skill) => <li>{skill}</li>)}
</ul>
```

## コンポーネント

`.astro` ファイルはそのままコンポーネントとして再利用できます。`src/components/` ディレクトリに部品を作り、他のファイルからインポートして使います。

### 基本的なコンポーネント

```astro
---
// src/components/Greeting.astro
const { name } = Astro.props;
---

<p>こんにちは、{name}さん！</p>
```

使う側:

```astro
---
// src/pages/index.astro
import Greeting from '../components/Greeting.astro';
---

<html lang="ja">
  <body>
    <Greeting name="Taro" />
    <Greeting name="Hanako" />
  </body>
</html>
```

## Props — コンポーネントにデータを渡す

Propsは親コンポーネントから子コンポーネントにデータを渡す仕組みです。TypeScriptで型を定義すると、型安全にデータを扱えます。

```astro
---
// src/components/Card.astro
interface Props {
  title: string;
  description: string;
  href?: string; // 省略可能なProp
}

const { title, description, href = "#" } = Astro.props;
---

<article>
  <h3><a href={href}>{title}</a></h3>
  <p>{description}</p>
</article>
```

`interface Props` で型を定義し、`Astro.props` で受け取ります。`href = "#"` のように分割代入でデフォルト値も設定できます。

## スロット — コンポーネントの中身を外から差し込む

スロットは、コンポーネントの「穴」にあたる部分です。外側から任意のコンテンツを差し込めます。

```astro
---
// src/components/Alert.astro
interface Props {
  type?: "info" | "warning" | "error";
}

const { type = "info" } = Astro.props;
---

<div class={`alert alert-${type}`}>
  <slot />
</div>
```

使う側:

```astro
---
import Alert from '../components/Alert.astro';
---

<Alert type="warning">
  <strong>注意:</strong> この操作は取り消せません。
</Alert>
```

`<slot />` の位置に、タグの内側に書いたコンテンツが挿入されます。

### 名前付きスロット

複数の「穴」を用意したい場合は、名前付きスロットを使います。

```astro
---
// src/components/Layout.astro
---

<div class="page">
  <header>
    <slot name="header" />
  </header>
  <main>
    <slot /> <!-- デフォルトスロット -->
  </main>
  <footer>
    <slot name="footer" />
  </footer>
</div>
```

使う側:

```astro
---
import Layout from '../components/Layout.astro';
---

<Layout>
  <h1 slot="header">サイトタイトル</h1>

  <p>メインコンテンツがここに入ります。</p>

  <p slot="footer">© 2026</p>
</Layout>
```

## .astroファイルはJSXでもHTMLでもない

ReactやJSXに慣れた方が陥りやすい罠を整理します。

Astroのテンプレート構文はJSXに似ていますが、いくつかの重要な違いがあります。

### `class` をそのまま使う

ReactではHTML属性の `class` を `className` と書く必要がありますが、Astroでは **`class` をそのまま使います**。

```astro
<!-- ✅ Astro: classをそのまま使う -->
<div class="container">...</div>

<!-- ❌ Astro: classNameは使わない -->
<div className="container">...</div>
```

### `for` をそのまま使う

同様に、`<label>` の `for` 属性も `htmlFor` ではなく `for` をそのまま使います。

```astro
<!-- ✅ Astro -->
<label for="email">メール</label>

<!-- ❌ ReactのJSX記法 -->
<label htmlFor="email">メール</label>
```

### HTMLコメントが使える

JSXでは `{/* ... */}` を使いますが、Astroでは標準の **HTMLコメント** がそのまま使えます。

```astro
<!-- ✅ Astro: HTMLコメントがそのまま使える -->
<p>こんにちは</p>

<!-- ❌ JSX式のコメントは不要（使えるがHTMLコメントが推奨） -->
```

### イベントハンドラはそのまま書けない

ここが最も重要な違いです。Astroのテンプレートは **サーバー側でレンダリングされる** ため、`onClick` などのReact的なイベントハンドラは使えません。

```astro
<!-- ❌ これは動かない -->
<button onClick={() => alert('clicked')}>クリック</button>

<!-- ✅ 標準のHTML + <script>タグで対応 -->
<button id="my-btn">クリック</button>

<script>
  document.getElementById('my-btn')?.addEventListener('click', () => {
    alert('clicked');
  });
</script>
```

インタラクティブな操作が必要な場合は、`<script>` タグを使うか、React/Vue/Svelteなどのコンポーネントを「Island」として組み込みます（第8章で詳しく解説します）。

### 比較まとめ

| 構文 | React (JSX) | Astro |
|---|---|---|
| CSSクラス | `className` | `class` |
| ラベル | `htmlFor` | `for` |
| コメント | `{/* ... */}` | `<!-- ... -->` |
| イベント | `onClick={fn}` | `<script>` タグ or Island |
| フラグメント | `<>...</>` | 不要（そのまま並べればOK） |
| 閉じタグ | 必須（`<img />`） | HTMLの仕様に従う（`<img>` も可） |

## まとめ

この章で学んだことを振り返ります。

1. `.astro` ファイルは **フロントマター + テンプレート** の2部構成
2. テンプレート内で `{}` を使ってJavaScript式を埋め込める
3. コンポーネントは **Props** でデータを受け取り、**スロット** で中身を差し込む
4. JSXに似ているが異なる点がいくつかある（`class` / イベントハンドラ等）

次の章では、これらの知識を使ってページを作成し、ルーティングの仕組みを学びます。
