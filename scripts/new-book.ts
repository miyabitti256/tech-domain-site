import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

const __dirname = path.resolve();
const BOOK_DIR = path.join(__dirname, "src/contents/book");

async function main() {
  const args = process.argv.slice(2);
  const bookSlug = args[0];
  const chapterSlug = args[1];

  if (!bookSlug) {
    console.error("❌ エラー: bookのディレクトリ名(slug)を指定してください。");
    console.error("使用例（新しい本を作成）: bun run new:book my-book");
    console.error("使用例（章を追加）:       bun run new:book my-book 01-introduction");
    process.exit(1);
  }

  const cleanBookSlug = bookSlug.replace(/\.mdx?$/, "");
  const targetDir = path.join(BOOK_DIR, cleanBookSlug);
  const metaPath = path.join(targetDir, "meta.ts");

  // チャプターslugが指定されていない場合 → 新しい本のテンプレートを生成
  if (!chapterSlug) {
    if (existsSync(targetDir)) {
      console.error(`❌ エラー: ${cleanBookSlug}/ は既に存在します。`);
      console.error("章を追加する場合は、第二引数にチャプタースラッグを指定してください。");
      process.exit(1);
    }

    await fs.mkdir(targetDir, { recursive: true });

    const metaContent = `import { defineBookMeta } from "../types";

export default defineBookMeta({
\ttitle: "本のタイトル",
\tdescription: "本の概要をここに記述します。",
\tsummary: \`## この本について

ここにサマリー（本文）を記述してください。
マークダウンの見出し、リスト、太字などが使えます。\`,
\ttags: [],
\tpublishedAt: "${new Date().toISOString().split("T")[0]}",
\tchapters: [],
});
`;

    await fs.writeFile(metaPath, metaContent, "utf-8");
    console.log(`✅ 新しい本を作成しました: src/contents/book/${cleanBookSlug}/`);
    console.log(`   meta.ts を編集して、本のメタデータを設定してください。`);
    return;
  }

  // チャプターslugが指定されている場合 → 章のマークダウンを生成
  const cleanChapterSlug = chapterSlug.replace(/\.mdx?$/, "");
  const targetPath = path.join(targetDir, `${cleanChapterSlug}.md`);

  if (existsSync(targetPath)) {
    console.error(`❌ エラー: ${cleanBookSlug}/${cleanChapterSlug}.md は既に存在します。`);
    process.exit(1);
  }

  // ディレクトリが存在しない場合は作成
  if (!existsSync(targetDir)) {
    await fs.mkdir(targetDir, { recursive: true });
    console.log(`📁 ディレクトリを作成しました: src/contents/book/${cleanBookSlug}/`);
  }

  const content = `---
title: "新しい章のタイトル"
---

## はじめに

ここに章の本文を記述します。
`;

  await fs.writeFile(targetPath, content, "utf-8");
  console.log(`✅ 新しい章を作成しました: src/contents/book/${cleanBookSlug}/${cleanChapterSlug}.md`);

  // meta.ts が存在する場合、chapters への追加を案内
  if (existsSync(metaPath)) {
    console.log(`\n📝 meta.ts の chapters 配列に "${cleanChapterSlug}" を追加してください。`);
  } else {
    console.log(`\n⚠️  meta.ts がまだ存在しません。先に 'bun run new:book ${cleanBookSlug}' を実行してください。`);
  }
}

main().catch(console.error);
