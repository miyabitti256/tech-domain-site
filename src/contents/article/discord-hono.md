---
title: "無料でDiscordBotを運用できる「Discord Hono」を使ってみた 【初学者向け】"
description: "常時稼働は出来ませんが、Cloudflare WorkersでDiscordBotを運用できるライブラリ「Discord Hono」を紹介します。"
publishedAt: 2026-04-15
tags: ["Cloudflare Workers", "Discord", "Hono"]
image: "/assets/images/discord-hono.webp"
---

## サーバーレスでDiscord Botを常時稼働させるメリット

Discord Botを個人で運用する場合、VPSやクラウドサーバーの常時起動コストが最初の障壁になります。無料枠を利用する方法もありますが、スリープ対策の定期アクセスなどトリッキーな設定が必要になり、維持管理も容易ではありません。

そこで活躍するのが、Cloudflare Workers上で動作する軽量Botライブラリ `Discord Hono` です。

https://discord-hono.luis.fun/ja/

## 従来のサーバー型BotとWebSocketの仕組み

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

コードの要点は次の2点です。

1. `.component()` の第1引数（`'reroll'`）を `new Button()` の第1引数（カスタムID）と一致させ、ボタン押下時のハンドラーを紐付けています
2. `c.resUpdate()` を使うことで、ボタンを押した際に**元のメッセージを新しい結果で上書き**できます。`c.res()` では新規メッセージとして連投されてしまうため、`resUpdate` を活用すると結果がその場で切り替わる自然な操作感になります

### 再登録してデプロイする

```bash
bun run register
bun run deploy
```

`/dice` を実行するとサイコロが振られ、「もう一度振る 🎲」ボタンを押すたびに結果が更新されます。

## まとめ：常時接続が不要ならDiscord Hono一択

Discord Honoを採用することで、インフラの常時稼働コストをかけずにDiscord Botを運用できました。WebSocketによる常時接続を必要としないBotであれば、きわめて合理的な選択肢です。

今回実装したボタンに加え、モーダルやセレクトメニュー、Cronトリガーによる定期実行にも対応しています。さらにCloudflareのD1（SQLデータベース）やKV（Key-Valueストア）と組み合わせれば、データを保持する本格的なWebアプリケーションBotへと容易に拡張できます。ぜひ公式ドキュメントを参照しながら、オリジナルの機能を実装してみてください。

https://discord-hono.luis.fun/ja/

間違っている箇所があれば[XのDM](https://x.com/miyabitti0256/)までお知らせください！即座に修正いたします。

[^websocket]: **WebSocket**とは、サーバーとクライアントが一度接続を確立したあと、双方向から自由なタイミングでデータを送受信できる通信規格です。一般的なHTTP通信が一往復のやり取りで完結するのに対し、WebSocketは常時接続を維持します。チャットツールやオンライン対戦ゲームなどで活用されています。

[^server]: ここでの**サーバー**とは、プログラムを常時起動し続けるコンピューター環境を指します。VPSやクラウドVM（AWS EC2など）が代表的です。無料枠のあるホスティングでも、スリープ制限や稼働時間の上限が設けられているケースが目立ちます。

[^serverless]: **サーバーレス**とは、開発者がOSやサーバーの調達・保守を意識せず、コード実行のみに集中できるクラウドの運用形態です。リクエストの到着時にのみ関数が起動するため、アイドル時のコストが発生しません。

[^cfworkers]: **Cloudflare Workers**は、Cloudflareが提供するエッジサーバーレス環境です。無料プランでも1日10万リクエストまで利用でき、個人開発のBot運用であれば無料枠内で十分に賄えます。

[^edge]: **エッジサーバー**とは、利用者の地理的な近傍に配置されたサーバー群です。遠隔地のデータセンターへ通信するよりも遅延が大幅に短縮されます。

[^http]: **HTTP（HyperText Transfer Protocol）** は、Webブラウザとサーバー間で通信を行うための標準規約です。クライアントのリクエストに対してサーバーがレスポンスを返す一問一答型で動作します。

[^restapi]: **REST API**とは、HTTPプロトコルに則って設計されたWeb APIの形式です。Discord APIもREST形式で公開されており、HTTPリクエストを通じてメッセージ送信やアカウント情報の取得が行えます。

[^cron]: **Cron**とは、決められた日時や周期で処理を定期実行するスケジューラーです。「毎朝定時に情報を配信するBot」などの用途に適しています。

[^token]: **トークン**とは、Botのアカウント認証に用いる秘密鍵です。流出すると不正操作の恐れがあるため、ソースコードに直書きせず厳重に秘匿管理します。

[^signature]: **署名検証**とは、届いたHTTPリクエストが正規のDiscordサーバーから送信されたものかを検証する暗号処理です。Discord Honoが内部で自動的に処理するため、利用側で複雑な暗号コードを書く必要はありません。

[^bun]: **Bun**は、Node.jsと互換性を持つ高速なJavaScript/TypeScriptランタイムです。TypeScriptをトランスパイル不要で直接実行できるほか、パッケージ管理も高速に行えます。

[^wrangler]: **Wrangler**は、Cloudflare Workersの開発・デプロイを行う公式CLIツールです。

[^wrangler_jsonc]: **wrangler.jsonc**は、Cloudflare Workersの設定ファイルです。Workers名やエントリーポイントのパスをJSON形式（コメント付き）で指定します。

[^register]: スラッシュコマンドは、Discord APIに事前登録することで、ユーザーが「/」を入力した際の補完一覧に現れます。コード側のハンドラーを記述しただけでは反映されないため、本登録スクリプトの実行が必要です。

[^secret]: **シークレット**とは、Cloudflare Workersの本番環境で利用する暗号化された環境変数です。コード上には現れず、安全に機密情報を保護します。

[^deploy]: **デプロイ**とは、作成したプログラム資産を実行環境（ここではCloudflare Workers）へ転送し、サービスとして利用可能な状態に配置することです。

[^endpoint]: **エンドポイント**とは、APIやWebサービスの通信先URLです。ここではDiscord側からBotへ通知イベントを送信する宛先URLを指します。

[^component]: **コンポーネントインタラクション**とは、ボタンやセレクトメニューなど、メッセージ内のUIパーツをユーザーが操作した際に生じるイベントです。画面の部分書き換えや後続アクションのトリガーとして機能します。