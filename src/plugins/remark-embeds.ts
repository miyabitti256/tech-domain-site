import * as fs from "node:fs";
import * as path from "node:path";
import type { Html, Link, Paragraph, Root, Text } from "mdast";
import type { Parent } from "unist";
import { visit } from "unist-util-visit";

const YOUTUBE_REGEX =
	/^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})(?:\S+)?$/;
const TWITTER_REGEX =
	/^(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)(?:\S+)?$/;

const CACHE_DIR = path.resolve("src", "data", "tweet-cache");

if (!fs.existsSync(CACHE_DIR)) {
	fs.mkdirSync(CACHE_DIR, { recursive: true });
}

interface TweetData {
	__typename: string;
	id_str: string;
	text: string;
	created_at: string;
	favorite_count: number;
	conversation_count: number;
	user: {
		id_str: string;
		name: string;
		screen_name: string;
		profile_image_url_https: string;
		is_blue_verified: boolean;
		verified?: boolean;
	};
	mediaDetails?: Array<{
		display_url: string;
		expanded_url: string;
		media_url_https: string;
		type: string;
		sizes: {
			large: {
				h: number;
				w: number;
				resize: string;
			};
			medium: {
				h: number;
				w: number;
				resize: string;
			};
			small: {
				h: number;
				w: number;
				resize: string;
			};
			thumb: {
				h: number;
				w: number;
				resize: string;
			};
		};
		url: string;
		video_info?: {
			variants: Array<{ url: string; content_type: string }>;
		};
	}>;
	photos?: Array<{
		expandedUrl: string;
		url: string;
		width: number;
		height: number;
	}>;
}

function getToken(id: string) {
	return ((Number(id) / 1e15) * Math.PI)
		.toString(6 ** 2)
		.replace(/(0+|\.)/g, "");
}

async function fetchTweetData(tweetId: string): Promise<TweetData | null> {
	const cacheFile = path.join(CACHE_DIR, `${tweetId}.json`);

	if (fs.existsSync(cacheFile)) {
		try {
			const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
			if (cached && (cached.__typename === "Tweet" || cached.id_str))
				return cached;
		} catch (e) {
			console.warn(`[remark-embeds] Cache read failed for ${tweetId}:`, e);
		}
	}

	try {
		const token = getToken(tweetId);
		const url = new URL("https://cdn.syndication.twimg.com/tweet-result");
		url.searchParams.set("id", tweetId);
		url.searchParams.set("lang", "en");
		url.searchParams.set(
			"features",
			[
				"tfw_timeline_list:",
				"tfw_follower_count_sunset:true",
				"tfw_tweet_edit_backend:on",
				"tfw_refsrc_session:on",
				"tfw_fosnr_soft_interventions_enabled:on",
				"tfw_show_birdwatch_pivots_enabled:on",
				"tfw_show_business_verified_badge:on",
				"tfw_duplicate_scribes_to_settings:on",
				"tfw_use_profile_image_shape_enabled:on",
				"tfw_show_blue_verified_badge:on",
				"tfw_legacy_timeline_sunset:true",
				"tfw_show_gov_verified_badge:on",
				"tfw_show_business_affiliate_badge:on",
				"tfw_tweet_edit_frontend:on",
			].join(";"),
		);
		url.searchParams.set("token", token);

		const res = await fetch(url.toString());
		if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
		const data = await res.json();

		if (data && data.__typename === "Tweet") {
			fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), "utf-8");
			return data as TweetData;
		}
	} catch (e) {
		console.warn(`[remark-embeds] Tweet fetch failed for ${tweetId}:`, e);
	}

	return null;
}

const X_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 1200 1227" fill="currentColor" aria-hidden="true" class="x-embed-logo-svg"><path d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284zM569.165 687.828l-47.468-67.894-377.686-540.24H309.2l304.797 435.991 47.468 67.894 396.2 566.721H905.539L569.165 687.854z"/></svg>`;
const HEART_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" width="18.75" height="18.75" fill="currentColor"><g><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.083 3.366.56 4.798 2.01 1.429-1.45 3.146-2.09 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></g></svg>`;
const COMMENT_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" width="18.75" height="18.75" fill="currentColor"><g><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"></path></g></svg>`;
const SHARE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" width="18.75" height="18.75" fill="currentColor"><g><path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"></path></g></svg>`;
const VERIFIED_BADGE_SVG = `<svg viewBox="0 0 24 24" aria-label="Verified account" width="1.2em" height="1.2em" class="x-embed-badge" style="display:inline-block;vertical-align:middle;margin-left:2px"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.74 2.743 1.847 3.42-.04.218-.059.444-.059.68 0 2.21 1.71 4 3.918 4 .47 0 .92-.086 1.336-.25.52 1.334 1.819 2.25 3.337 2.25s2.816-.916 3.337-2.25c.416.164.866.25 1.336.25 2.21 0 3.918-1.79 3.918-4 0-.236-.02-.462-.059-.68 1.108-.677 1.847-1.96 1.847-3.42z" fill="#1d9bf0"></path><path d="M10.222 17.5l-3.3-3.3 1.341-1.341 1.96 1.959 5.37-5.37 1.341 1.341-6.711 6.711z" fill="#fff"></path></g></svg>`;

function formatTweetText(tweet: TweetData): string {
	let text = tweet.text || "";

	if (tweet.mediaDetails) {
		for (const media of tweet.mediaDetails) {
			if (media.url) {
				text = text.replace(media.url, "");
			}
		}
	}

	// Url linkification
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	text = text.replace(urlRegex, '<span class="x-embed-link">$1</span>');

	// Newline to br
	text = text.replace(/\n/g, "<br/>").trim();

	return text;
}

function formatNumber(num: number): string {
	if (num === undefined || num === null) return "0";
	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1)}M`;
	}
	if (num >= 1000) {
		return `${(num / 1000).toFixed(1)}K`;
	}
	return num.toString();
}

function formatTime(isoString: string): string {
	if (!isoString) return "";
	const date = new Date(isoString);
	const timeOpts: Intl.DateTimeFormatOptions = {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	};
	const dateOpts: Intl.DateTimeFormatOptions = {
		month: "short",
		day: "numeric",
		year: "numeric",
	};
	const fmtTime = new Intl.DateTimeFormat("en-US", timeOpts).format(date);
	const fmtDate = new Intl.DateTimeFormat("en-US", dateOpts).format(date);
	return `${fmtTime} · ${fmtDate}`;
}

function buildRichTweetHtml(data: TweetData, originalUrl: string): string {
	const textHtml = formatTweetText(data);
	const timeString = formatTime(data.created_at);
	const finalUrl = originalUrl;
	const user = data.user;

	const isVerified = user.is_blue_verified || user.verified;
	const verifiedHtml = isVerified ? VERIFIED_BADGE_SVG : "";

	let mediaHtml = "";
	if (data.mediaDetails && data.mediaDetails.length > 0) {
		const images = data.mediaDetails
			.filter(
				(m) =>
					m.type === "photo" || m.type === "video" || m.type === "animated_gif",
			)
			.slice(0, 4);

		if (images.length > 0) {
			const gridClass = `x-embed-media-grid x-embed-media-${images.length}`;
			mediaHtml = `<div class="${gridClass}">`;
			for (const img of images) {
				const srcUrl = `${img.media_url_https}?name=medium`;
				const videoIcon =
					img.type === "video" || img.type === "animated_gif"
						? `<div class="x-embed-video-icon"><svg viewBox="0 0 24 24" aria-hidden="true" width="36" height="36" fill="white"><path d="M8 5v14l11-7z"/></svg></div>`
						: "";
				mediaHtml += `<div class="x-embed-media-item"><img src="${srcUrl}" alt="Tweet media" loading="lazy" decoding="async" />${videoIcon}</div>`;
			}
			mediaHtml += `</div>`;
		}
	}

	const likes = formatNumber(data.favorite_count);
	const replies = formatNumber(data.conversation_count);

	return `
<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" class="x-embed-card" style="display:block; text-decoration:none;">
  <div class="x-embed-header">
    <div class="x-embed-author">
      <img src="${user.profile_image_url_https}" alt="${user.name}" class="x-embed-avatar-img" loading="lazy" />
      <div class="x-embed-author-info">
        <span class="x-embed-name">${user.name}${verifiedHtml}</span>
        <span class="x-embed-handle">@${user.screen_name}</span>
      </div>
    </div>
    <div class="x-embed-logo" aria-label="Xで表示">${X_LOGO_SVG}</div>
  </div>
  <div class="x-embed-body">
    <p class="x-embed-text">${textHtml}</p>
    ${mediaHtml}
  </div>
  <div class="x-embed-footer">
    <div class="x-embed-date">${timeString}</div>
    <div class="x-embed-stats">
      <div class="x-embed-stat-item reply" aria-label="Replies">
        <div class="x-embed-stat-icon">${COMMENT_SVG}</div>
        <span>${replies}</span>
      </div>
      <div class="x-embed-stat-item heart" aria-label="Likes">
        <div class="x-embed-stat-icon">${HEART_SVG}</div>
        <span>${likes}</span>
      </div>
      <div class="x-embed-stat-item share" aria-label="Share">
        <div class="x-embed-stat-icon">${SHARE_SVG}</div>
      </div>
    </div>
  </div>
</a>`.replace(/\n/g, "");
}

function buildFallbackTweetHtml(url: string): string {
	return `<div class="remark-link-card-plus__container twitter-fallback"><a class="remark-link-card-plus__card" href="${url}" target="_blank" rel="noopener noreferrer"><div class="remark-link-card-plus__main"><div class="remark-link-card-plus__title">X (Twitter) Post</div><div class="remark-link-card-plus__description">Xで表示</div><div class="remark-link-card-plus__meta"><span class="remark-link-card-plus__url">${url}</span></div></div></a></div>`;
}

export function remarkEmbeds() {
	return async (tree: Root) => {
		const promises: Promise<void>[] = [];

		visit(
			tree,
			"paragraph",
			(node: Paragraph, index?: number, parent?: Parent) => {
				if (!node.children || node.children.length !== 1) return;

				const child = node.children[0];
				let url = "";

				if (child.type === "text") {
					url = (child as Text).value.trim();
				} else if (child.type === "link") {
					url = (child as Link).url.trim();
					if (
						child.children &&
						child.children.length === 1 &&
						child.children[0].type === "text"
					) {
						const linkText = (child.children[0] as Text).value.trim();
						if (
							!linkText.includes("x.com") &&
							!linkText.includes("twitter.com") &&
							!linkText.includes("youtube.com") &&
							!linkText.includes("youtu.be")
						) {
							return;
						}
					}
				} else {
					return;
				}

				// ── YouTube ──────────────────────────────────────────────
				const ytMatch = url.match(YOUTUBE_REGEX);
				if (ytMatch) {
					const videoId = ytMatch[1];
					const html = `<div class="lite-youtube-wrap"><div class="lite-youtube" data-video-id="${videoId}"><picture style="display:block;position:absolute;inset:0;width:100%;height:100%;"><source type="image/webp" srcset="https://i.ytimg.com/vi_webp/${videoId}/hqdefault.webp"><img src="https://i.ytimg.com/vi/${videoId}/hqdefault.jpg" alt="YouTube video" loading="lazy" decoding="async" style="display:block;width:100%;height:100%;object-fit:cover;"></picture><button class="lite-youtube-btn" aria-label="動画を再生" type="button"><div class="lite-youtube-btn-bg"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div></button></div><script>(function(){var yt=document.currentScript.previousElementSibling;yt.addEventListener('click',function(){var id=yt.dataset.videoId;var ifr=document.createElement('iframe');ifr.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';ifr.allow='accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share';ifr.allowFullscreen=true;ifr.style.cssText='position:absolute;inset:0;width:100%;height:100%;border:0;background:#000';yt.innerHTML='';yt.appendChild(ifr);},{once:true});})();</script></div>`;
					if (parent && index !== undefined) {
						parent.children[index] = {
							type: "html",
							value: html,
						} as Html;
					}
					return;
				}

				// ── X (Twitter) ──────────────────────────────────────────
				const xMatch = url.match(TWITTER_REGEX);
				if (xMatch) {
					const tweetId = xMatch[2];
					const embedUrl = url.includes("x.com")
						? url.replace("x.com", "twitter.com")
						: url;

					const promise = fetchTweetData(tweetId).then((data) => {
						const cardHtml = data
							? buildRichTweetHtml(data, embedUrl)
							: buildFallbackTweetHtml(url);
						if (parent && index !== undefined) {
							parent.children[index] = {
								type: "html",
								value: `<div class="x-embed-outer">${cardHtml}</div>`,
							} as Html;
						}
					});
					promises.push(promise);
				}
			},
		);

		await Promise.all(promises);
	};
}
