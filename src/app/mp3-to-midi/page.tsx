import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "MP3 to MIDI Converter Online Free – Clean Piano Roll Notes, No Upload",
  description:
    "Convert MP3 melodies and instrument stems to clean MIDI (.mid) files in your browser. Filter out stray notes, lock to scale and preview on the piano roll.",
  alternates: { canonical: "/mp3-to-midi" },
};

export default function Page() {
  return (
    <Landing
      path="/mp3-to-midi"
      tool="midi-audio"
      h1="MP3 to MIDI Converter — Free & In-Browser"
      lede="Drop any melodic MP3 stem or sample, filter out micro-note clutter with one slider, preview on the interactive piano roll and download a standard .MID file."
      steps={[
        "Drop your .mp3 file into the converter box above.",
        "Use the Min Note Length slider to clean up short stray notes.",
        "Optional: lock notes to a musical scale and snap timing to 1/16 or 1/8 notes.",
        "Audition with Play MIDI Preview and click Download .MID.",
      ]}
      faqs={[
        [
          "Why does converting a full mastered MP3 song to MIDI usually sound messy?",
          "A full mix contains drums, vocals, bass and chords playing at the same time. For the cleanest MP3-to-MIDI conversion, use an isolated melody stem, vocal acapella, lead synth or single-instrument loop.",
        ],
        [
          "Is there any file size limit or sign-up?",
          "No sign-up, no watermark, and no server upload — everything runs locally in your browser.",
        ],
      ]}
    />
  );
}
