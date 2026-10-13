import Landing from "@/components/Landing";

export default function HomePage() {
  return (
    <Landing
      path="/"
      tool="midi-audio"
      h1="Audio to MIDI Converter — Clean Melody Notes"
      lede="Convert melodic audio, vocal lines, guitar/piano stems or hummed ideas into clean .MID files. Filter out stray glitch notes, snap to key, preview on the piano roll and drop straight into Ableton, FL Studio or Logic."
      steps={[
        "Drop an MP3, WAV, M4A or FLAC file into the box above, or click Record Voice / Hum Melody.",
        "Adjust the Min Note Length slider (default 80 ms) to strip short stray glitch notes automatically.",
        "Optional: choose a Musical Scale (such as C Major / A Minor) and Grid Snap (1/16 or 1/8) to tighten timing and pitch.",
        "Click Play MIDI Preview to audition, click any unwanted note on the piano roll to remove it, then click Download .MID.",
      ]}
      faqs={[
        [
          "Why do most audio to MIDI tools produce so many stray notes?",
          "Raw pitch trackers trigger on breath noise, room reverb, string squeaks and harmonics, creating dozens of 10–40 ms micro-notes. Our converter highlights filtered micro-notes in red and removes anything shorter than your Min Note Length threshold.",
        ],
        [
          "Does this work best on melodies or full mixed songs?",
          "It is optimized for monophonic and lead melodic parts — vocal melodies, humming, flute, violin, synth leads, basslines and single-note piano or guitar lines.",
        ],
        [
          "Are my audio files or vocal recordings uploaded to a server?",
          "No. Decoding, autocorrelation pitch tracking and MIDI file generation run 100% locally in your browser using WebAudio.",
        ],
        [
          "Which DAWs can open the exported .MID file?",
          "Every major DAW supports standard SMF Type-0 MIDI files, including FL Studio, Ableton Live, Logic Pro, GarageBand, Reaper, Cubase, Studio One and Pro Tools.",
        ],
      ]}
    />
  );
}
