import fs from "node:fs";
import path from "node:path";

// 6章用のマークダウンファイル生成
const dir6 = path.join(process.cwd(), "src/contents/book/demo-6-chapters");
if (!fs.existsSync(dir6)) {
	fs.mkdirSync(dir6, { recursive: true });
}

for (let i = 1; i <= 6; i++) {
	const id = String(i).padStart(2, "0");
	const content = `---
title: "第${i}章: 6章テストのコンテンツ"
---

# 第${i}章: 6章テストのコンテンツ

6章構成テストデータの第${i}章です。
`;
	fs.writeFileSync(path.join(dir6, `ch-${id}.md`), content, "utf-8");
}

// 8章用のマークダウンファイル生成
const dir8 = path.join(process.cwd(), "src/contents/book/demo-8-chapters");
if (!fs.existsSync(dir8)) {
	fs.mkdirSync(dir8, { recursive: true });
}

for (let i = 1; i <= 8; i++) {
	const id = String(i).padStart(2, "0");
	const content = `---
title: "第${i}章: 8章テストのコンテンツ"
---

# 第${i}章: 8章テストのコンテンツ

8章構成テストデータの第${i}章です。
`;
	fs.writeFileSync(path.join(dir8, `ch-${id}.md`), content, "utf-8");
}

// 24章用のディレクトリと meta.ts、マークダウンファイル生成
const dir24 = path.join(process.cwd(), "src/contents/book/demo-24-chapters");
if (!fs.existsSync(dir24)) {
	fs.mkdirSync(dir24, { recursive: true });
}

const chapters24 = Array.from({ length: 24 }, (_, i) => `ch-${String(i + 1).padStart(2, "0")}`);

const meta24Content = `import { defineBookMeta } from "../types";

export default defineBookMeta({
	title: "【検証用】24章構成の大ボリューム本",
	description: "全24章の大ボリューム本。複数回見開きをめくるアニメーションの動作確認用データです。",
	summary: \`## 24章構成のテスト本について
この本は全24章で構成された長大な書籍です。
見開きページが3〜4ページ分生成され、左右・めくりボタンでの長距離ナビゲーションやAuthorCardの最終ページ配置を検証します。
\`,
	tags: ["test", "demo", "24chapters", "large"],
	publishedAt: "2026-05-03",
	chapters: ${JSON.stringify(chapters24, null, 2)},
});
`;
fs.writeFileSync(path.join(dir24, "meta.ts"), meta24Content, "utf-8");

for (let i = 1; i <= 24; i++) {
	const id = String(i).padStart(2, "0");
	const content = `---
title: "第${i}章: 24章テストの長大なコンテンツ"
---

# 第${i}章: 24章テストの長大なコンテンツ

全24章構成の大ボリュームテストデータの第${i}章です。
`;
	fs.writeFileSync(path.join(dir24, `ch-${id}.md`), content, "utf-8");
}

console.log("Demo books created successfully!");
