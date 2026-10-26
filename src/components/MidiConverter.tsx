"use client";

import { useEffect, useRef, useState } from "react";
import { trackToolEvent } from "@/lib/analytics";

export type RawNote = {
  midi: number;
  startSec: number;
  durSec: number;
  velocity: number; // 1..127
  rms: number;
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const midiToName = (m: number) => `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;

// 完整调式音阶库（覆盖全部常用大小调与五声音阶）
const SCALES: Record<string, number[] | null> = {
  "Chromatic (Off)": null,
  "C Major / A Minor": [0, 2, 4, 5, 7, 9, 11],
  "G Major / E Minor": [7, 9, 11, 0, 2, 4, 6],
  "D Major / B Minor": [2, 4, 6, 7, 9, 11, 1],
  "A Major / F# Minor": [9, 11, 1, 2, 4, 6, 8],
  "E Major / C# Minor": [4, 6, 8, 9, 11, 1, 3],
  "F Major / D Minor": [5, 7, 9, 10, 0, 2, 4],
  "Bb Major / G Minor": [10, 0, 2, 3, 5, 7, 9],
  "Eb Major / C Minor": [3, 5, 7, 8, 10, 0, 2],
  "Ab Major / F Minor": [8, 10, 0, 1, 3, 5, 7],
  "A Minor Pentatonic": [9, 0, 2, 4, 7],
  "C Major Pentatonic": [0, 2, 4, 7, 9],
};

// 每个调式对应的常用流行/电子伴奏和弦进行（I–V–vi–IV 与 vi–IV–I–V）及对应的 MIDI 三和弦音高
const SCALE_HARMONY: Record<
  string,
  {
    camelot: string;
    majorProgression: string;
    minorProgression: string;
    chords: { label: string; midiNotes: number[] }[];
  }
> = {
  "C Major / A Minor": {
    camelot: "8B / 8A",
    majorProgression: "C – G – Am – F (I–V–vi–IV)",
    minorProgression: "Am – F – C – G (vi–IV–I–V)",
    chords: [
      { label: "C", midiNotes: [60, 64, 67] },
      { label: "G", midiNotes: [55, 59, 62] },
      { label: "Am", midiNotes: [57, 60, 64] },
      { label: "F", midiNotes: [53, 57, 60] },
    ],
  },
  "G Major / E Minor": {
    camelot: "9B / 9A",
    majorProgression: "G – D – Em – C (I–V–vi–IV)",
    minorProgression: "Em – C – G – D (vi–IV–I–V)",
    chords: [
      { label: "G", midiNotes: [55, 59, 62] },
      { label: "D", midiNotes: [62, 66, 69] },
      { label: "Em", midiNotes: [52, 55, 59] },
      { label: "C", midiNotes: [60, 64, 67] },
    ],
  },
  "D Major / B Minor": {
    camelot: "10B / 10A",
    majorProgression: "D – A – Bm – G (I–V–vi–IV)",
    minorProgression: "Bm – G – D – A (vi–IV–I–V)",
    chords: [
      { label: "D", midiNotes: [62, 66, 69] },
      { label: "A", midiNotes: [57, 61, 64] },
      { label: "Bm", midiNotes: [59, 62, 66] },
      { label: "G", midiNotes: [55, 59, 62] },
    ],
  },
  "A Major / F# Minor": {
    camelot: "11B / 11A",
    majorProgression: "A – E – F#m – D (I–V–vi–IV)",
    minorProgression: "F#m – D – A – E (vi–IV–I–V)",
    chords: [
      { label: "A", midiNotes: [57, 61, 64] },
      { label: "E", midiNotes: [52, 56, 59] },
      { label: "F#m", midiNotes: [54, 57, 61] },
      { label: "D", midiNotes: [62, 66, 69] },
    ],
  },
  "E Major / C# Minor": {
    camelot: "12B / 12A",
    majorProgression: "E – B – C#m – A (I–V–vi–IV)",
    minorProgression: "C#m – A – E – B (vi–IV–I–V)",
    chords: [
      { label: "E", midiNotes: [52, 56, 59] },
      { label: "B", midiNotes: [59, 63, 66] },
      { label: "C#m", midiNotes: [61, 64, 68] },
      { label: "A", midiNotes: [57, 61, 64] },
    ],
  },
  "F Major / D Minor": {
    camelot: "7B / 7A",
    majorProgression: "F – C – Dm – Bb (I–V–vi–IV)",
    minorProgression: "Dm – Bb – F – C (vi–IV–I–V)",
    chords: [
      { label: "F", midiNotes: [53, 57, 60] },
      { label: "C", midiNotes: [60, 64, 67] },
      { label: "Dm", midiNotes: [62, 65, 69] },
      { label: "Bb", midiNotes: [58, 62, 65] },
    ],
  },
  "Bb Major / G Minor": {
    camelot: "6B / 6A",
    majorProgression: "Bb – F – Gm – Eb (I–V–vi–IV)",
    minorProgression: "Gm – Eb – Bb – F (vi–IV–I–V)",
    chords: [
      { label: "Bb", midiNotes: [58, 62, 65] },
      { label: "F", midiNotes: [53, 57, 60] },
      { label: "Gm", midiNotes: [55, 58, 62] },
      { label: "Eb", midiNotes: [51, 55, 58] },
    ],
  },
  "Eb Major / C Minor": {
    camelot: "5B / 5A",
    majorProgression: "Eb – Bb – Cm – Ab (I–V–vi–IV)",
    minorProgression: "Cm – Ab – Eb – Bb (vi–IV–I–V)",
    chords: [
      { label: "Eb", midiNotes: [51, 55, 58] },
      { label: "Bb", midiNotes: [58, 62, 65] },
      { label: "Cm", midiNotes: [60, 63, 67] },
      { label: "Ab", midiNotes: [56, 60, 63] },
    ],
  },
  "Ab Major / F Minor": {
    camelot: "4B / 4A",
    majorProgression: "Ab – Eb – Fm – Db (I–V–vi–IV)",
    minorProgression: "Fm – Db – Ab – Eb (vi–IV–I–V)",
    chords: [
      { label: "Ab", midiNotes: [56, 60, 63] },
      { label: "Eb", midiNotes: [51, 55, 58] },
      { label: "Fm", midiNotes: [53, 56, 60] },
      { label: "Db", midiNotes: [61, 65, 68] },
    ],
  },
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

// 根据音符时长加权直方图自动推断最匹配调式
function detectBestScale(notes: RawNote[]): { scaleName: string; confidence: number } {
  if (!notes.length) return { scaleName: "C Major / A Minor", confidence: 0 };
  const weights = new Float64Array(12);
  let totalDur = 0;
  for (const n of notes) {
    if (n.durSec < 0.06) continue;
    const pc = ((n.midi % 12) + 12) % 12;
    weights[pc] += n.durSec;
    totalDur += n.durSec;
  }
  if (totalDur <= 0) return { scaleName: "C Major / A Minor", confidence: 0 };

  let bestName = "C Major / A Minor";
  let bestScore = -1;
  const firstPc = (((notes.find((n) => n.durSec >= 0.06)?.midi ?? notes[0].midi) % 12) + 12) % 12;
  for (const [name, pcs] of Object.entries(SCALES)) {
    if (!pcs || name.includes("Pentatonic")) continue;
    let inScale = 0;
    for (const pc of pcs) inScale += weights[pc];
    // 奖励主三和弦 (I: pcs[0], pcs[2], pcs[4])、关系小三和弦与首音命中
    const triadWeight = weights[pcs[0]] + weights[pcs[2]] * 0.8 + weights[pcs[4]] * 0.6 + weights[pcs[5]] * 0.5;
    const firstNoteBonus = pcs[0] === firstPc || pcs[5] === firstPc ? totalDur * 0.12 : 0;
    const score = (inScale + triadWeight * 0.15 + firstNoteBonus) / totalDur;
    if (score > bestScore) {
      bestScore = score;
      bestName = name;
    }
  }
  return { scaleName: bestName, confidence: Math.min(99, Math.round(Math.min(1, bestScore) * 98)) };
}

// 根据音符起始间隔 (IOI) 估算旋律 BPM
function estimateBpmFromNotes(notes: RawNote[]): number {
  const valid = notes.filter((n) => n.durSec >= 0.08);
  if (valid.length < 3) return 120;
  const iois: number[] = [];
  for (let i = 1; i < valid.length; i++) {
    const dt = valid[i].startSec - valid[i - 1].startSec;
    if (dt >= 0.18 && dt <= 1.2) iois.push(dt);
  }
  if (!iois.length) return 120;
  iois.sort((a, b) => a - b);
  const medianIoi = iois[Math.floor(iois.length / 2)];
  let bpm = Math.round(60 / medianIoi);
  while (bpm < 72) bpm *= 2;
  while (bpm > 175) bpm = Math.round(bpm / 2);
  return Math.max(60, Math.min(200, bpm));
}

// 解析标准 .MID / .MIDI 二进制文件（支持 Format 0 / 1）
function parseMidiFile(buf: ArrayBuffer): { notes: RawNote[]; bpm: number } {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  if (u8.length < 14 || String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== "MThd") {
    throw new Error("Invalid MIDI file header");
  }
  const numTracks = dv.getUint16(10, false);
  const division = dv.getUint16(12, false) || 480;
  let pos = 8 + dv.getUint32(4, false);
  let bpm = 120;
  let usPerBeat = 500_000;
  const outNotes: RawNote[] = [];

  for (let t = 0; t < numTracks && pos + 8 <= u8.length; t++) {
    const chunkId = String.fromCharCode(u8[pos], u8[pos + 1], u8[pos + 2], u8[pos + 3]);
    const chunkLen = dv.getUint32(pos + 4, false);
    pos += 8;
    const end = Math.min(u8.length, pos + chunkLen);
    if (chunkId !== "MTrk") {
      pos = end;
      continue;
    }

    let tick = 0;
    let runningStatus = 0;
    const active = new Map<number, { tick: number; vel: number }>();

    const readVlq = () => {
      let val = 0;
      while (pos < end) {
        const b = u8[pos++];
        val = (val << 7) | (b & 0x7f);
        if ((b & 0x80) === 0) break;
      }
      return val;
    };

    while (pos < end) {
      tick += readVlq();
      if (pos >= end) break;
      let status = u8[pos];
      if (status < 0x80) {
        status = runningStatus;
      } else {
        pos++;
        if (status < 0xf0) runningStatus = status;
      }

      const type = status & 0xf0;
      if (type === 0x90 || type === 0x80) {
        const note = u8[pos++];
        const vel = u8[pos++];
        if (type === 0x90 && vel > 0) {
          active.set(note, { tick, vel });
        } else {
          const st = active.get(note);
          if (st) {
            const startSec = (st.tick / division) * (usPerBeat / 1_000_000);
            const durSec = Math.max(0.03, ((tick - st.tick) / division) * (usPerBeat / 1_000_000));
            outNotes.push({
              midi: note,
              startSec,
              durSec,
              velocity: st.vel,
              rms: Math.max(0.04, st.vel / 420),
            });
            active.delete(note);
          }
        }
      } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
        pos += 2;
      } else if (type === 0xc0 || type === 0xd0) {
        pos += 1;
      } else if (status === 0xff) {
        const metaType = u8[pos++];
        const len = readVlq();
        if (metaType === 0x51 && len === 3 && pos + 3 <= end) {
          usPerBeat = (u8[pos] << 16) | (u8[pos + 1] << 8) | u8[pos + 2];
          bpm = Math.max(40, Math.min(240, Math.round(60_000_000 / usPerBeat)));
        }
        pos += len;
      } else if (status === 0xf0 || status === 0xf7) {
        const len = readVlq();
        pos += len;
      } else {
        break;
      }
    }
    pos = end;
  }

  outNotes.sort((a, b) => a.startSec - b.startSec || a.midi - b.midi);
  return { notes: outNotes, bpm };
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
    const clampedMidi = Math.max(12, Math.min(108, n.midi));
    evs.push({ tick: t0, bytes: [0x90, clampedMidi & 0x7f, n.velocity & 0x7f] });
    evs.push({ tick: t1, bytes: [0x80, clampedMidi & 0x7f, 0x00] });
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

type SynthTimbre = "keys" | "triangle" | "pluck" | "sub";

// 将清理后的 MIDI 音符渲染为 16-bit 单声道 WAV 文件，方便无 DAW 用户直接下载音频
function renderNotesToWav(notes: RawNote[], timbre: SynthTimbre, sr = 22050): Uint8Array {
  const maxEnd = notes.reduce((m, n) => Math.max(m, n.startSec + n.durSec), 1.0) + 0.25;
  const numSamples = Math.ceil(maxEnd * sr);
  const pcm = new Float32Array(numSamples);

  for (const n of notes) {
    const freq = 440 * Math.pow(2, (n.midi - 69) / 12);
    const i0 = Math.max(0, Math.floor(n.startSec * sr));
    const i1 = Math.min(numSamples, Math.ceil((n.startSec + n.durSec) * sr));
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / sr;
      const attack = Math.min(1, t / 0.01);
      const decay =
        timbre === "pluck"
          ? Math.exp(-t * 10)
          : Math.min(1, Math.max(0, (n.durSec - t) / 0.025));
      const env = 0.28 * attack * decay;
      let wave = Math.sin(2 * Math.PI * freq * t);
      if (timbre === "keys") {
        wave = 0.75 * wave + 0.2 * Math.sin(4 * Math.PI * freq * t) + 0.05 * Math.sin(6 * Math.PI * freq * t);
      } else if (timbre === "pluck") {
        wave = 0.6 * wave + 0.3 * Math.sin(4 * Math.PI * freq * t) + 0.15 * Math.sin(8 * Math.PI * freq * t);
      } else if (timbre === "triangle") {
        wave = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * freq * t));
      }
      pcm[i] += env * wave;
    }
  }

  const buf = new ArrayBuffer(44 + numSamples * 2);
  const v = new DataView(buf);
  const wStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  wStr(0, "RIFF");
  v.setUint32(4, 36 + numSamples * 2, true);
  wStr(8, "WAVE");
  wStr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  wStr(36, "data");
  v.setUint32(40, numSamples * 2, true);

  let p = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    v.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    p += 2;
  }
  return new Uint8Array(buf);
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
  const [sourceAudio, setSourceAudio] = useState<{ samples: Float32Array; sr: number } | null>(null);
  const [removedIdx, setRemovedIdx] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState("");
  const [minDurMs, setMinDurMs] = useState(80); // 默认滤掉 <80ms 碎杂音
  const [minRms, setMinRms] = useState(0.02);
  const [scale, setScale] = useState<string>("Chromatic (Off)");
  const [detectedKeyInfo, setDetectedKeyInfo] = useState<string>("");
  const [octaveShift, setOctaveShift] = useState<number>(0);
  const [bpm, setBpm] = useState(120);
  const [quantize, setQuantize] = useState<"off" | "16" | "8">("off");
  const [timbre, setTimbre] = useState<SynthTimbre>("keys");
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState<false | "midi" | "source" | "chords">(false);
  const [playheadSec, setPlayheadSec] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const mediaRec = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeAudioCtx = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  // 计算清理后的音符列表
  const cleanedNotes: (RawNote & { origIdx: number })[] = rawNotes
    .map((n, origIdx) => ({ ...n, origIdx }))
    .filter((n) => !removedIdx.has(n.origIdx))
    .filter((n) => n.durSec * 1000 >= minDurMs && n.rms >= minRms)
    .map((n) => {
      const shifted = Math.max(24, Math.min(108, n.midi + octaveShift * 12));
      const snappedMidi = snapToScale(shifted, SCALES[scale]);
      if (quantize === "off") return { ...n, midi: snappedMidi };
      const gridSec = (60 / bpm) * (quantize === "16" ? 0.25 : 0.5);
      const qStart = Math.round(n.startSec / gridSec) * gridSec;
      const qDur = Math.max(gridSec, Math.round(n.durSec / gridSec) * gridSec);
      return { ...n, midi: snappedMidi, startSec: qStart, durSec: qDur };
    });

  const strayRemovedCount = rawNotes.length - cleanedNotes.length;
  const bestKeyEst = rawNotes.length ? detectBestScale(rawNotes) : null;
  const pitchRangeText =
    cleanedNotes.length > 0
      ? `${midiToName(Math.min(...cleanedNotes.map((n) => n.midi)))} – ${midiToName(
          Math.max(...cleanedNotes.map((n) => n.midi))
        )}`
      : "—";

  async function stopPlayback() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (activeAudioCtx.current) {
      try {
        await activeAudioCtx.current.close();
      } catch {
        // ignore closed context
      }
      activeAudioCtx.current = null;
    }
    setPlaying(false);
    setPlayheadSec(null);
  }

  async function handleFile(file: File) {
    await stopPlayback();
    setFileName(file.name.replace(/\.[^.]+$/, ""));
    setRemovedIdx(new Set());
    setDetectedKeyInfo("");

    // 支持直接拖入 .mid / .midi 文件进行在线可视化播放与编辑
    if (/\.midi?$/i.test(file.name) || file.type.includes("midi")) {
      setBusy("Parsing MIDI file…");
      try {
        const parsed = parseMidiFile(await file.arrayBuffer());
        setSourceAudio(null);
        setRawNotes(parsed.notes);
        setBpm(parsed.bpm);
        setBusy("");
        trackToolEvent("midi_file_upload", { rawNotes: parsed.notes.length, bpm: parsed.bpm });
      } catch {
        setBusy("");
        alert("Could not parse .MID file. Please try another MIDI or audio file.");
      }
      return;
    }

    setBusy("Decoding & extracting melody notes…");
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
    setSourceAudio({ samples: mono, sr: ab.sampleRate });
    setRawNotes(notes);
    setBpm(estimateBpmFromNotes(notes));
    setBusy("");
    trackToolEvent("audio_upload", { rawNotes: notes.length });
  }

  async function loadDemo() {
    await stopPlayback();
    setBusy("Synthesizing demo melody…");
    setFileName("demo-vocal-melody");
    setRemovedIdx(new Set());
    setDetectedKeyInfo("");
    const { samples, sr } = createDemoSamples();
    const notes = extractRawNotes(samples, sr);
    setSourceAudio({ samples, sr });
    setRawNotes(notes);
    setBpm(estimateBpmFromNotes(notes));
    setBusy("");
    trackToolEvent("demo_melody_load", { rawNotes: notes.length });
  }

  function handleAutoDetectKey() {
    const { scaleName, confidence } = detectBestScale(rawNotes);
    setScale(scaleName);
    setDetectedKeyInfo(`Auto-locked: ${scaleName} (${confidence}% match)`);
    trackToolEvent("auto_detect_key", { scale: scaleName, confidence });
  }

  async function toggleMic() {
    if (recording && mediaRec.current) {
      mediaRec.current.stop();
      setRecording(false);
      trackToolEvent("mic_record_complete");
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
      trackToolEvent("mic_record_start");
    } catch {
      alert("Microphone permission denied or unavailable. Try 'Load Demo Melody' or upload an audio file.");
    }
  }

  // 绘制钢琴卷帘 (Piano Roll) + 实时播放头
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !rawNotes.length) return;
    const ctx = c.getContext("2d")!;
    const W = c.width;
    const H = c.height;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    const allMidi = cleanedNotes.length
      ? cleanedNotes.map((n) => n.midi)
      : rawNotes.map((n) => n.midi + octaveShift * 12);
    const minM = Math.max(24, Math.min(...allMidi) - 2);
    const maxM = Math.min(108, Math.max(...allMidi) + 2);
    const spanM = Math.max(8, maxM - minM + 1);
    const maxT = Math.max(2.5, ...rawNotes.map((n) => n.startSec + n.durSec));
    const padL = 46;
    const rowH = H / spanM;

    // 音高横线与左侧音名
    ctx.font = "11px ui-monospace, monospace";
    for (let m = minM; m <= maxM; m++) {
      const y = H - (m - minM + 1) * rowH;
      const isBlack = [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
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

    // 小节拍线网格
    const beatSec = 60 / bpm;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
    for (let t = 0; t <= maxT; t += beatSec) {
      const x = padL + (t / maxT) * (W - padL - 10);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // 先画被滤掉的碎杂音（半透明红色虚影，直观展示清理效果）
    for (let i = 0; i < rawNotes.length; i++) {
      if (cleanedNotes.some((cn) => cn.origIdx === i)) continue;
      const n = rawNotes[i];
      const m = Math.max(24, Math.min(108, n.midi + octaveShift * 12));
      const x = padL + (n.startSec / maxT) * (W - padL - 10);
      const w = Math.max(4, (n.durSec / maxT) * (W - padL - 10));
      const y = H - (m - minM + 1) * rowH + 2;
      ctx.fillStyle = "rgba(239, 68, 68, 0.28)";
      ctx.fillRect(x, y, w, Math.max(4, rowH - 4));
    }

    // 再画保留下来的有效音符
    for (const n of cleanedNotes) {
      const x = padL + (n.startSec / maxT) * (W - padL - 10);
      const w = Math.max(6, (n.durSec / maxT) * (W - padL - 10));
      const y = H - (n.midi - minM + 1) * rowH + 2;
      const isPlayingNow =
        playheadSec !== null && playheadSec >= n.startSec && playheadSec <= n.startSec + n.durSec;
      ctx.fillStyle = isPlayingNow ? "#38bdf8" : "#22c55e";
      ctx.fillRect(x, y, w, Math.max(6, rowH - 4));
      ctx.fillStyle = "#052e16";
      if (w > 24) ctx.fillText(midiToName(n.midi), x + 4, y + rowH * 0.72);
    }

    // 实时播放指针线
    if (playheadSec !== null) {
      const px = padL + (playheadSec / maxT) * (W - padL - 10);
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }, [rawNotes, cleanedNotes, octaveShift, bpm, playheadSec]);

  // 点击钢琴卷帘上的音符可手动删除
  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current;
    if (!c || !cleanedNotes.length) return;
    const r = c.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * c.width;
    const py = ((e.clientY - r.top) / r.height) * c.height;
    const allMidi = cleanedNotes.map((n) => n.midi);
    const minM = Math.max(24, Math.min(...allMidi) - 2);
    const maxM = Math.min(108, Math.max(...allMidi) + 2);
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

  // 用 WebAudio 合成器试听当前清理后的 MIDI 音符（带播放头动画与多音色）
  async function playPreview() {
    if (playing === "midi") {
      await stopPlayback();
      return;
    }
    await stopPlayback();
    if (!cleanedNotes.length) return;
    setPlaying("midi");
    trackToolEvent("play_midi_preview", { notes: cleanedNotes.length, timbre });
    const ctx = new AudioContext();
    activeAudioCtx.current = ctx;
    const t0 = ctx.currentTime + 0.04;
    let endSec = 0;

    for (const n of cleanedNotes) {
      const freq = 440 * Math.pow(2, (n.midi - 69) / 12);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (timbre === "keys") {
        osc.type = "triangle";
        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.value = freq * 2;
        const g2 = ctx.createGain();
        g2.gain.value = 0.18;
        osc2.connect(g2).connect(gain);
        osc2.start(t0 + n.startSec);
        osc2.stop(t0 + n.startSec + n.durSec + 0.04);
      } else if (timbre === "pluck") {
        osc.type = "sawtooth";
      } else if (timbre === "sub") {
        osc.type = "sine";
      } else {
        osc.type = "triangle";
      }

      osc.frequency.value = freq;
      const peakGain = timbre === "pluck" ? 0.16 : 0.24;
      const decayEnd = timbre === "pluck" ? Math.min(n.durSec, 0.22) : n.durSec;
      gain.gain.setValueAtTime(0.001, t0 + n.startSec);
      gain.gain.linearRampToValueAtTime(peakGain, t0 + n.startSec + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + n.startSec + decayEnd);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + n.startSec);
      osc.stop(t0 + n.startSec + n.durSec + 0.03);
      endSec = Math.max(endSec, n.startSec + n.durSec);
    }

    const tick = () => {
      if (!activeAudioCtx.current) return;
      const elapsed = activeAudioCtx.current.currentTime - t0;
      if (elapsed <= endSec + 0.05) {
        setPlayheadSec(Math.max(0, elapsed));
        rafRef.current = requestAnimationFrame(tick);
      } else {
        stopPlayback();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  // 播放原始音频用于 A/B 对比
  async function playOriginalAudio() {
    if (playing === "source") {
      await stopPlayback();
      return;
    }
    await stopPlayback();
    if (!sourceAudio) return;
    setPlaying("source");
    trackToolEvent("play_original_audio");
    const ctx = new AudioContext();
    activeAudioCtx.current = ctx;
    const buf = ctx.createBuffer(1, sourceAudio.samples.length, sourceAudio.sr);
    buf.getChannelData(0).set(sourceAudio.samples);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    const t0 = ctx.currentTime + 0.02;
    const dur = sourceAudio.samples.length / sourceAudio.sr;
    src.start(t0);

    const tick = () => {
      if (!activeAudioCtx.current) return;
      const elapsed = activeAudioCtx.current.currentTime - t0;
      if (elapsed <= dur) {
        setPlayheadSec(Math.max(0, elapsed));
        rafRef.current = requestAnimationFrame(tick);
      } else {
        stopPlayback();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
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
    trackToolEvent("download_midi", { notes: cleanedNotes.length, scale, bpm });
  }

  function downloadSynthWav() {
    const bytes = renderNotesToWav(cleanedNotes, timbre);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || "melody"}-${timbre}.wav`;
    a.click();
    URL.revokeObjectURL(url);
    trackToolEvent("download_synth_wav", { notes: cleanedNotes.length, timbre });
  }

  async function copyNoteNames() {
    const text = cleanedNotes.map((n) => midiToName(n.midi)).join(" ");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    trackToolEvent("copy_note_names", { notes: cleanedNotes.length });
  }

  // 一键试听与当前检测调式匹配的四小节流行和弦进行（I–V–vi–IV）
  async function playDetectedChordProgression() {
    if (playing === "chords") {
      await stopPlayback();
      return;
    }
    await stopPlayback();
    const keyName = bestKeyEst?.scaleName || "C Major / A Minor";
    const harmony = SCALE_HARMONY[keyName] || SCALE_HARMONY["C Major / A Minor"];
    setPlaying("chords");
    trackToolEvent("play_chord_progression", { scale: keyName, bpm });

    const ctx = new AudioContext();
    activeAudioCtx.current = ctx;
    const chordDur = Math.max(0.65, (60 / bpm) * 2);
    const t0 = ctx.currentTime + 0.04;

    harmony.chords.forEach((chord, idx) => {
      const start = t0 + idx * chordDur;
      for (const midi of chord.midiNotes) {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.11, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + chordDur - 0.02);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + chordDur);
      }
    });

    const totalDur = harmony.chords.length * chordDur;
    setTimeout(() => {
      if (activeAudioCtx.current === ctx) {
        stopPlayback();
      }
    }, totalDur * 1000 + 80);
  }

  // 导出检测调式的配套四和弦进行 .MID 文件（方便用户直接拖入 DAW 伴奏轨）
  function downloadChordProgressionMidi() {
    const keyName = bestKeyEst?.scaleName || "C Major / A Minor";
    const harmony = SCALE_HARMONY[keyName] || SCALE_HARMONY["C Major / A Minor"];
    const chordDur = Math.max(0.8, (60 / bpm) * 2);
    const chordNotes: RawNote[] = [];
    harmony.chords.forEach((chord, idx) => {
      const startSec = idx * chordDur;
      for (const midi of chord.midiNotes) {
        chordNotes.push({
          midi,
          startSec,
          durSec: chordDur * 0.92,
          velocity: 92,
          rms: 0.25,
        });
      }
    });
    const bytes = buildMidiFile(chordNotes, bpm);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName || "melody"}-chords-${keyName.split(" ")[0]}.mid`;
    a.click();
    URL.revokeObjectURL(url);
    trackToolEvent("download_chord_midi", { scale: keyName, bpm });
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {!rawNotes.length ? (
        <div className="flex flex-col gap-4">
          <label
            data-testid="audio-dropzone-label"
            className="relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 sm:p-10 text-center transition hover:border-indigo-600 active:scale-[0.99]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
          >
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm,.mid,.midi"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <span className="pointer-events-none text-4xl">🎹</span>
            <span className="pointer-events-none text-lg font-semibold">
              {busy ||
                (defaultMode === "voice"
                  ? "Drop a voice/hummed recording, MP3/WAV or .MID file"
                  : "Drop an MP3, WAV, M4A, FLAC, voice recording or .MID file here")}
            </span>
            <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs">
              📂 Tap or Click Here to Choose Audio / .MID File
            </span>
            <span className="pointer-events-none text-sm text-slate-500">
              100% private in-browser conversion · McLeod pitch tracker · Stray-note cleaner, Key/BPM detector &amp; Synth WAV export
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
          {/* 实时音乐特征检测概览栏（调式、BPM、音域、清洁音符数 + 推荐和弦进行与一键伴奏试听/导出） */}
          <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-emerald-50/60 p-4 shadow-xs">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div>
                <span className="text-slate-500">Detected Key / Scale</span>
                <div className="mt-0.5 text-sm font-bold text-indigo-950" data-testid="detected-key-badge">
                  {bestKeyEst ? `${bestKeyEst.scaleName} (${bestKeyEst.confidence}%)` : "—"}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Estimated Tempo &amp; Camelot</span>
                <div className="mt-0.5 text-sm font-bold text-indigo-950">
                  {bpm} BPM ·{" "}
                  <span className="text-indigo-600">
                    {(bestKeyEst && SCALE_HARMONY[bestKeyEst.scaleName]?.camelot) || "8B / 8A"}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-500">Note Pitch Range</span>
                <div className="mt-0.5 text-sm font-bold text-indigo-950">{pitchRangeText}</div>
              </div>
              <div>
                <span className="text-slate-500">Active Scale Lock</span>
                <div className="mt-0.5 text-sm font-bold text-emerald-700">{scale}</div>
              </div>
            </div>

            {bestKeyEst && SCALE_HARMONY[bestKeyEst.scaleName] && (
              <div
                data-testid="chord-progression-bar"
                className="flex flex-wrap items-center justify-between gap-2 border-t border-indigo-100 pt-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2 text-slate-700">
                  <span className="rounded bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-800">
                    🎼 Matching Chords
                  </span>
                  <span>
                    <b>Major:</b> {SCALE_HARMONY[bestKeyEst.scaleName].majorProgression}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>
                    <b>Minor:</b> {SCALE_HARMONY[bestKeyEst.scaleName].minorProgression}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-testid="play-chords-btn"
                    onClick={playDetectedChordProgression}
                    className="rounded-lg border border-indigo-300 bg-white px-2.5 py-1 font-semibold text-indigo-700 transition hover:bg-indigo-50"
                  >
                    {playing === "chords" ? "⏹ Stop Chords" : "🎹 Audition Backing Chords"}
                  </button>
                  <button
                    type="button"
                    data-testid="download-chords-midi-btn"
                    onClick={downloadChordProgressionMidi}
                    className="rounded-lg bg-indigo-600 px-2.5 py-1 font-semibold text-white transition hover:bg-indigo-700"
                  >
                    ⬇ Export Chords .MID
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 碎音清理、自动调式识别与量化控制栏 */}
          <div className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              <span>
                Min Note Length (Stray Filter): <b>{minDurMs} ms</b>
              </span>
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
              <span>
                Noise Gate (RMS): <b>{minRms.toFixed(3)}</b>
              </span>
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

            <div className="flex flex-col gap-1 text-xs font-medium text-slate-700">
              <div className="flex items-center justify-between">
                <span>Scale Lock (Snap Pitch)</span>
                <button
                  type="button"
                  onClick={handleAutoDetectKey}
                  className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-200"
                >
                  ✨ Auto-Detect Key
                </button>
              </div>
              <select
                aria-label="Scale Lock"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                value={scale}
                onChange={(e) => setScale(e.target.value)}
              >
                {Object.keys(SCALES).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {detectedKeyInfo && <span className="text-[11px] text-indigo-600">{detectedKeyInfo}</span>}
            </div>

            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-700">
                <span>Octave Shift</span>
                <select
                  aria-label="Octave Shift"
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                  value={octaveShift}
                  onChange={(e) => setOctaveShift(Number(e.target.value))}
                >
                  <option value={-2}>-2 Oct (Bass)</option>
                  <option value={-1}>-1 Oct</option>
                  <option value={0}>0 (Original)</option>
                  <option value={1}>+1 Oct (Lead)</option>
                  <option value={2}>+2 Oct</option>
                </select>
              </label>

              <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-700">
                <span>Preview Synth</span>
                <select
                  aria-label="Preview Synth"
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                  value={timbre}
                  onChange={(e) => setTimbre(e.target.value as SynthTimbre)}
                >
                  <option value="keys">Warm Keys</option>
                  <option value="triangle">Triangle Lead</option>
                  <option value="pluck">Pluck Synth</option>
                  <option value="sub">Sub Sine</option>
                </select>
              </label>
            </div>

            <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
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
                <span>Grid Snap (Quantize)</span>
                <select
                  aria-label="Grid Snap"
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                  value={quantize}
                  onChange={(e) => setQuantize(e.target.value as "off" | "16" | "8")}
                >
                  <option value="off">Off (Natural Timing)</option>
                  <option value="16">1/16 note grid</option>
                  <option value="8">1/8 note grid</option>
                </select>
              </label>
            </div>
          </div>

          {/* 统计与操作按钮 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600" data-testid="note-stats">
              Clean notes: <b className="text-emerald-700">{cleanedNotes.length}</b> · Stray notes filtered:{" "}
              <b className="text-rose-600">{strayRemovedCount}</b>{" "}
              {removedIdx.size > 0 && (
                <button
                  type="button"
                  onClick={() => setRemovedIdx(new Set())}
                  className="ml-2 text-xs font-medium text-indigo-600 underline hover:text-indigo-800"
                >
                  Undo {removedIdx.size} manual delete{removedIdx.size > 1 ? "s" : ""}
                </button>
              )}
              <span className="ml-1 text-xs text-slate-400">(click any green note to delete it)</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await stopPlayback();
                  setRawNotes([]);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
              >
                New File
              </button>
              {sourceAudio && (
                <button
                  type="button"
                  onClick={playOriginalAudio}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {playing === "source" ? "⏹ Stop Original" : "🎧 Play Original"}
                </button>
              )}
              <button
                type="button"
                onClick={playPreview}
                disabled={!cleanedNotes.length}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {playing === "midi" ? "⏹ Stop Preview" : "▶ Play MIDI Preview"}
              </button>
              <button
                type="button"
                onClick={copyNoteNames}
                disabled={!cleanedNotes.length}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {copied ? "✓ Copied Notes" : "📋 Copy Notes"}
              </button>
              <button
                type="button"
                onClick={downloadSynthWav}
                disabled={!cleanedNotes.length}
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                ⬇ Synth .WAV
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
                className="cursor-pointer rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-mono text-emerald-800 hover:bg-rose-50 hover:text-rose-700"
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
