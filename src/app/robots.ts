import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://audio-to-midi-six.vercel.app";

// 源自 GEOInflow 的核心 AI 搜索索引与实时用户触发抓取身份白名单
const AI_SEARCH_CRAWLERS = [
  "*",
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "Googlebot",
  "Google-Extended",
  "bingbot",
  "Applebot",
  "Applebot-Extended",
  "DuckAssistBot",
  "Amzn-SearchBot",
  "Amzn-User",
  "MistralAI-User",
  "MistralAI-Index",
  "Kimi-SearchBot",
  "Kimi-User",
  "ExaSearchBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: AI_SEARCH_CRAWLERS.map((ua) => ({
      userAgent: ua,
      allow: ["/", "/llms.txt"],
    })),
    sitemap: `${SITE}/sitemap.xml`,
  };
}
