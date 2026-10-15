import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "MIDI Player Online Free – Play, View & Edit .MID Files on Piano Roll",
  description:
    "Play .MID and .MIDI files online in your browser with a live Piano Roll visualizer. Audition with 4 synth sounds, shift octaves, delete stray notes or export to WAV.",
  alternates: { canonical: "/midi-player-online" },
};

export default function MidiPlayerOnlinePage() {
  return (
    <Landing
      path="/midi-player-online"
      tool="midi-audio"
      h1="MIDI Player Online — Piano Roll Visualizer & Synth Preview"
      lede="Drop any .MID or .MIDI file (or an MP3/WAV melody) to view notes on an interactive Piano Roll, play back with Warm Keys, Pluck or Lead synths, transpose octaves, remove unwanted notes and export as .MID or 16-bit .WAV."
      steps={[
        "Drag and drop a .MID / .MIDI file (or click Load Demo Melody) into the browser player above.",
        "Choose a synth timbre (Warm Keys, Triangle Lead, Pluck Synth or Sub Sine) and click Play MIDI Preview.",
        "Optional: shift octaves (-2 to +2), lock to a musical scale, or click any green note on the piano roll to delete it.",
        "Click Synth .WAV to render an audio file, or Download .MID to save your edited MIDI sequence.",
      ]}
      faqs={[
        [
          "Can I play .MID files in my browser without installing a DAW?",
          "Yes. Our built-in SMF MIDI parser reads standard Type-0 and Type-1 .MID files directly in your browser and synthesizes playback using WebAudio.",
        ],
        [
          "Can I convert a MIDI file to WAV audio here?",
          "Yes! After dropping your .MID file, select your preferred synth sound (such as Warm Keys or Pluck Synth) and click the 'Synth .WAV' button to download a 16-bit WAV audio file immediately.",
        ],
        [
          "Can I edit or transpose notes inside the online MIDI player?",
          "Yes. You can shift the entire melody up or down by 1–2 octaves, snap notes to 12 musical scales, or click individual notes on the piano roll to delete them before re-downloading.",
        ],
      ]}
    />
  );
}
