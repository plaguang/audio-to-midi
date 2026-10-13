import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "Voice to MIDI Online Free – Sing or Hum Into Your Mic & Export .MID",
  description:
    "Record your voice or upload a vocal melody and convert it to clean MIDI notes online. Built-in scale lock, stray-note filter and instant piano roll preview.",
  alternates: { canonical: "/voice-to-midi" },
};

export default function Page() {
  return (
    <Landing
      path="/voice-to-midi"
      tool="midi-voice"
      h1="Voice to MIDI Converter — Sing or Hum to Piano Roll"
      lede="Capture melodies in your head before they disappear. Record your voice in the browser or drop a phone voice memo, lock to your song's key, strip breath artifacts and export a clean .MID file."
      steps={[
        "Click Record Voice / Hum Melody (or upload a voice memo from your phone).",
        "Sing or hum a single-note melody clearly, then click Stop Recording.",
        "Enable Scale Lock (e.g. C Major / A Minor) so slightly flat or sharp vocal pitch snaps to the right note.",
        "Use the Min Note Length slider to remove breath clicks, then click Download .MID.",
      ]}
      faqs={[
        [
          "How do I get the cleanest voice-to-MIDI results?",
          "Hum with a steady 'doo' or 'la' syllable rather than lyrics with heavy consonants (like 's' and 't'). Then set Min Note Length around 80–120 ms to ignore consonantal transients.",
        ],
        [
          "What if my singing is slightly out of tune?",
          "Turn on Scale Lock and pick your track's key. Every detected note is automatically quantized to the nearest valid scale degree.",
        ],
        [
          "Can I convert iPhone Voice Memos (.m4a) to MIDI?",
          "Yes. Drop your .m4a, .mp3 or .wav voice memo straight into the uploader.",
        ],
      ]}
    />
  );
}
