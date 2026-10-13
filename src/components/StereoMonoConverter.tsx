"use client";

import { useState } from "react";

type Mode = "avg" | "left" | "right" | "side";

function encodeWavMono(samples: Float32Array, sr: number): Uint8Array {
  const numSamples = samples.length;
  const buf = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buf);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true);  // Linear PCM
  view.setUint16(22, 1, true);  // 1 channel (Mono)
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buf);
}

export default function StereoMonoConverter() {
  const [left, setLeft] = useState<Float32Array | null>(null);
  const [right, setRight] = useState<Float32Array | null>(null);
  const [sr, setSr] = useState(44100);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<Mode>("avg");
  const [corr, setCorr] = useState<number | null>(null);

  function computeCorrelation(l: Float32Array, r: Float32Array): number {
    let dot = 0, el = 0, er = 0;
    const step = Math.max(1, Math.floor(l.length / 50000));
    for (let i = 0; i < l.length; i += step) {
      dot += l[i] * r[i];
      el += l[i] * l[i];
      er += r[i] * r[i];
    }
    const d = Math.sqrt(el * er);
    return d > 1e-9 ? dot / d : 1;
  }

  async function onFile(file: File) {
    setFileName(file.name.replace(/\.[^.]+$/, ""));
    const ctx = new AudioContext();
    const ab = await ctx.decodeAudioData(await file.arrayBuffer());
    const l = new Float32Array(ab.getChannelData(0));
    const r = new Float32Array(ab.numberOfChannels > 1 ? ab.getChannelData(1) : ab.getChannelData(0));
    await ctx.close();
    setSr(ab.sampleRate);
    setLeft(l);
    setRight(r);
    setCorr(computeCorrelation(l, r));
  }

  function loadDemoStereo() {
    const sampleRate = 22050;
    const len = sampleRate * 2;
    const l = new Float32Array(len);
    const r = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      l[i] = 0.5 * Math.sin(2 * Math.PI * 220 * t);
      r[i] = 0.5 * Math.sin(2 * Math.PI * 220 * t + 0.8); // 带相位差的双声道采样
    }
    setFileName("stereo-sample");
    setSr(sampleRate);
    setLeft(l);
    setRight(r);
    setCorr(computeCorrelation(l, r));
  }

  function buildMono(): Float32Array {
    if (!left || !right) return new Float32Array(0);
    const out = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
      out[i] =
        mode === "avg"
          ? 0.5 * (left[i] + right[i])
          : mode === "left"
          ? left[i]
          : mode === "right"
          ? right[i]
          : 0.5 * (left[i] - right[i]);
    }
    return out;
  }

  function downloadMono() {
    const wav = encodeWavMono(buildMono(), sr);
    const blob = new Blob([wav.buffer as ArrayBuffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || "audio"}-mono-${mode}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {!left ? (
        <div className="flex flex-col gap-4">
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center transition hover:border-indigo-600"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) onFile(f);
            }}
          >
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
            <span className="text-4xl">🎧</span>
            <span className="text-lg font-semibold">Drop a Stereo MP3, WAV, FLAC or OGG file here</span>
            <span className="text-sm text-slate-500">
              Choose (L+R)/2 sum, Left-only, Right-only or Side-isolation with phase correlation check
            </span>
          </label>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadDemoStereo}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              ✨ Load Demo Stereo Sample
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
            <div className="text-sm" data-testid="phase-meter">
              Phase Correlation:{" "}
              <b className={corr !== null && corr < 0.2 ? "text-amber-600" : "text-emerald-700"}>
                {corr !== null ? corr.toFixed(2) : "—"}
              </b>{" "}
              {corr !== null && corr < 0.2 && (
                <span className="text-xs text-amber-700">
                  (⚠️ Low phase correlation — Left-only or Right-only recommended to avoid hollow sound)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLeft(null);
                  setRight(null);
                }}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                New File
              </button>
              <button
                type="button"
                onClick={downloadMono}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                ⬇ Download 16-bit Mono WAV
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["avg", "Average (L + R) / 2", "Standard mono sum for balanced stereo files"],
              ["left", "Left Channel Only (L)", "Zero phase cancellation — great for MPC & drum samples"],
              ["right", "Right Channel Only (R)", "Keep only the right microphone/channel"],
              ["side", "Side / Difference (L − R)", "Remove center mono signal and keep stereo width"],
            ].map(([k, title, desc]) => (
              <label
                key={k}
                className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 ${
                  mode === k ? "border-indigo-600 bg-indigo-50/40" : "border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <input
                    type="radio"
                    name="mono-mode"
                    checked={mode === k}
                    onChange={() => setMode(k as Mode)}
                  />
                  {title}
                </div>
                <span className="text-xs text-slate-500">{desc}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
