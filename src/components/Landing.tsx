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

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://audio-to-midi-six.vercel.app";

const NAV_LINKS = [
  { href: "/", label: "Audio to MIDI" },
  { href: "/voice-to-midi", label: "Voice to MIDI" },
  { href: "/hum-to-midi", label: "Hum to MIDI" },
  { href: "/mp3-to-midi", label: "MP3 to MIDI" },
  { href: "/wav-to-midi", label: "WAV to MIDI" },
  { href: "/midi-player-online", label: "MIDI Player" },
  { href: "/audio-key-finder", label: "Key & BPM Finder" },
  { href: "/stereo-to-mono-converter", label: "Stereo to Mono" },
];

export default function Landing({ h1, lede, tool, steps, faqs, path }: AudioLandingProps) {
  const fullUrl = `${SITE}${path === "/" ? "" : path}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: h1,
        url: fullUrl,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Any (Web Browser)",
        browserRequirements: "Requires WebAudio API support",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList:
          tool === "stereo-mono"
            ? [
                "Stereo to Mono WAV conversion",
                "Pearson Phase Correlation meter",
                "4 downmix modes: (L+R)/2, Left-only, Right-only, Side (L-R)/2",
                "3-lane L/R/Mono waveform visualizer and A/B audio audition",
              ]
            : [
                "McLeod first-peak autocorrelation pitch detection",
                "Min Note Length stray-note glitch filter",
                "Automatic musical key and scale detection",
                "Interactive piano roll with click-to-delete and synth preview",
                "Standard SMF Type-0 .MID file export",
              ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "CleanMIDI", item: SITE },
          ...(path !== "/"
            ? [{ "@type": "ListItem", position: 2, name: h1, item: fullUrl }]
            : []),
        ],
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

  const featureCards =
    tool === "stereo-mono"
      ? [
          [
            "📐 Phase Correlation Meter",
            "Blindly summing Left + Right cancels out wide synths and chorused guitars. Our Pearson correlation meter warns you before your mono bounce turns hollow.",
          ],
          [
            "🎛️ 4 Downmix Modes + Normalize",
            "Switch between (L+R)/2 average, Left-only (zero phase comb-filtering), Right-only, or Side (L−R) difference with optional -1.0 dBFS peak normalization.",
          ],
          [
            "📊 3-Lane Waveform & A/B Listen",
            "Inspect Left, Right and Mono peak dBFS waveforms side by side and audition Original Stereo vs Mono output right in your browser.",
          ],
        ]
      : [
          [
            "🧹 Stray-Note Glitch Filter",
            "Most audio-to-MIDI converters dump dozens of 20 ms breath and harmonic glitches into your piano roll. Slide Min Note Length to strip micro-artifacts instantly.",
          ],
          [
            "🎼 Auto Key Detect & Scale Lock",
            "Not sure what key you hummed in? Click Auto-Detect Key to analyze your melody and snap slightly flat or sharp notes into C Major, A Minor or 11 other scales.",
          ],
          [
            "🎹 A/B Audio + Multi-Synth Preview",
            "Compare your original vocal or instrument recording against Warm Keys, Triangle Lead, Pluck Synth or Sub Bass before exporting a clean DAW-ready .MID file.",
          ],
        ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部全局导航栏：提升用户体验与全站内链权重 */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">
              ♪
            </span>
            <span>CleanMIDI</span>
          </Link>
          <nav aria-label="Primary tools" className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm">
            {NAV_LINKS.map((l) => {
              const active = l.href === path;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <div className="text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800">
            <span>🎵 Free Producer Utility · 100% In-Browser · Zero Server Upload</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{h1}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{lede}</p>
        </div>

        {tool === "stereo-mono" ? (
          <StereoMonoConverter />
        ) : (
          <MidiConverter defaultMode={tool === "midi-voice" ? "voice" : "audio"} />
        )}

        <section className="grid gap-5 sm:grid-cols-3">
          {featureCards.map(([title, desc]) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">How it works</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-slate-700">
            {steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>

        {tool !== "stereo-mono" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Why Producers Use CleanMIDI Instead of Raw Pitch Trackers</h2>
            <p className="mt-2 text-sm text-slate-600">
              Standard online MP3-to-MIDI converters trigger on overtones and breath noise, producing hundreds of tiny
              stray notes that take longer to clean up than drawing notes by hand.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 pr-4 font-semibold">Feature</th>
                    <th className="py-2.5 px-4 font-semibold text-indigo-700">CleanMIDI (This Tool)</th>
                    <th className="py-2.5 px-4 font-semibold">Typical Online Converters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Stray Micro-Note Filter (Min ms)</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-semibold">✓ Real-time slider (20–250 ms)</td>
                    <td className="py-2.5 px-4 text-slate-500">✗ Dumps raw 10 ms glitch notes</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Octave Jump Prevention</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-semibold">✓ McLeod first-peak fundamental lock</td>
                    <td className="py-2.5 px-4 text-slate-500">✗ Subharmonic octave glitches</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Auto Key Detection &amp; Scale Snap</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-semibold">✓ 1-click key finder + 12 scales</td>
                    <td className="py-2.5 px-4 text-slate-500">✗ Chromatic only</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Interactive Piano Roll Editing</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-semibold">✓ Click any note to delete + Undo</td>
                    <td className="py-2.5 px-4 text-slate-500">✗ Blind download only</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium">Privacy &amp; Speed</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-semibold">✓ 100% local WebAudio (0 upload wait)</td>
                    <td className="py-2.5 px-4 text-slate-500">✗ Uploads audio to remote server queue</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          <div className="mt-4 divide-y rounded-xl border border-slate-200 bg-white shadow-sm">
            {faqs.map(([q, a]) => (
              <details key={q} className="p-4" open>
                <summary className="cursor-pointer font-semibold text-slate-900">{q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <nav
          aria-label="Related audio tools"
          className="flex flex-wrap justify-center gap-4 border-t border-slate-200 pt-6 text-sm text-slate-600"
        >
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="underline hover:text-indigo-600">
              {l.label}
            </Link>
          ))}
        </nav>

        <footer className="text-center text-xs text-slate-400">
          © 2026 CleanMIDI · Free In-Browser Audio to MIDI &amp; Sample Utilities. All audio is processed locally on
          your device.
        </footer>
      </main>
    </div>
  );
}
