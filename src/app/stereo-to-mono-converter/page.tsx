import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "Stereo to Mono Converter Online Free – L+R Sum, Left-Only & Phase Check",
  description:
    "Convert stereo WAV, MP3, FLAC or OGG samples to true 1-channel mono WAV online. Includes phase correlation meter and Left-only / Right-only / Side modes for producers.",
  alternates: { canonical: "/stereo-to-mono-converter" },
};

export default function Page() {
  return (
    <Landing
      path="/stereo-to-mono-converter"
      tool="stereo-mono"
      h1="Stereo to Mono Converter — With Phase Check"
      lede="Convert stereo samples and recordings to true 1-channel Mono WAV. Check phase correlation first so summing L+R never makes your drums or synth samples sound hollow."
      steps={[
        "Drop your stereo WAV, MP3, FLAC or OGG file into the converter above.",
        "Check the automatic Phase Correlation reading (+1.00 = perfectly in phase, negative = phase cancellation).",
        "Pick Average (L+R)/2, Left Channel Only, Right Channel Only, or Side (L−R).",
        "Click Download 16-bit Mono WAV.",
      ]}
      faqs={[
        [
          "Why does summing stereo to mono sometimes make a sample sound thin or hollow?",
          "If a stereo sample has Haas widening or stereo chorus, the left and right channels are partially out of phase. Summing (L+R)/2 cancels out frequencies. In that case, choose Left Channel Only or Right Channel Only.",
        ],
        [
          "Does this output a real 1-channel mono file for hardware samplers like MPC?",
          "Yes. The downloaded WAV header is written with 1 channel (numChannels = 1), cutting file size in half.",
        ],
      ]}
    />
  );
}
