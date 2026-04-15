import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

const __dirname = path.resolve();
const ARTICLE_DIR = path.join(__dirname, "src/contents/article");

async function main() {
  const args = process.argv.slice(2);
  const slug = args[0];

  if (!slug) {
    console.error("❌ エラー: 記事のファイル名(slug)を指定してください。");
    console.error("使用例: bun run new:article my-new-article");
    process.exit(1);
  }

  // 拡張子を除外（もし.mdなどを付けて実行された場合への対策）
  const cleanSlug = slug.replace(/\.mdx?$/, "");
  const targetPath = path.join(ARTICLE_DIR, `${cleanSlug}.md`);

  if (existsSync(targetPath)) {
    console.error(`❌ エラー: ${cleanSlug}.md は既に存在します。`);
    process.exit(1);
  }

  const today = new Date().toISOString().split("T")[0];

  const content = `---
title: "新しい記事のタイトル"
description: "記事の概要をここに記述します。"
publishedAt: ${today}
tags: []
image: "/assets/images/default.webp"
---

## はじめに

ここに記事の本文を記述します。
`;

  // ディレクトリが存在しない場合は作成（通常はあるはずですが念のため）
  if (!existsSync(ARTICLE_DIR)) {
    await fs.mkdir(ARTICLE_DIR, { recursive: true });
  }

  await fs.writeFile(targetPath, content, "utf-8");
  console.log(`✅ 新しい記事を作成しました: src/contents/article/${cleanSlug}.md`);
}

main().catch(console.error);
