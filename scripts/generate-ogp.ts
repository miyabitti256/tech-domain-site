import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import satori from "satori";
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";

const __dirname = path.resolve();
const ARTICLE_DIR = path.join(__dirname, "src/contents/article");
const BOOK_DIR = path.join(__dirname, "src/contents/book");
const OGP_DIR = path.join(__dirname, "public/ogp");
const ARTICLE_OGP_DIR = path.join(OGP_DIR, "article");
const BOOK_OGP_DIR = path.join(OGP_DIR, "book");
const LOGO_PATH = path.join(__dirname, "public/miyabitti.svg");
const ICON_PATH = path.join(__dirname, "public/avatar.webp");
const FONT_PATH = path.join(__dirname, "node_modules/@fontsource/zen-kaku-gothic-new/files/zen-kaku-gothic-new-japanese-700-normal.woff");

/**
 * Miyabitti Logo Path Data (Manual extraction for stability)
 */
const LOGO_PATHS = [
  "M0.5 43.486C13.4283 15.5375 25.42 17.7734 23.359 27.8348C21.2979 37.8963 20.1737 46.6535 21.4855 43.8586C24.6044 37.2136 26.1697 34.1698 29.3552 28.2075C32.5407 22.2451 35.913 18.146 39.6604 19.8229C43.4078 21.4998 40.7848 29.1391 40.7848 29.1391C40.7848 29.1391 34.9763 47.7714 37.4119 43.486C39.8475 39.2006 45.2819 30.0707 47.5301 26.7169C49.7784 23.3631 53.3384 21.1272 55.7742 23.1767C58.21 25.2263 56.711 29.6981 56.711 29.6981C56.711 29.6981 54.2752 35.8467 53.9005 38.4553C53.5257 41.0638 54.8373 43.2997 57.8353 43.6723C60.8332 44.045 63.4564 41.4364 65.3301 39.2006C67.2038 36.9647 70.0786 33.7518 73.1996 28.2075C74.5751 25.764 76.7599 21.3135 76.5723 22.9904C76.3847 24.6673 74.1743 31.1349 73.7617 35.8467C73.5395 38.3839 73.0888 39.9726 74.1365 41.8091C75.835 44.7863 79.6299 43.8082 82.381 41.6228C85.132 39.4373 91.7492 29.6981 93.6232 26.9032C95.4971 24.1084 96.4335 21.4998 95.684 23.922C94.9345 26.3442 93.0608 33.7972 92.3113 36.0331C90.9013 40.2395 93.8103 44.6039 98.4945 42.3681C102.622 40.3977 105.427 36.0331 108.425 30.816C111.424 25.5989 116.669 14.7922 114.046 24.1084C111.423 33.4245 105.24 53.7338 104.303 55.9697C102.762 59.6475 98.8695 61.7457 95.684 59.6961C92.4984 57.6466 96.246 52.0569 99.8061 49.4483C106.973 44.1973 115.351 40.2548 123.04 35.8467",
  "M145.883 22.2429C145.883 22.2429 140.761 19.7057 136.702 20.5662C131.951 21.5736 128.001 24.2725 125.462 28.3909C123.2 32.059 121.468 38.6597 125.462 41.991C131.33 46.8863 137.639 39.0102 139.887 35.0978C141.451 32.3764 145.542 22.243 142.885 31.3718C141.618 35.7251 140.075 38.2649 141.761 41.991C143.447 45.717 147.607 44.4566 149.442 42.7362C155.999 36.5882 161.725 25.7596 163.493 22.2429C166.678 15.9079 167.802 15.5363 170.051 10.8783C172.299 6.22019 173.797 -2.53619 170.8 1.56283C167.671 5.842 166.678 9.20155 164.805 14.9771C163.019 23.1737 161.694 26.2553 161.995 32.117C162.169 35.4978 162.449 38.8648 164.43 41.6181C167.24 45.5245 173.236 43.6675 175.109 41.991C178.431 39.018 178.801 37.8958 180.167 35.4702C181.885 32.4199 181.666 29.6945 181.666 27.8318C181.666 25.5195 180.555 22.8058 178.294 22.0564C175.484 21.1249 173.048 23.9194 173.423 26.5277C174.156 31.628 179.925 31.3159 183.626 30.7495C185.733 30.4269 191.7 28.5047 194.219 25.0372C195.166 23.7331 196.467 20.0071 195.155 26.3414C194.398 29.9993 191.047 39.3458 193.656 42.1771C197.778 46.6483 203.162 40.1277 204.335 38.8236C207.52 35.2839 208.83 33.0482 209.956 31.3718C211.082 29.6953 215.014 22.9879 215.014 22.9879C215.014 22.9879 220.073 -0.113576 219.323 5.47549C218.574 11.0646 211.642 36.2156 211.642 38.0784C211.641 42.0612 213.704 43.668 216.326 44.0403C218.949 44.4127 222.508 41.8044 224.756 39.3825C227.005 36.9606 228.504 34.9115 228.504 34.9115L236.185 22.9879C236.185 22.9879 242.365 -2.02223 239.559 10.7334C238.247 16.6951 233.374 34.1661 233.188 37.1471C232.861 42.3634 235.623 44.2266 239.182 44.0403C242.741 43.854 247.538 38.5767 248.924 36.9606C254.357 30.6263 259.978 16.4673 257.73 25.4098C255.482 34.3524 255.481 33.7932 254.92 38.451C254.358 43.1088 258.955 45.462 263.725 42.1773C268.596 38.8236 270.469 31.9304 270.469 31.9304",
  "M77.5004 13.6731C77.6875 12.5551 78.578 11.1995 79.561 11.2509C80.4909 11.2996 81.2133 12.7597 81.06 13.6731C80.8724 14.7907 80.1692 15.857 79.1863 15.9085C78.153 15.9626 77.3305 14.6881 77.5004 13.6731Z",
  "M196.841 13.4866C197.073 12.1651 197.778 11.1212 199.089 11.4373C200.397 11.7524 200.186 12.7534 199.839 14.0455C199.531 15.1896 198.985 16.0802 197.965 15.9085C196.932 15.7347 196.61 14.8023 196.841 13.4866Z",
  "M206.261 14.6616C213.93 17.8417 242.926 17.6547 249.847 14.6616",
  "M259.041 12.9279C259.276 11.8157 260.175 10.8118 261.289 11.0649C262.442 11.3267 262.762 12.7362 262.413 13.8594C262.107 14.8475 261.381 15.6911 260.353 15.5361C259.22 15.3654 258.806 14.0424 259.041 12.9279Z"
];

const satoriLogoNode = {
  type: "svg",
  props: {
    width: "220",
    height: "50",
    viewBox: "-4 -8 279 73",
    fill: "none",
    children: LOGO_PATHS.map(d => ({
      type: "path",
      props: {
        d,
        stroke: "#334155", // Slate 700
        strokeLinecap: "round",
        strokeWidth: "4",
        fill: "none",
      }
    }))
  }
};

async function generateOGP(title: string, outputPath: string, fontBuffer: Buffer, iconBase64: string, label: string = "ARTICLE") {
  // Truncate long titles to prevent overlap
  const displayTitle = title.length > 45 ? title.slice(0, 42) + "..." : title;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#f1f5f9",
          fontFamily: '"Zen Kaku Gothic New"',
        },
        children: [
          // Background Geometric Patterns (Filled, Increased Contrast)
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "-150px",
                right: "-100px",
                width: "500px",
                height: "500px",
                background: "#cbd5e1",
                borderRadius: "50%",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: "-250px",
                left: "-100px",
                width: "700px",
                height: "700px",
                background: "#94a3b8",
                borderRadius: "50%",
                opacity: 0.3,
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "120px",
                left: "220px",
                width: "240px",
                height: "240px",
                background: "#e2e8f0",
                borderRadius: "32px",
                transform: "rotate(15deg)",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: "80px",
                right: "320px",
                width: "140px",
                height: "140px",
                background: "#94a3b8",
                borderRadius: "50%",
                opacity: 0.5,
              },
            },
          },
          // Main Card
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "54px", // Reduced padding
                margin: "24px",  // Reduced margin to move ingredients closer to corners
                width: "1152px", // Adjusted width for smaller margin (1200 - 24*2)
                height: "582px", // Adjusted height for smaller margin (630 - 24*2)
                background: "rgba(255, 255, 255, 0.9)", // Increased transparency
                border: "1px solid rgba(255, 255, 255, 0.8)",
                borderRadius: "40px",
                boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.05)",
              },
              children: [
                // Top area: ARTICLE badge (Right Aligned)
                {
                  type: "div",
                  props: {
                    style: { display: "flex", justifyContent: "flex-end" },
                    children: [
                      {
                        type: "span",
                        props: {
                          style: {
                            color: "#94a3b8",
                            fontSize: "24px",
                            fontWeight: 700,
                            letterSpacing: "0.2em",
                          },
                          children: label,
                        },
                      },
                    ],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      flex: 1,
                    },
                    children: [
                      {
                        type: "span",
                        props: {
                          style: {
                            fontSize: "72px",
                            fontWeight: 900,
                            color: "#1e293b",
                            lineHeight: 1.3,
                          },
                          children: displayTitle,
                        },
                      },
                    ],
                  },
                },
                // Bottom area: Brand Logo (Icon + SVG) - Left Aligned
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      marginTop: "auto",
                      gap: "20px",
                    },
                    children: [
                      {
                        type: "img",
                        props: {
                          src: iconBase64,
                          style: { width: "64px", height: "64px", borderRadius: "50%" },
                        },
                      },
                      satoriLogoNode
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Zen Kaku Gothic New",
          data: fontBuffer,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );

  const svgBuffer = Buffer.from(svg);
  const webpBuffer = await sharp(svgBuffer, { density: 150 })
    .resize(1200, 630)
    .webp({ quality: 90 })
    .toBuffer();
  await fs.writeFile(outputPath, webpBuffer);
}

async function main() {
  if (!existsSync(OGP_DIR)) await fs.mkdir(OGP_DIR, { recursive: true });
  if (!existsSync(ARTICLE_OGP_DIR)) await fs.mkdir(ARTICLE_OGP_DIR, { recursive: true });
  if (!existsSync(BOOK_OGP_DIR)) await fs.mkdir(BOOK_OGP_DIR, { recursive: true });

  console.log("Loading assets...");
  const fontBuffer = await fs.readFile(FONT_PATH);
  
  // Convert WebP icon to PNG for Satori compatibility
  const iconRaw = await fs.readFile(ICON_PATH);
  const iconPngBuffer = await sharp(iconRaw).png().toBuffer();
  const iconBase64 = `data:image/png;base64,${iconPngBuffer.toString("base64")}`;

  // Process Articles
  console.log("\n--- Processing Articles ---");
  const articleFiles = await fs.readdir(ARTICLE_DIR, { recursive: true });
  const mdFiles = articleFiles.filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));

  for (const file of mdFiles) {
    const slug = path.basename(file).replace(/\.mdx?$/, "");
    const parsed = matter(await fs.readFile(path.join(ARTICLE_DIR, file), "utf-8"));

    const outputPath = path.join(ARTICLE_OGP_DIR, `${slug}.webp`);
    if (existsSync(outputPath)) {
      console.log(`Skipping: ${slug}`);
      continue;
    }

    console.log(`Generating Article OGP: ${parsed.data.title || slug}`);
    await generateOGP(parsed.data.title || slug, outputPath, fontBuffer, iconBase64, "ARTICLE");
  }

  // Process Books
  console.log("\n--- Processing Books ---");
  if (existsSync(BOOK_DIR)) {
    const bookDirs = await fs.readdir(BOOK_DIR, { withFileTypes: true });
    for (const dir of bookDirs) {
      if (!dir.isDirectory()) continue;
      
      const bookSlug = dir.name;
      const metaPath = path.join(BOOK_DIR, bookSlug, "meta.ts");
      
      if (existsSync(metaPath)) {
        try {
          // Dynamic import for meta.ts (Bun handles this natively)
          const metaMod = await import(metaPath);
          const title = metaMod.default?.title || bookSlug;
          const outputPath = path.join(BOOK_OGP_DIR, `${bookSlug}.webp`);

          if (existsSync(outputPath)) {
            console.log(`Skipping Book: ${bookSlug}`);
            continue;
          }

          console.log(`Generating Book OGP: ${title}`);
          await generateOGP(title, outputPath, fontBuffer, iconBase64, "BOOK");
        } catch (error) {
          console.error(`Failed to process book meta for ${bookSlug}:`, error);
        }
      }
    }
  }
}

main().catch(console.error);
