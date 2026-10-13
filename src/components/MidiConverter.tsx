"use client";

import { useEffect, useRef, useState } from "react";

export type RawNote = {
  midi: number;
  startSec: number;
  durSec: number;
  velocity: number; // 1..127
  rms: number;
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const midiToName = (m: number) => `${NOTE_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

// 音阶半音集合（相对于根音 C=0..B=11）
const SCALES: Record<string, number[] | null> = {
  "Chromatic (Off)": null,
  "C Major / A Minor": [0, 2, 4, 5, 7, 9, 11],
  "G Major / E Minor": [7, 9, 11, 0, 2, 4, 6],
  "F Major / D Minor": [5, 7, 9, 10, 0, 2, 4],
  "D Major / B Minor": [2, 4, 6, 7, 9, 11, 1],
  "A Minor Pentatonic": [9, 0, 2, 4, 7],
};

function snapToScale(midi: number, allowed: number[] | null): number {
  if (!allowed) return midi;
  const pc = ((midi % 12) + 12) % 12;
  if (allowed.includes(pc)) return midi;
  for (let d = 1; d <= 6; d++) {
    if (allowed.includes((pc - d + 12) % 12)) return midi - d;
    if (allowed.includes((pc + d) % 12)) return midi + d;
  }
  return midi;
}

// 归一化自相关基频检测（采用 McLeod 首峰准则避免低八度倍频跳变）
function detectPitchHz(buf: Float32Array, sr: number): { hz: number; rms: number } {
  let sumSq = 0;
  for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
  const rms = Math.sqrt(sumSq / buf.length);
  if (rms < 0.004) return { hz: 0, rms };

  const minLag = Math.floor(sr / 1100); // ~C6 (1046 Hz)
  const maxLag = Math.min(buf.length >> 1, Math.floor(sr / 65)); // ~C2 (65 Hz)
  const corrs = new Float32Array(maxLag + 2);
  let bestLag = -1;
  let bestCorr = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    let e1 = 0;
    let e2 = 0;
    const n = buf.length - lag;
    for (let i = 0; i < n; i++) {
      const a = buf[i];
      const b = buf[i + lag];
      c += a * b;
      e1 += a * a;
      e2 += b * b;
    }
    const denom = Math.sqrt(e1 * e2);
    const norm = denom > 1e-9 ? c / denom : 0;
    corrs[lag] = norm;
    if (norm > bestCorr) {
      bestCorr = norm;
      bestLag = lag;
    }
  }
  if (bestCorr < 0.65 || bestLag <= 0) return { hz: 0, rms };

  // 选择首个达到全局最高峰 88% 以上的局部极大值，彻底消除 2T/3T 低八度误判
  const threshold = bestCorr * 0.88;
  let chosenLag = bestLag;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (corrs[lag] >= threshold && corrs[lag] >= corrs[lag - 1] && corrs[lag] >= corrs[lag + 1]) {
      chosenLag = lag;
      break;
    }
  }
  return { hz: sr / chosenLag, rms };
}

function extractRawNotes(samples: Float32Array, sr: number): RawNote[] {
  const win = Math.floor(sr * 0.04); // 40ms 窗
  const hop = Math.floor(sr * 0.02); // 20ms 步进
  const frames: { midi: number; rms: number; t: number }[] = [];

  for (let off = 0; off + win <= samples.length; off += hop) {
    const slice = samples.subarray(off, off + win);
    const { hz, rms } = detectPitchHz(slice, sr);
    const midi = hz > 0 ? Math.round(69 + 12 * Math.log2(hz / 440)) : 0;
    frames.push({
      midi: midi >= 36 && midi <= 96 ? midi : 0,
      rms,
      t: off / sr,
    });
  }

  // 3 帧中值滤波消除单帧跳变
  const smoothed = frames.map((f, i) => {
    if (i === 0 || i === frames.length - 1) return f.midi;
    const a = [frames[i - 1].midi, f.midi, frames[i + 1].midi].sort((x, y) => x - y);
    return a[1];
  });

  // 合并相邻同音高帧为音符
  const notes: RawNote[] = [];
  const dt = hop / sr;
  let cur: RawNote | null = null;
  for (let i = 0; i < frames.length; i++) {
    const m = smoothed[i];
    const r = frames[i].rms;
    if (m > 0) {
      if (cur && cur.midi === m) {
        cur.durSec += dt;
        cur.rms = Math.max(cur.rms, r);
        cur.velocity = Math.min(127, Math.max(40, Math.round(cur.rms * 420)));
      } else {
        if (cur) notes.push(cur);
        cur = {
          midi: m,
          startSec: frames[i].t,
          durSec: dt,
          rms: r,
          velocity: Math.min(127, Math.max(40, Math.round(r * 420))),
        };
      }
    } else if (cur) {
      notes.push(cur);
      cur = null;
    }
  }
  if (cur) notes.push(cur);
  return notes;
}

// 生成标准 SMF Type 0 MIDI 二进制文件
function buildMidiFile(notes: RawNote[], bpm: number): Uint8Array {
  const tpq = 480;
  const usPerBeat = Math.round(60_000_000 / bpm);
  const secToTick = (s: number) => Math.max(0, Math.round((s * bpm * tpq) / 60));

  type Ev = { tick: number; bytes: number[] };
  const evs: Ev[] = [
    {
      tick: 0,
      bytes: [0xff, 0x51, 0x03, (usPerBeat >> 16) & 0xff, (usPerBeat >> 8) & 0xff, usPerBeat & 0xff],
    },
  ];
  for (const n of notes) {
    const t0 = secToTick(n.startSec);
    const t1 = Math.max(t0 + 20, secToTick(n.startSec + n.durSec));
    evs.push({ tick: t0, bytes: [0x90, n.midi & 0x7f, n.velocity & 0x7f] });
    evs.push({ tick: t1, bytes: [0x80, n.midi & 0x7f, 0x00] });
  }
  evs.sort((a, b) => a.tick - b.tick || a.bytes[0] - b.bytes[0]);

  const vlq = (v: number): number[] => {
    const out = [v & 0x7f];
    while ((v >>= 7) > 0) out.unshift((v & 0x7f) | 0x80);
    return out;
  };

  const track: number[] = [];
  let last = 0;
  for (const e of evs) {
    track.push(...vlq(e.tick - last), ...e.bytes);
    last = e.tick;
  }
  track.push(0x00, 0xff, 0x2f, 0x00); // End of track

  const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
  const u16 = (n: number) => [(n >>> 8) & 0xff, n & 0xff];

  const header = [
    0x4d, 0x54, 0x68, 0x64, // MThd
    ...u32(6),
    ...u16(0), // format 0
    ...u16(1), // 1 track
    ...u16(tpq),
    0x4d, 0x54, 0x72, 0x6b, // MTrk
    ...u32(track.length),
    ...track,
  ];
  return new Uint8Array(header);
}

// 合成一段带细微碎音的旋律采样（供用户一键体验与自动化测试）
function createDemoSamples(sr = 22050): { samples: Float32Array; sr: number } {
  // C4 - E4 - G4 - A4 - G4 + 两个 ~36ms 碎杂音（用来演示 Min Note Length 滤除效果）
  const seq = [
    { hz: 261.63, start: 0.1, dur: 0.36, amp: 0.25 }, // C4
    { hz: 370.0, start: 0.52, dur: 0.036, amp: 0.16 }, // 碎音 (F#4)
    { hz: 329.63, start: 0.64, dur: 0.36, amp: 0.25 }, // E4
    { hz: 392.0, start: 1.08, dur: 0.36, amp: 0.26 },  // G4
    { hz: 311.13, start: 1.5, dur: 0.036, amp: 0.16 }, // 碎音 (D#4)
    { hz: 440.0, start: 1.62, dur: 0.38, amp: 0.27 }, // A4
    { hz: 392.0, start: 2.08, dur: 0.42, amp: 0.25 }, // G4
  ];
  const totalSec = 2.6;
  const out = new Float32Array(Math.floor(sr * totalSec));
  for (const s of seq) {
    const i0 = Math.floor(s.start * sr);
    const i1 = Math.min(out.length, Math.floor((s.start + s.dur) * sr));
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / sr;
      const env = Math.min(1, t / 0.01) * Math.min(1, (s.dur - t) / 0.015);
      // 基波 + 少量泛音模拟人声/乐器
      out[i] =
        s.amp *
        env *
        (0.75 * Math.sin(2 * Math.PI * s.hz * t) +
          0.2 * Math.sin(4 * Math.PI * s.hz * t) +
          0.05 * Math.sin(6 * Math.PI * s.hz * t));
    }
  }
  return { samples: out, sr };
}

export default function MidiConverter({ defaultMode = "audio" }: { defaultMode?: "audio" | "voice" }) {
  const [rawNotes, setRawNotes] = useState<RawNote[]>([]);
  const [removedIdx, setRemovedIdx] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState("");
  const [minDurMs, setMinDurMs] = useState(80); // 默认滤掉 <80ms 碎杂音
  const [minRms, setMinRms] = useState(0.02);
  const [scale, setScale] = useState<string>("Chromatic (Off)");
  const [bpm, setBpm] = useState(120);
  const [quantize, setQuantize] = useState<"off" | "16" | "8">("off");
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const mediaRec = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 计算清理后的音符列表
  const cleanedNotes: (RawNote & { origIdx: number })[] = rawNotes
    .map((n, origIdx) => ({ ...n, origIdx }))
    .filter((n) => !removedIdx.has(n.origIdx))
    .filter((n) => n.durSec * 1000 >= minDurMs && n.rms >= minRms)
    .map((n) => {
      const snappedMidi = snapToScale(n.midi, SCALES[scale]);
      if (quantize === "off") return { ...n, midi: snappedMidi };
      const gridSec = (60 / bpm) * (quantize === "16" ? 0.25 : 0.5);
      const qStart = Math.round(n.startSec / gridSec) * gridSec;
      const qDur = Math.max(gridSec, Math.round(n.durSec / gridSec) * gridSec);
      return { ...n, midi: snappedMidi, startSec: qStart, durSec: qDur };
    });

  const strayRemovedCount = rawNotes.length - cleanedNotes.length;

  async function handleFile(file: File) {
    setBusy("Decoding & extracting melody notes…");
    setFileName(file.name.replace(/\.[^.]+$/, ""));
    setRemovedIdx(new Set());
    const ctx = new AudioContext();
    const ab = await ctx.decodeAudioData(await file.arrayBuffer());
    const ch0 = ab.getChannelData(0);
    // 若立体声则取左右平均
    const mono = new Float32Array(ch0.length);
    if (ab.numberOfChannels > 1) {
      const ch1 = ab.getChannelData(1);
      for (let i = 0; i < ch0.length; i++) mono[i] = 0.5 * (ch0[i] + ch1[i]);
    } else {
      mono.set(ch0);
    }
    const notes = extractRawNotes(mono, ab.sampleRate);
    await ctx.close();
    setRawNotes(notes);
    setBusy("");
  }

  function loadDemo() {
    setBusy("Synthesizing demo melody…");
    setFileName("demo-vocal-melody");
    setRemovedIdx(new Set());
    const { samples, sr } = createDemoSamples();
    const notes = extractRawNotes(samples, sr);
    setRawNotes(notes);
    setBusy("");
  }

  async function toggleMic() {
    if (recording && mediaRec.current) {
      mediaRec.current.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        await handleFile(new File([blob], "hummed-melody.webm", { type: blob.type }));
      };
      mediaRec.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      alert("Microphone permission denied or unavailable. Try 'Load Demo Melody' or upload an audio file.");
    }
  }

  // 绘制钢琴卷帘 (Piano Roll)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !rawNotes.length) return;
    const ctx = c.getContext("2d")!;
    const W = c.width;
    const H = c.height;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    const allMidi = cleanedNotes.length ? cleanedNotes.map((n) => n.midi) : rawNotes.map((n) => n.midi);
    const minM = Math.max(36, Math.min(...allMidi) - 2);
    const maxM = Math.min(96, Math.max(...allMidi) + 2);
    const spanM = Math.max(8, maxM - minM + 1);
    const maxT = Math.max(2.5, ...rawNotes.map((n) => n.startSec + n.durSec));
    const padL = 46;
    const rowH = H / spanM;

    // 音高横线与左侧音名
    ctx.font = "11px ui-monospace, monospace";
    for (let m = minM; m <= maxM; m++) {
      const y = H - (m - minM + 1) * rowH;
      const isBlack = [1, 3, 6, 8, 10].includes(m % 12);
      ctx.fillStyle = isBlack ? "#1e293b" : "#0f172a";
      ctx.fillRect(padL, y, W - padL, rowH);
      ctx.strokeStyle = "#334155";
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      ctx.fillStyle = m % 12 === 0 ? "#f8fafc" : "#94a3b8";
      ctx.fillText(midiToName(m), 6, y + rowH * 0.75);
    }

    // 先画被滤掉的碎杂音（半透明虚影，直观展示清理效果）
    for (let i = 0; i < rawNotes.length; i++) {
      if (cleanedNotes.some((cn) => cn.origIdx === i)) continue;
      const n = rawNotes[i];
      const x = padL + (n.startSec / maxT) * (W - padL - 10);
      const w = Math.max(4, (n.durSec / maxT) * (W - padL - 10));
      const y = H - (n.midi - minM + 1) * rowH + 2;
      ctx.fillStyle = "rgba(239, 68, 68, 0.28)";
      ctx.fillRect(x, y, w, Math.max(4, rowH - 4));
    }

    // 再画保留下来的有效音符
    for (const n of cleanedNotes) {
      const x = padL + (n.startSec / maxT) * (W - padL - 10);
      const w = Math.max(6, (n.durSec / maxT) * (W - padL - 10));
      const y = H - (n.midi - minM + 1) * rowH + 2;
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(x, y, w, Math.max(6, rowH - 4));
      ctx.fillStyle = "#052e16";
      if (w > 24) ctx.fillText(midiToName(n.midi), x + 4, y + rowH * 0.72);
    }
  }, [rawNotes, cleanedNotes]);

  // 点击钢琴卷帘上的音符可手动删除
  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current;
    if (!c || !cleanedNotes.length) return;
    const r = c.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * c.width;
    const py = ((e.clientY - r.top) / r.height) * c.height;
    const allMidi = cleanedNotes.map((n) => n.midi);
    const minM = Math.max(36, Math.min(...allMidi) - 2);
    const maxM = Math.min(96, Math.max(...allMidi) + 2);
    const spanM = Math.max(8, maxM - minM + 1);
    const maxT = Math.max(2.5, ...rawNotes.map((n) => n.startSec + n.durSec));
    const padL = 46;
    const rowH = c.height / spanM;

    for (const n of cleanedNotes) {
      const x = padL + (n.startSec / maxT) * (c.width - padL - 10);
      const w = Math.max(6, (n.durSec / maxT) * (c.width - padL - 10));
      const y = c.height - (n.midi - minM + 1) * rowH + 2;
      if (px >= x && px <= x + w && py >= y && py <= y + rowH) {
        setRemovedIdx((prev) => new Set(prev).add(n.origIdx));
        return;
      }
    }
  }

  // 用 WebAudio 合成器试听当前清理后的 MIDI 音符
  async function playPreview() {
    if (playing || !cleanedNotes.length) return;
    setPlaying(true);
    const ctx = new AudioContext();
    const t0 = ctx.currentTime + 0.05;
    let endSec = 0;
    for (const n of cleanedNotes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 440 * Math.pow(2, (n.midi - 69) / 12);
      gain.gain.setValueAtTime(0.001, t0 + n.startSec);
      gain.gain.linearRampToValueAtTime(0.22, t0 + n.startSec + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + n.startSec + n.durSec);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + n.startSec);
      osc.stop(t0 + n.startSec + n.durSec + 0.02);
      endSec = Math.max(endSec, n.startSec + n.durSec);
    }
    setTimeout(async () => {
      await ctx.close();
      setPlaying(false);
    }, (endSec + 0.15) * 1000);
  }

  function downloadMidi() {
    const bytes = buildMidiFile(cleanedNotes, bpm);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || "melody"}.mid`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {!rawNotes.length ? (
        <div className="flex flex-col gap-4">
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center transition hover:border-indigo-600"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
          >
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <span className="text-4xl">🎹</span>
            <span className="text-lg font-semibold">
              {busy || (defaultMode === "voice" ? "Drop a voice/hummed recording or MP3/WAV file" : "Drop an MP3, WAV or voice recording here")}
            </span>
            <span className="text-sm text-slate-500">
              100% private in-browser conversion · Built-in stray-note cleaner &amp; scale lock
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={toggleMic}
              className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition ${
                recording ? "animate-pulse bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {recording ? "⏹ Stop Recording Hum/Voice" : "🎙️ Record Voice / Hum Melody"}
            </button>
            <button
              type="button"
              onClick={loadDemo}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              ✨ Load Demo Melody (with stray notes)
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* 碎音清理与量化控制栏 */}
          <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              <span>Min Note Length (Stray Filter): <b>{minDurMs} ms</b></span>
              <input
                type="range"
                aria-label="Min Note Length"
                min={20}
                max={250}
                step={10}
                value={minDurMs}
                onChange={(e) => setMinDurMs(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              <span>Noise Gate (RMS): <b>{minRms.toFixed(3)}</b></span>
              <input
                type="range"
                aria-label="Noise Gate"
                min={0.005}
                max={0.12}
                step={0.005}
                value={minRms}
                onChange={(e) => setMinRms(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              <span>Scale Lock (Snap Pitch)</span>
              <select
                aria-label="Scale Lock"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                value={scale}
                onChange={(e) => setScale(e.target.value)}
              >
                {Object.keys(SCALES).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-700">
                <span>BPM</span>
                <input
                  type="number"
                  aria-label="BPM"
                  min={40}
                  max={240}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value) || 120)}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-700">
                <span>Grid Snap</span>
                <select
                  aria-label="Grid Snap"
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                  value={quantize}
                  onChange={(e) => setQuantize(e.target.value as "off" | "16" | "8")}
                >
                  <option value="off">Off</option>
                  <option value="16">1/16 note</option>
                  <option value="8">1/8 note</option>
                </select>
              </label>
            </div>
          </div>

          {/* 统计与操作按钮 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600" data-testid="note-stats">
              Clean notes: <b className="text-emerald-700">{cleanedNotes.length}</b> · Stray notes filtered:{" "}
              <b className="text-rose-600">{strayRemovedCount}</b>{" "}
              <span className="text-xs text-slate-400">(click any green note on the piano roll to delete it)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRawNotes([])}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
              >
                New Audio
              </button>
              <button
                type="button"
                onClick={playPreview}
                disabled={playing || !cleanedNotes.length}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {playing ? "🔊 Playing…" : "▶ Play MIDI Preview"}
              </button>
              <button
                type="button"
                onClick={downloadMidi}
                disabled={!cleanedNotes.length}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                ⬇ Download .MID ({cleanedNotes.length} notes)
              </button>
            </div>
          </div>

          {/* 钢琴卷帘 */}
          <canvas
            ref={canvasRef}
            width={880}
            height={280}
            onClick={onCanvasClick}
            className="w-full cursor-pointer rounded-xl border border-slate-800"
          />

          {/* 音符标签列表 */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {cleanedNotes.map((n, idx) => (
              <span
                key={idx}
                onClick={() => setRemovedIdx((prev) => new Set(prev).add(n.origIdx))}
                title="Click to remove note"
                className="cursor-pointer rounded bg-emerald-50 px-2 py-1 font-mono text-emerald-800 border border-emerald-200 hover:bg-rose-50 hover:text-rose-700"
              >
                {midiToName(n.midi)} ({Math.round(n.durSec * 1000)}ms)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
