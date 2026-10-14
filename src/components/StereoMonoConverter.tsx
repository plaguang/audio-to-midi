"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "avg" | "left" | "right" | "side";

function encodeWavMono(samples: Float32Array, sampleRate: number): Uint8Array {
  const numSamples = samples.length;
  const buf = new ArrayBuffer(44 + numSamples * 2);
  const v = new DataView(buf);
  const wStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };

  wStr(0, "RIFF");
  v.setUint32(4, 36 + numSamples * 2, true);
  wStr(8, "WAVE");
  wStr(12, "fmt ");
  v.setUint32(16, 16, true); // PCM
  v.setUint16(20, 1, true); // format = 1
  v.setUint16(22, 1, true); // channels = 1 (Mono)
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  wStr(36, "data");
  v.setUint32(40, numSamples * 2, true);

  let p = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    p += 2;
  }
  return new Uint8Array(buf);
}

// 计算左右声道相位相关系数 (-1 .. +1)，提示是否存在反相抵消风险
function phaseCorrelation(l: Float32Array, r: Float32Array): number {
  let c = 0;
  let el = 0;
  let er = 0;
  const step = Math.max(1, Math.floor(l.length / 40000));
  for (let i = 0; i < l.length; i += step) {
    c += l[i] * r[i];
    el += l[i] * l[i];
    er += r[i] * r[i];
  }
  const d = Math.sqrt(el * er);
  return d > 1e-9 ? c / d : 1;
}

function measurePeakDb(buf: Float32Array): string {
  let peak = 0;
  const step = Math.max(1, Math.floor(buf.length / 50000));
  for (let i = 0; i < buf.length; i += step) {
    const a = Math.abs(buf[i]);
    if (a > peak) peak = a;
  }
  if (peak < 1e-5) return "-∞ dBFS";
  return `${(20 * Math.log10(peak)).toFixed(1)} dBFS`;
}

export default function StereoMonoConverter() {
  const [left, setLeft] = useState<Float32Array | null>(null);
  const [right, setRight] = useState<Float32Array | null>(null);
  const [sr, setSr] = useState(44100);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<Mode>("avg");
  const [normalize, setNormalize] = useState(false);
  const [corr, setCorr] = useState<number | null>(null);
  const [playing, setPlaying] = useState<false | "stereo" | "mono">(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeCtx = useRef<AudioContext | null>(null);

  async function stopAudio() {
    if (activeCtx.current) {
      try {
        await activeCtx.current.close();
      } catch {
        // ignore
      }
      activeCtx.current = null;
    }
    setPlaying(false);
  }

  async function onFile(file: File) {
    await stopAudio();
    setFileName(file.name.replace(/\.[^.]+$/, ""));
    const ctx = new AudioContext();
    const ab = await ctx.decodeAudioData(await file.arrayBuffer());
    const l = new Float32Array(ab.getChannelData(0));
    const r = ab.numberOfChannels > 1 ? new Float32Array(ab.getChannelData(1)) : new Float32Array(l);
    await ctx.close();
    setSr(ab.sampleRate);
    setLeft(l);
    setRight(r);
    setCorr(phaseCorrelation(l, r));
  }

  async function loadDemoStereo() {
    await stopAudio();
    const demoSr = 22050;
    const n = demoSr * 2;
    const l = new Float32Array(n);
    const r = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / demoSr;
      const env = Math.min(1, t / 0.03) * Math.min(1, (2 - t) / 0.08);
      l[i] = env * (0.35 * Math.sin(2 * Math.PI * 220 * t) + 0.2 * Math.sin(2 * Math.PI * 440 * t));
      // 右声道略带相位差与泛音差异
      r[i] = env * (0.35 * Math.sin(2 * Math.PI * 220 * t + 0.8) + 0.2 * Math.cos(2 * Math.PI * 330 * t));
    }
    setFileName("demo-stereo-synth");
    setSr(demoSr);
    setLeft(l);
    setRight(r);
    setCorr(phaseCorrelation(l, r));
  }

  function buildMono(): Float32Array {
    if (!left || !right) return new Float32Array(0);
    const out = new Float32Array(left.length);
    let peak = 0;
    for (let i = 0; i < left.length; i++) {
      const v =
        mode === "avg"
          ? 0.5 * (left[i] + right[i])
          : mode === "left"
          ? left[i]
          : mode === "right"
          ? right[i]
          : 0.5 * (left[i] - right[i]);
      out[i] = v;
      const a = Math.abs(v);
      if (a > peak) peak = a;
    }
    if (normalize && peak > 1e-5) {
      const targetGain = 0.89125 / peak; // -1.0 dBFS
      for (let i = 0; i < out.length; i++) out[i] *= targetGain;
    }
    return out;
  }

  // 绘制立体声 L/R 与合成后 Mono 波形对比画布
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !left || !right) return;
    const ctx = c.getContext("2d")!;
    const W = c.width;
    const H = c.height;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    const mono = buildMono();
    const lanes: { label: string; color: string; data: Float32Array }[] = [
      { label: "LEFT (L)", color: "#60a5fa", data: left },
      { label: "RIGHT (R)", color: "#a78bfa", data: right },
      { label: `MONO OUTPUT (${mode.toUpperCase()})`, color: "#34d399", data: mono },
    ];

    const laneH = H / 3;
    const padL = 8;
    const plotW = W - padL * 2;
    const step = Math.max(1, Math.floor(left.length / plotW));

    ctx.font = "11px ui-monospace, monospace";
    lanes.forEach((lane, idx) => {
      const topY = idx * laneH;
      const midY = topY + laneH / 2;

      if (idx > 0) {
        ctx.strokeStyle = "#334155";
        ctx.beginPath();
        ctx.moveTo(0, topY);
        ctx.lineTo(W, topY);
        ctx.stroke();
      }

      // 中心零线
      ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
      ctx.beginPath();
      ctx.moveTo(padL, midY);
      ctx.lineTo(W - padL, midY);
      ctx.stroke();

      // 波形包络
      ctx.strokeStyle = lane.color;
      ctx.beginPath();
      for (let x = 0; x < plotW; x++) {
        const s0 = x * step;
        const s1 = Math.min(lane.data.length, s0 + step);
        let minV = 0;
        let maxV = 0;
        for (let i = s0; i < s1; i++) {
          const v = lane.data[i];
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        }
        const y1 = midY - maxV * (laneH * 0.42);
        const y2 = midY - minV * (laneH * 0.42);
        ctx.moveTo(padL + x, y1);
        ctx.lineTo(padL + x, Math.max(y1 + 1, y2));
      }
      ctx.stroke();

      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(`${lane.label} · Peak ${measurePeakDb(lane.data)}`, 12, topY + 15);
    });
  }, [left, right, mode, normalize]);

  async function audition(kind: "stereo" | "mono") {
    if (playing === kind) {
      await stopAudio();
      return;
    }
    await stopAudio();
    if (!left || !right) return;
    setPlaying(kind);
    const ctx = new AudioContext();
    activeCtx.current = ctx;

    if (kind === "stereo") {
      const buf = ctx.createBuffer(2, left.length, sr);
      buf.getChannelData(0).set(left);
      buf.getChannelData(1).set(right);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => stopAudio();
      src.start();
    } else {
      const mono = buildMono();
      const buf = ctx.createBuffer(1, mono.length, sr);
      buf.getChannelData(0).set(mono);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => stopAudio();
      src.start();
    }
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
              Choose (L+R)/2 sum, Left-only, Right-only or Side-isolation with phase correlation &amp; live waveform check
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
            <div className="flex flex-wrap items-center gap-4 text-sm" data-testid="phase-meter">
              <span>
                Phase Correlation:{" "}
                <b className={corr !== null && corr < 0.2 ? "text-amber-600" : "text-emerald-700"}>
                  {corr !== null ? corr.toFixed(2) : "—"}
                </b>
              </span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={normalize}
                  onChange={(e) => setNormalize(e.target.checked)}
                />
                Normalize Mono Peak (-1.0 dBFS)
              </label>
              {corr !== null && corr < 0.2 && (
                <span className="text-xs text-amber-700">
                  (⚠️ Low phase correlation — Left-only or Right-only recommended to avoid hollow sound)
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await stopAudio();
                  setLeft(null);
                  setRight(null);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
              >
                New File
              </button>
              <button
                type="button"
                onClick={() => audition("stereo")}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {playing === "stereo" ? "⏹ Stop Stereo" : "🎧 Play Stereo"}
              </button>
              <button
                type="button"
                onClick={() => audition("mono")}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {playing === "mono" ? "⏹ Stop Mono" : "▶ Play Mono Output"}
              </button>
              <button
                type="button"
                onClick={downloadMono}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
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
                <div className="flex items-center gap-2 text-sm font-medium">
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

          {/* L / R / Mono 三轨实时波形对比图 */}
          <canvas
            ref={canvasRef}
            width={880}
            height={210}
            className="w-full rounded-xl border border-slate-800"
          />
        </div>
      )}
    </div>
  );
}
