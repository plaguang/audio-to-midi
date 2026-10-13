import type { Metadata } from "next";
import Landing from "@/components/Landing";

export const metadata: Metadata = {
  title: "Hum to MIDI Online – Turn Humming Into Clean MIDI Notes Free",
  description:
    "Hum a melody into your microphone and convert it to a clean DAW-ready MIDI file in seconds. Scale quantization, stray-note filter and browser piano roll.",
  alternates: { canonical: "/hum-to-midi" },
};

export default function Page() {
  return (
    <Landing
      path="/hum-to-midi"
      tool="midi-voice"
      h1="Hum to MIDI — Turn Humming Into DAW Notes"
      lede="Stop clicking notes one by one in your piano roll. Hum any melody into your mic, snap it to scale and download a clean .MID file in seconds."
      steps={[
        "Click Record Voice / Hum Melody and hum your melody line.",
        "Adjust Min Note Length to remove short breath blips between notes.",
        "Select a Scale Lock and optional 1/16 or 1/8 Grid Snap.",
        "Preview on the piano roll and download your .MID file.",
      ]}
      faqs={[
        [
          "Do I need music theory or a MIDI keyboard to write melodies?",
          "No. Hum the melody that is in your head, lock the scale to C Major / A Minor, and drag the exported .MID file onto any synth or piano track in your DAW.",
        ],
        [
          "Can I delete a wrong note before downloading?",
          "Yes — click any green bar on the piano roll (or its note pill below) to delete it immediately.",
        ],
      ]}
    />
  );
}
