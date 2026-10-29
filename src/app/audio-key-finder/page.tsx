import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "Audio Key & BPM Finder Online Free – Detect Song Scale & Melody Notes",
  description:
    "Find the musical key, scale (Major/Minor), tempo (BPM) and note range of any vocal recording, sample, MP3 or WAV file in your browser — 100% free and private.",
  alternates: { canonical: "/audio-key-finder" },
};

export default function AudioKeyFinderPage() {
  return (
    <Landing
      path="/audio-key-finder"
      tool="midi-audio"
      autoLoadDemo
      h1="Audio Key & BPM Finder — Detect Scale, Tempo & Melody Notes"
      lede="Upload a vocal memo, sample loop, MP3 or WAV stem to instantly detect its musical key (Major / Relative Minor), estimated BPM tempo, pitch range and exact note sequence — all processed locally in your browser."
      steps={[
        "Drop an MP3, WAV, M4A or FLAC loop into the box above, or record a hummed melody with your microphone.",
        "Read the top summary bar for the Detected Key / Scale confidence score, Estimated Tempo (BPM) and Note Pitch Range.",
        "Click Auto-Detect Key to lock all extracted melody notes to the detected scale and copy the note names (e.g. C4 E4 G4) or download the .MID file.",
      ]}
      faqs={[
        [
          "How does the Audio Key Finder detect the musical scale?",
          "It extracts fundamental pitches across your audio using McLeod first-peak autocorrelation, builds a duration-weighted 12-pitch-class profile, and scores tonic triad and scale coverage across all Major and Minor keys.",
        ],
        [
          "Can I also see the exact notes played in my sample?",
          "Yes. Every detected note is displayed on the interactive Piano Roll and listed with its pitch name (e.g. C4, E4, G4) and duration in milliseconds. You can copy the note list with one click.",
        ],
        [
          "Are my unreleased loops or vocal recordings uploaded anywhere?",
          "Never. Key detection, BPM estimation and MIDI extraction run 100% inside your browser via WebAudio.",
        ],
      ]}
    />
  );
}
