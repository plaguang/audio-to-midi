"use client";

import React, { useState } from "react";
import { trackToolEvent } from "@/lib/analytics";

export default function FeedbackBar({
  toolName,
  theme = "light",
}: {
  toolName: string;
  theme?: "light" | "dark";
}) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isDark = theme === "dark";

  function handleRate(choice: "up" | "down") {
    setRating(choice);
    const pagePath = typeof window !== "undefined" ? window.location.pathname : "/";
    trackToolEvent("user_feedback", {
      tool: toolName,
      page: pagePath,
      rating: choice,
    });
  }

  function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = comment.trim().slice(0, 180);
    const pagePath = typeof window !== "undefined" ? window.location.pathname : "/";
    trackToolEvent("user_feedback", {
      tool: toolName,
      page: pagePath,
      rating: rating || "comment",
      comment: trimmed || "no_text",
    });
    setSubmitted(true);
  }

  return (
    <div
      data-testid="feedback-bar"
      className={`rounded-2xl border px-4 py-3.5 text-xs transition ${
        isDark
          ? "border-slate-800 bg-slate-900/70 text-slate-300"
          : "border-slate-200 bg-white text-slate-700 shadow-xs"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium">
          <span>💬 Was this {toolName} helpful today?</span>
          {rating && !submitted && (
            <span className="text-emerald-500 font-semibold">
              Thanks! Tell us more below (optional):
            </span>
          )}
          {submitted && (
            <span data-testid="feedback-thanks" className="text-emerald-500 font-semibold">
              ✓ Thank you! Your feedback helps us improve this free tool.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="feedback-up-btn"
            onClick={() => handleRate("up")}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-semibold transition ${
              rating === "up"
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-500"
                : isDark
                ? "border-slate-700 bg-slate-950 text-slate-200 hover:border-emerald-500/50"
                : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>👍</span>
            <span>Yes, worked great</span>
          </button>

          <button
            type="button"
            data-testid="feedback-down-btn"
            onClick={() => handleRate("down")}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-semibold transition ${
              rating === "down"
                ? "border-amber-500 bg-amber-500/15 text-amber-500"
                : isDark
                ? "border-slate-700 bg-slate-950 text-slate-200 hover:border-amber-500/50"
                : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>👎</span>
            <span>Report Issue / Request Feature</span>
          </button>
        </div>
      </div>

      {rating && !submitted && (
        <form onSubmit={handleSubmitComment} className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            data-testid="feedback-comment-input"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              rating === "down"
                ? "What went wrong or which file format / feature do you need?"
                : "Any feature request or suggestion?"
            }
            className={`min-w-[240px] flex-1 rounded-lg border px-3 py-1.5 text-xs outline-none ${
              isDark
                ? "border-slate-700 bg-slate-950 text-slate-100 focus:border-emerald-500"
                : "border-slate-300 bg-slate-50 text-slate-900 focus:border-indigo-600"
            }`}
          />
          <button
            type="submit"
            data-testid="feedback-submit-btn"
            className="rounded-lg bg-emerald-600 px-3.5 py-1.5 font-semibold text-white hover:bg-emerald-500"
          >
            Send Feedback
          </button>
        </form>
      )}
    </div>
  );
}
