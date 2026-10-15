"use client";

import { track } from "@vercel/analytics";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
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
  | "download_mono_wav";

// 统一向 Vercel Analytics、Google Analytics 4 (GA4) 与 Microsoft Clarity 发送工具交互埋点
export function trackToolEvent(
  event: ToolEventName,
  props?: Record<string, string | number | boolean>
) {
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
