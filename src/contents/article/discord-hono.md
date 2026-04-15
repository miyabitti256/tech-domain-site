---
title: "無料でDiscordBotを運用できる「Discord Hono」を使ってみた 【初学者向け】"
description: "常時稼働は出来ませんが、Cloudflare WorkersでDiscordBotを運用できるライブラリ「Discord Hono」を紹介します。"
publishedAt: 2026-04-15
tags: ["Cloudflare Workers", "Discord", "Hono"]
image: "/assets/images/discord-hono.webp"
---

## はじめに

Discord Botを運用しようとすると、サーバーの用意をしなければならず、コスト面などで非常にハードルが高いと感じます。無料枠で運用することも可能ですが、どこまでのスケールが無料なのかや、自動スリープ対策等ハック的なことをしなければならなかったりと下調べも簡単ではありません。

そこで、Cloudflare Workersで動かせるDiscord Botライブラリである、`Discord Hono`を紹介します。

https://discord-hono.luis.fun/ja/

## 従来のDiscord Botはどう動いているか

まず、一般的なDiscord Botがどのように動作しているかを簡単に説明します。

従来のBotは**WebSocket**[^websocket]と呼ばれる仕組みを使って、Discordのサーバーと**常時接続**しています。ユーザーがメッセージを送ったり、コマンドを使ったりすると、その情報がリアルタイムでBotに届き、Botが反応します。

この方式だと、Botは24時間常にプログラムを起動し続ける**サーバー**[^server]が必要です。これがコストや管理の手間がかかる原因です。

## サーバーレスとCloudflare Workers

### サーバーレスとは

**サーバーレス**[^serverless]とは、「サーバーを自分で管理しない」仕組みのことです。サーバーが存在しないわけではなく、クラウドサービス側がサーバーを管理してくれます。プログラムは「リクエストが来たときだけ起動」し、処理が終わると停止します。そのため待機中のコストがかからず、スケーリングも自動で行われます。

### Cloudflare Workersとは

**Cloudflare Workers**[^cfworkers]は、Cloudflareが提供するサーバーレス実行環境です。世界中に分散したエッジサーバー[^edge]上でコードが実行されるため、ユーザーの近くで高速に動作します。無料プランでは1日10万リクエストまで使用できます。

Discord HonoはこのCloudflare Workersで動作するDiscord Botライブラリです。WebSocketによる常時接続の代わりに、**HTTP**[^http]を使ってDiscordからのイベントを受け取ります。

## できること・できないこと

サーバーレス型BotであるDiscord Honoと、従来のサーバー型Botではできることに違いがあります。

| | サーバー型Bot | Discord Hono（サーバーレス）|
|---|---|---|
| スラッシュコマンドへの返答 | ✅ | ✅ |
| ボタン・モーダル等のインタラクション | ✅ | ✅ |
| REST API[^restapi]の利用 | ✅ | ✅ |
| Cron[^cron]による定期実行 | ✅ | ✅ |
| VCへの接続（音楽Botなど）| ✅ | ❌ |
| メッセージ監視・自動返答 | ✅ | ❌ |
| 無料でダウンタイムなし | ❌（対策が必要） | ✅ |
| 大規模スケーリング | コストがかかりやすい | ✅ |

最大のデメリットは、WebSocketを使った**常時接続が必要な機能が使えない**ことです。具体的には以下が**できません**。

- ボイスチャンネルへの接続（音楽Bot、会話Botなど）
- メッセージの監視・自動返答（特定ワードへの反応など）
- Botのステータス表示のリアルタイム更新

逆に、**スラッシュコマンドへの応答・ボタンやモーダルなどのインタラクション・定期実行**が中心のBotであれば、Discord Honoで十分実用的に運用できます。

> **💡 どんなBotに向いている？**
> 「ユーザーがコマンドを打ったら何かしてくれる」という用途がメインのBotに最適です。情報検索・翻訳・ランダム抽選・ゲームサポートなどが挙げられます。

上記のことがしたい場合は素直にサーバーを借りるのが正解です。

## 前提
本記事を進めるに当たって、以下のことが必要です。

1. Discordのアカウントがあること
2. Cloudflareのアカウントがあること
3. `bun`[^bun]がインストールされていること - bunでなくても、node(npm/pnpm) や deno等でも問題ありません。
4. VSCodeがインストールされていること - エディタであれば何でも良いです。

## 事前準備：Developer Portalでの設定

Discord Botを作るには、まず[Discord Developer Portal](https://discord.com/developers/applications)でアプリケーションを作成し、**トークン**[^token]などを取得する必要があります。

### 1. アプリケーションの作成

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセスする
2. 右上の「**New Application**」をクリックする
3. Botの名前を入力して「**Create**」をクリックする

![新しいアプリケーションの作成](/assets/images/article/new-application.webp)

### 2. 各種キーの取得

アプリケーション作成後、左メニューの「**General Information**」を開き、以下の2つを控えておきます。

- **APPLICATION ID**：BotのアプリケーションID
- **PUBLIC KEY**：リクエストの署名検証[^signature]に使用するキー

### 3. Botトークンの発行

1. 左メニューの「**Bot**」タブを開く
2. 「**Reset Token**」をクリックしてトークンを発行する
3. 表示されたトークンをコピーして控えておく

> **⚠️ 注意**
> トークンは**一度しか表示されません**。ページを閉じた後は再確認できないので、必ずコピーして安全な場所に保存してください。

## テスト用Discordサーバーの準備
事前にBotをテストするサーバーを用意してください。そして、そのサーバーのIDをコピーします。

サーバーIDは、ブラウザであれば`discord.com/channels/[server-id]/[channel-id]` の形式なので、server-idの部分をコピーしてください。

デスクトップアプリであれば、設定画面から、開発者モードをONにしたうえで、サーバー設定などを確認する場所の一番下にサーバーIDをコピーがあります。

![サーバーIDのコピー方法](/assets/images/article/discord-server-id.webp)

## プロジェクトのセットアップ

### Cloudflare Workersプロジェクトの作成

```bash
bunx create-cloudflare@latest discord-hono-bot
cd discord-hono-bot
```

いくつか質問されます。以下のように選択してください。

- `What would you like to start with?` → **Hello World example**
- `Which template would you like to use?` → **Worker only**
- `Which language do you want to use?` → **TypeScript**
- `Do you want to use git for version control?` → **Yes**（任意）
- `Do you want to deploy your application?` → **No**（後で手動でデプロイします）

続いて、`discord-hono` と、DiscordのAPIの型を提供してくれるライブラリをインストールします。

```bash
bun add discord-hono
bun add -D discord-api-types
```

### 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、Developer Portalで控えた値を設定します。このファイルはローカルでのコマンド登録スクリプト実行時に使用します。

```env
DISCORD_APPLICATION_ID=your_application_id
DISCORD_PUBLIC_KEY=your_public_key
DISCORD_TOKEN=your_bot_token
DISCORD_TEST_GUILD_ID=your_test_server_id
```

`.gitignore` に `.env` が含まれているか確認し、含まれていない場合は追記してください。

### wrangler.jsonc確認・編集

`wrangler.jsonc`[^wrangler_jsonc]を開き、以下のようになっているか確認します。

```jsonc
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "discord-hono-bot",
	"main": "src/index.ts",
	"compatibility_date": "2026-04-15", // 今日の日付でおｋ!
	"observability": {
		"enabled": true
	},
	"upload_source_maps": true,
	"compatibility_flags": [
		"nodejs_compat"
	]
}
```

### package.jsonにスクリプトを追加する

`package.json` の `scripts` セクションを以下のように編集します。

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "register": "bun --env-file=.env src/register.ts"
  }
}
```

## Botを実装する

### src/index.ts を作成する

`src/index.ts` がBotのメインハンドラーです。Cloudflare Workersへのリクエストをここで受け取り、コマンドに応じて処理します。まずは `/ping` に「Pong! 🏓」と返すだけのシンプルな実装から始めます。

```typescript title="src/index.ts"
import { DiscordHono } from 'discord-hono'

// Cloudflare Workersの環境変数の型定義
type Env = {
  Bindings: {
    DISCORD_TOKEN: string
    DISCORD_PUBLIC_KEY: string
    DISCORD_APPLICATION_ID: string
  }
}

const app = new DiscordHono<Env>()
  .command('ping', (c) => c.res('Pong! 🏓'))

export default app
```

`c.res()` はコマンドへの返答メソッドです。文字列を渡すと、その内容がDiscordにメッセージとして送信されます。

名前の通り、かなり`hono`に近い書き方なので、honoを知っていれば学習コストも低いでしょう。

https://hono.dev/

### src/register.ts を作成する

Discordのスラッシュコマンドは、**Discord APIに事前に登録**しておく必要があります[^register]。`src/register.ts` として登録用スクリプトを作成します。

```typescript
import { Command, register } from 'discord-hono'

const commands = [
  new Command('ping', 'Pongと返答します'),
]

register(
  commands,
  process.env.DISCORD_APPLICATION_ID,
  process.env.DISCORD_TOKEN,
)
```

## コマンドの登録とデプロイ

### コマンドをDiscordに登録する

```bash
bun run register
```

コマンドの登録はDiscord APIへのリクエストです。登録自体はすぐ完了しますが、**Discordのクライアントに反映されるまで最大1時間**かかる場合があります。

### 本番環境の環境変数を設定する

Cloudflare Workersに `.env` ファイルはそのまま使えません。本番用の**シークレット**[^secret]は、`wrangler secret put` コマンドで設定します。

```bash
bunx wrangler secret put DISCORD_APPLICATION_ID
bunx wrangler secret put DISCORD_PUBLIC_KEY
bunx wrangler secret put DISCORD_TOKEN
```

それぞれのコマンドを実行すると、対話的に値の入力を求められます。`.env` に記載した対応する値を入力してください。

### Cloudflare Workersへデプロイする

```bash
bun run deploy
```

デプロイ[^deploy]が完了すると、以下のようなURLが発行されます。

```
https://discord-hono-bot.your-subdomain.workers.dev
```


### INTERACTIONS ENDPOINT URLを設定する

Discordはコマンドが実行されると、事前に登録したURL（エンドポイント[^endpoint]）にHTTPリクエストを送信します。このURLをDeveloper Portalに設定します。

1. Discord Developer Portalの「**General Information**」タブを開く
2. 「**INTERACTIONS ENDPOINT URL**」にデプロイで発行されたWorkerのURLを入力する
3. 「**Save Changes**」をクリックする

Discordがエンドポイントの疎通確認を行うため、この時点でWorkerが正常に動いていることが重要です。保存に成功すれば、BotがDiscordからのインタラクションを受け取れる状態になります。

### BotをサーバーへInviteする

1. Discord Developer Portalの「**OAuth2**」タブを開く
2. 「**OAuth2 URL Generator**」を選択する
3. **SCOPES** で `bot` と `applications.commands` にチェックを入れる
4. 生成されたURLをブラウザで開き、招待するサーバーを選択する

招待後、Discordのチャットで `/ping` と入力すると「Pong! 🏓」と返ってくるはずです 🎉

## 実践：ボタンインタラクション付きのダイスコマンド

Discord Honoはボタン等の**コンポーネントインタラクション**[^component]にも対応しています。ここでは、「もう一度振る」ボタン付きのダイスロールコマンドを実装してみます。ゲームサーバーなどで実用的に活用できるコマンドです。

### register.ts にコマンドを追加する

```typescript
import { Command, register } from 'discord-hono'

const commands = [
  new Command('ping', 'Pongと返答します'),
  new Command('dice', 'サイコロを振ります'),  // 追加
]

register(
  commands,
  process.env.DISCORD_APPLICATION_ID,
  process.env.DISCORD_TOKEN,
)
```

### index.ts を更新する

`src/index.ts` をボタンインタラクションに対応するよう更新します。

```typescript
import { DiscordHono, Components, Button } from 'discord-hono'

type Env = {
  Bindings: {
    DISCORD_TOKEN: string
    DISCORD_PUBLIC_KEY: string
    DISCORD_APPLICATION_ID: string
  }
}

// 1〜6のランダムな整数を返す
const rollDice = () => Math.floor(Math.random() * 6) + 1

// ダイス結果のメッセージ（ボタン付き）を生成する関数
const diceResponse = (result: number) => ({
  content: `🎲 **${result}** が出ました！`,
  components: new Components().row(
    new Button('reroll', 'もう一度振る 🎲'),
  ),
})

const app = new DiscordHono<Env>()
  // /ping コマンド
  .command('ping', (c) => c.res('Pong! 🏓'))
  // /dice コマンド：初回はコマンドとして返答
  .command('dice', (c) => c.res(diceResponse(rollDice())))
  // 「もう一度振る」ボタンが押されたとき：メッセージを更新
  .component('reroll', (c) => c.resUpdate(diceResponse(rollDice())))

export default app
```

実装のポイントは2つあります。

1. `.component()` の第1引数（`'reroll'`）を `new Button()` の第1引数（カスタムID）と一致させることで、ボタン押下時のハンドラーを紐付けています
2. `c.resUpdate()` を使うことで、ボタンを押したとき**元のメッセージを新しい結果で上書き**できます。`c.res()` だと新しいメッセージが追加されてしまうため、`resUpdate` を使うと「結果が更新される」自然なUXを実現できます

### 再登録してデプロイする

```bash
bun run register
bun run deploy
```

`/dice` を実行するとサイコロが振られ、「もう一度振る 🎲」ボタンを押すたびに結果が更新されます。

## おわりに

Discord Honoを使うことで、サーバーの管理不要・無料ダウンタイムなしでDiscord Botを運用できました。常時接続が不要なBotであれば、Discord Honoは非常に優れた選択肢です。

今回紹介したボタン以外にも、モーダル（入力フォーム）・セレクトメニュー・オートコンプリート・Cronトリガーによる定期実行など豊富な機能が揃っています。当然、Cloudflareエコシステム(D1,R2,KV等)もそのまま使用できるので、実践的なアプリケーションも作成することも可能です。ぜひ公式ドキュメントも参照しながら、機能を拡張してみてください。

https://discord-hono.luis.fun/ja/

間違っている箇所があれば[XのDM](https://x.com/miyabitti0256/)までお知らせください！即座に修正いたします。

[^websocket]: **WebSocket**とは、サーバーとクライアントが一度接続を確立したあと、どちら側からでも好きなタイミングでデータを送受信できる通信方式です。通常のHTTPが「リクエストしたら返事が来る」一方通行の会話なのに対し、WebSocketは「いつでも話しかけられる」電話のようなイメージです。チャットアプリやリアルタイムゲームで広く使われています。

[^server]: ここでの**サーバー**とは、プログラムを常時動かし続けるコンピューターのことです。VPSやクラウドVM（AWS EC2、Google Compute Engineなど）が該当します。無料枠があるサービスも存在しますが、自動スリープや時間制限があることが多いです。

[^serverless]: **サーバーレス**とは、開発者がサーバーの管理・調達を気にせず、コードの実行だけに集中できるクラウドの仕組みです。「関数」としてコードを登録しておくと、リクエストが来たときだけ自動で起動します。AWS LambdaやCloudflare Workersが代表例です。

[^cfworkers]: **Cloudflare Workers**は、Cloudflareが提供するサーバーレスプラットフォームです。無料プランでは1日10万リクエストまで利用できます。Botのコマンド応答程度であれば無料枠で十分運用できます。

[^edge]: **エッジサーバー**とは、ユーザーの地理的に近い場所に配置されたサーバーのことです。遠くの中央サーバーと通信するより遅延が少なく、高速なレスポンスが実現できます。

[^http]: **HTTP（HyperText Transfer Protocol）** とは、WebブラウザがWebサーバーとデータをやり取りするための基本的な通信プロトコルです。「リクエスト（お願い）」を送ると「レスポンス（返答）」が返ってきます。

[^restapi]: **REST API**とは、HTTPを使ってデータのやり取りを行うWebサービスの設計方式のことです。Discord APIもREST APIとして提供されており、メッセージの送信やユーザー情報の取得などをHTTPリクエストで行えます。

[^cron]: **Cron**とは、指定した時刻や間隔でプログラムを自動実行する仕組みです。「毎日9時に天気予報を送信する」といった定期実行Botに活用できます。

[^token]: **トークン**とは、BotがどのアカウントとしてDiscordで動作するかを認証するための「合言葉」のようなものです。これが流出すると第三者がBotを乗っ取れてしまうため、厳重に管理する必要があります。

[^signature]: **署名検証**とは、Discordから届いたリクエストが本物かどうかを確認する仕組みです。悪意のある第三者が偽のリクエストを送り込むのを防ぎます。Discord Honoが内部で自動的に処理してくれるため、開発者が特別なコードを書く必要はありません。

[^bun]: **Bun**とは、Node.jsの代替として登場した高速なJavaScript/TypeScriptランタイムです。パッケージのインストール（`npm install` 相当）も `bun add` で行えます。TypeScriptをそのまま実行できる点が特徴で、別途コンパイル用ツールは不要です。

[^wrangler]: **Wrangler**とは、Cloudflare WorkersをCLI（コマンドライン）から操作するための公式ツールです。デプロイや開発サーバーの起動などに使用します。

[^wrangler_jsonc]: **wrangler.jsonc**は、Cloudflare Workersプロジェクトの設定ファイルです。プロジェクト名や使用するファイルのパスなどを定義します。コメント付きJSON形式で記述します。

[^register]: Discord Botのスラッシュコマンドは、Discordのサーバーに「このコマンドが使えますよ」と申告することで、ユーザーが `/` を入力したときの補完リストに表示されるようになります。コードを変更しただけではコマンドは増えないため、この登録スクリプトの実行が必要です。

[^secret]: Cloudflare Workersにおける**シークレット**とは、本番環境でのみ使用する暗号化された環境変数のことです。コードとは分離して管理され、Cloudflareのダッシュボードから管理できますが、値そのものは暗号化されて保護されています。

[^deploy]: **デプロイ**とは、作成したプログラムを実際にサーバー（今回はCloudflare Workers）に配置して、外部からアクセスできる状態にすることです。

[^endpoint]: **エンドポイント**とは、APIやWebサービスへのアクセス先となるURLのことです。ここでは「DiscordがBotにリクエストを送る宛先」を意味します。

[^component]: **コンポーネントインタラクション**とは、Discordのメッセージに埋め込まれたボタン・セレクトメニュー・モーダル（入力フォーム）などのUI要素をユーザーが操作したときに発生するイベントのことです。