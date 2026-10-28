"use client";

import { track } from "@vercel/analytics";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

// 统一识别自动化测试（Playwright / Headless / WebDriver）与站长自检流量
export function isAutomatedOrInternalSession(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return true;
  }
  try {
    if (navigator.webdriver === true) return true;
    const ua = navigator.userAgent || "";
    if (/HeadlessChrome|Playwright|Puppeteer|PhantomJS|Cypress|Lighthouse/i.test(ua)) {
      return true;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("e2e") === "1" || params.get("internal") === "1" || params.get("no_track") === "1") {
      try {
        window.localStorage.setItem("ignore_analytics", "1");
      } catch {
        // ignore
      }
      return true;
    }
    try {
      if (window.localStorage.getItem("ignore_analytics") === "1") {
        return true;
      }
    } catch {
      // ignore
    }
  } catch {
    return false;
  }
  return false;
}

export type ToolEventName =
  | "audio_upload"
  | "midi_file_upload"
  | "mic_record_start"
  | "mic_record_complete"
  | "demo_melody_load"
  | "auto_detect_key"
  | "play_midi_preview"
  | "play_original_audio"
  | "copy_note_names"
  | "download_midi"
  | "download_synth_wav"
  | "stereo_file_upload"
  | "stereo_demo_load"
  | "play_stereo_preview"
  | "play_mono_preview"
  | "download_mono_wav"
  | "play_chord_progression"
  | "download_chord_midi"
  | "user_feedback"
  | "ai_search_referral";

export interface AiReferralMatch {
  platformId: string;
  productId: string;
  matchedBy: "utm" | "referrer";
  sourceValue: string;
  landingPath: string;
}

// 源自 GEOInflow (猎看科技 · 北京日报社智源GEO) 的 38+ 条全球与国内 AI 搜索引荐识别规则库
const AI_REFERRAL_HOSTS: Array<{ host: string; platformId: string; productId: string }> = [
  { host: "chatgpt.com", platformId: "openai", productId: "chatgpt" },
  { host: "chat.openai.com", platformId: "openai", productId: "chatgpt" },
  { host: "search.openai.com", platformId: "openai", productId: "chatgpt-search" },
  { host: "copilot.microsoft.com", platformId: "microsoft", productId: "copilot" },
  { host: "perplexity.ai", platformId: "perplexity", productId: "perplexity" },
  { host: "www.perplexity.ai", platformId: "perplexity", productId: "perplexity" },
  { host: "app.perplexity.ai", platformId: "perplexity", productId: "perplexity" },
  { host: "claude.ai", platformId: "anthropic", productId: "claude" },
  { host: "gemini.google.com", platformId: "google", productId: "gemini" },
  { host: "grok.com", platformId: "xai", productId: "grok" },
  { host: "you.com", platformId: "you", productId: "you-search" },
  { host: "phind.com", platformId: "phind", productId: "phind" },
  { host: "www.phind.com", platformId: "phind", productId: "phind" },
  { host: "kagi.com", platformId: "kagi", productId: "kagi-assistant" },
  { host: "exa.ai", platformId: "exa", productId: "exa" },
  { host: "manus.im", platformId: "manus", productId: "manus" },
  { host: "cue.im", platformId: "manus", productId: "cue" },
  { host: "kimi.com", platformId: "kimi", productId: "kimi" },
  { host: "www.kimi.com", platformId: "kimi", productId: "kimi" },
  { host: "kimi.ai", platformId: "kimi", productId: "kimi" },
  { host: "www.kimi.ai", platformId: "kimi", productId: "kimi" },
  { host: "kimi.moonshot.cn", platformId: "kimi", productId: "kimi" },
  { host: "chat.deepseek.com", platformId: "deepseek", productId: "deepseek-chat" },
  { host: "doubao.com", platformId: "bytedance", productId: "doubao" },
  { host: "www.doubao.com", platformId: "bytedance", productId: "doubao" },
  { host: "qianwen.com", platformId: "alibaba", productId: "qwen" },
  { host: "www.qianwen.com", platformId: "alibaba", productId: "qwen" },
  { host: "chat.qwen.ai", platformId: "alibaba", productId: "qwen" },
  { host: "yuanbao.tencent.com", platformId: "tencent", productId: "yuanbao" },
  { host: "ima.qq.com", platformId: "tencent", productId: "ima" },
  { host: "chatglm.cn", platformId: "zhipu", productId: "qingyan" },
  { host: "metaso.cn", platformId: "metaso", productId: "metaso" },
  { host: "xinghuo.xfyun.cn", platformId: "iflytek", productId: "spark" },
  { host: "agent.minimax.io", platformId: "minimax", productId: "minimax-agent" },
  { host: "chat.stepfun.com", platformId: "stepfun", productId: "stepfun" },
  { host: "www.tiangong.cn", platformId: "skywork", productId: "tiangong" },
  { host: "www.n.cn", platformId: "360", productId: "namiai" },
  { host: "chat.sensetime.com", platformId: "sensetime", productId: "sensechat" },
  { host: "coze.cn", platformId: "bytedance", productId: "coze" },
  { host: "www.coze.cn", platformId: "bytedance", productId: "coze" },
  { host: "code.coze.cn", platformId: "bytedance", productId: "coze-code" },
  { host: "www.trae.cn", platformId: "bytedance", productId: "doubao" },
  { host: "yiyan.baidu.com", platformId: "baidu", productId: "wenxin" },
];

const AI_UTM_ALIASES: Array<{ pattern: RegExp; platformId: string; productId: string }> = [
  { pattern: /^(chatgpt|openai)(\.com)?$/i, platformId: "openai", productId: "chatgpt" },
  { pattern: /^(copilot|bing[-_]?copilot|copilot\.microsoft\.com|copilot\.com)$/i, platformId: "microsoft", productId: "copilot" },
  { pattern: /^perplexity(\.ai)?$/i, platformId: "perplexity", productId: "perplexity" },
  { pattern: /^(claude|anthropic)(\.ai)?$/i, platformId: "anthropic", productId: "claude" },
  { pattern: /^gemini(\.google\.com)?$/i, platformId: "google", productId: "gemini" },
  { pattern: /^(grok|xai)(\.com)?$/i, platformId: "xai", productId: "grok" },
  { pattern: /^deepseek(\.com)?$/i, platformId: "deepseek", productId: "deepseek-chat" },
  { pattern: /^kimi(\.ai|\.com)?$/i, platformId: "kimi", productId: "kimi" },
  { pattern: /^doubao(\.com)?$/i, platformId: "bytedance", productId: "doubao" },
  { pattern: /^(qwen|qianwen)(\.ai|\.com)?$/i, platformId: "alibaba", productId: "qwen" },
  { pattern: /^yuanbao$/i, platformId: "tencent", productId: "yuanbao" },
  { pattern: /^ima$/i, platformId: "tencent", productId: "ima" },
  { pattern: /^chatglm$/i, platformId: "zhipu", productId: "qingyan" },
  { pattern: /^metaso(\.cn)?$/i, platformId: "metaso", productId: "metaso" },
  { pattern: /^xinghuo$/i, platformId: "iflytek", productId: "spark" },
  { pattern: /^minimax$/i, platformId: "minimax", productId: "minimax-agent" },
  { pattern: /^stepfun$/i, platformId: "stepfun", productId: "stepfun" },
  { pattern: /^tiangong$/i, platformId: "skywork", productId: "tiangong" },
  { pattern: /^namiai$/i, platformId: "360", productId: "namiai" },
  { pattern: /^coze(\.cn)?$/i, platformId: "bytedance", productId: "coze" },
  { pattern: /^trae(\.cn)?$/i, platformId: "bytedance", productId: "doubao" },
  { pattern: /^manus(\.im)?$/i, platformId: "manus", productId: "manus" },
  { pattern: /^cue(\.im)?$/i, platformId: "manus", productId: "cue" },
  { pattern: /^exa(\.ai)?$/i, platformId: "exa", productId: "exa" },
  { pattern: /^yiyan$/i, platformId: "baidu", productId: "wenxin" },
  { pattern: /^phind(\.com)?$/i, platformId: "phind", productId: "phind" },
  { pattern: /^you(\.com)?$/i, platformId: "you", productId: "you-search" },
];

// 检测当前浏览器会话是否由 AI 搜索引擎 / 对话助手引荐（支持 utm_source 别名与 document.referrer 域名）
export function detectAiSearchReferral(): AiReferralMatch | null {
  if (typeof window === "undefined") return null;
  try {
    const landingPath = window.location.pathname || "/";
    const params = new URLSearchParams(window.location.search);
    const utmSource = (params.get("utm_source") || params.get("ref") || "").trim().toLowerCase();

    if (utmSource) {
      for (const rule of AI_UTM_ALIASES) {
        if (rule.pattern.test(utmSource)) {
          return {
            platformId: rule.platformId,
            productId: rule.productId,
            matchedBy: "utm",
            sourceValue: utmSource,
            landingPath,
          };
        }
      }
      const hostMatch = AI_REFERRAL_HOSTS.find((h) => h.host === utmSource);
      if (hostMatch) {
        return {
          platformId: hostMatch.platformId,
          productId: hostMatch.productId,
          matchedBy: "utm",
          sourceValue: utmSource,
          landingPath,
        };
      }
    }

    const rawRef = document.referrer || "";
    if (rawRef) {
      const refHost = new URL(rawRef).hostname.toLowerCase();
      const exact = AI_REFERRAL_HOSTS.find(
        (h) => refHost === h.host || refHost.endsWith(`.${h.host}`)
      );
      if (exact) {
        return {
          platformId: exact.platformId,
          productId: exact.productId,
          matchedBy: "referrer",
          sourceValue: refHost,
          landingPath,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

// 每个会话仅触发一次 AI 引荐归因上报，并向 Clarity 注入会话级筛选标签
export function trackAiReferralIfPresent(): AiReferralMatch | null {
  if (isAutomatedOrInternalSession()) return null;
  const match = detectAiSearchReferral();
  if (!match) return null;

  try {
    const storageKey = `geo_ai_referral_logged_${match.platformId}_${match.productId}`;
    if (window.sessionStorage.getItem(storageKey) === "1") {
      return match;
    }
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // ignore storage errors
  }

  trackToolEvent("ai_search_referral", {
    ai_platform: match.platformId,
    ai_product: match.productId,
    matched_by: match.matchedBy,
    ai_source: match.sourceValue,
    landing_path: match.landingPath,
  });

  // 由于 GA4 / Clarity 脚本采用 lazyOnload，延迟二次同步 Clarity 自定义会话标签，确保录屏 100% 挂上 AI 标签
  if (typeof window !== "undefined") {
    const syncClarityTags = () => {
      try {
        if (typeof window.clarity === "function") {
          window.clarity("set", "ai_referral", match.productId);
          window.clarity("set", "ai_platform", match.platformId);
          window.clarity("set", "ai_source", match.sourceValue);
          window.clarity("event", `ai_ref_${match.productId}`);
        }
      } catch {
        // ignore
      }
    };
    setTimeout(syncClarityTags, 1500);
    setTimeout(syncClarityTags, 4000);
  }

  return match;
}

// 统一向 Vercel Analytics、Google Analytics 4 (GA4) 与 Microsoft Clarity 发送工具交互埋点（已屏蔽自动化测试流量）
export function trackToolEvent(
  event: ToolEventName,
  props?: Record<string, string | number | boolean>
) {
  if (isAutomatedOrInternalSession()) return;
  try {
    track(event, props);
  } catch {
    // ignore in dev/offline
  }

  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", event, props ?? {});
    }
  } catch {
    // ignore
  }

  try {
    if (typeof window !== "undefined" && typeof window.clarity === "function") {
      window.clarity("event", event);
      if (props) {
        for (const [k, v] of Object.entries(props)) {
          window.clarity("set", k, String(v));
        }
      }
    }
  } catch {
    // ignore
  }
}
