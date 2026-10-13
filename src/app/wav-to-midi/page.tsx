import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "WAV to MIDI Converter Online Free – For DAW Stems & Samples",
  description:
    "Convert uncompressed WAV melody stems and audio loops into clean MIDI (.mid) files. Built-in stray-note filter, scale quantize and piano roll editor.",
  alternates: { canonical: "/wav-to-midi" },
};

export default function Page() {
  return (
    <Landing
      path="/wav-to-midi"
      tool="midi-audio"
      h1="WAV to MIDI Converter for Producers"
      lede="Turn uncompressed WAV stems, synth leads, basslines and vocal takes into clean .MID files without uploading your unreleased tracks to a cloud server."
      steps={[
        "Drop your 16-bit, 24-bit or 32-bit WAV file into the converter above.",
        "Slide Min Note Length and Noise Gate to strip room noise and transient glitches.",
        "Set your project BPM and optional Scale Lock.",
        "Preview on the piano roll and download your .MID file.",
      ]}
      faqs={[
        [
          "Does it support 24-bit and 48 kHz WAV files from my DAW?",
          "Yes. Any sample rate and bit depth supported by your browser's WebAudio decoder works seamlessly.",
        ],
        [
          "Can I match the exported MIDI tempo to my DAW project?",
          "Yes. Enter your exact project BPM before downloading so the MIDI tempo header matches your session.",
        ],
      ]}
    />
  );
}
