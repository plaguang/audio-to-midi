import MidiConverter from "@/components/MidiConverter";
import StereoMonoConverter from "@/components/StereoMonoConverter";
import Link from "next/link";

export type AudioLandingProps = {
  h1: string;
  lede: string;
  tool: "midi-audio" | "midi-voice" | "stereo-mono";
  steps: string[];
  faqs: [string, string][];
  path: string;
};

const NAV_LINKS = [
  { href: "/", label: "Audio to MIDI" },
  { href: "/voice-to-midi", label: "Voice to MIDI" },
  { href: "/hum-to-midi", label: "Hum to MIDI" },
  { href: "/mp3-to-midi", label: "MP3 to MIDI" },
  { href: "/wav-to-midi", label: "WAV to MIDI" },
  { href: "/stereo-to-mono-converter", label: "Stereo to Mono Converter" },
];

export default function Landing({ h1, lede, tool, steps, faqs, path }: AudioLandingProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: h1,
        url: path,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "HowTo",
        name: h1,
        step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })),
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map(([q, a]) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="text-center">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800">
          <span>🎵 Free Producer Utility · 100% In-Browser · No Stray-Note Mess</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{h1}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{lede}</p>
      </header>

      {tool === "stereo-mono" ? (
        <StereoMonoConverter />
      ) : (
        <MidiConverter defaultMode={tool === "midi-voice" ? "voice" : "audio"} />
      )}

      <section className="grid gap-5 sm:grid-cols-3">
        {[
          [
            "🧹 Stray-Note Filter",
            "Most audio-to-MIDI converters dump hundreds of tiny glitch notes into your piano roll. Slide Min Note Length to strip micro-artifacts instantly.",
          ],
          [
            "🎼 Musical Scale Lock",
            "Hummed slightly flat? Lock the output to C Major, A Minor, Pentatonic or any key before downloading your .mid file.",
          ],
          [
            "🔒 100% Local WebAudio",
            "Your vocal memos, unreleased stems and samples never leave your device. Instant conversion with zero upload wait.",
          ],
        ].map(([title, desc]) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{desc}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-6 text-slate-700">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        <div className="mt-4 divide-y rounded-xl border border-slate-200 bg-white shadow-sm">
          {faqs.map(([q, a]) => (
            <details key={q} className="p-4">
              <summary className="cursor-pointer font-medium">{q}</summary>
              <p className="mt-2 text-sm text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <nav aria-label="Related audio tools" className="flex flex-wrap justify-center gap-4 border-t pt-6 text-sm text-slate-600">
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="underline hover:text-indigo-600">
            {l.label}
          </Link>
        ))}
      </nav>

      <footer className="text-center text-xs text-slate-400">
        © 2026 CleanMIDI · Free In-Browser Audio to MIDI &amp; Sample Utilities. All audio is processed locally on your device.
      </footer>
    </main>
  );
}
