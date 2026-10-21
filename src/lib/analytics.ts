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
  | "user_feedback";

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
