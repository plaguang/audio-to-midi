import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://audio-to-midi-six.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "/",
    "/voice-to-midi",
    "/hum-to-midi",
    "/mp3-to-midi",
    "/wav-to-midi",
    "/midi-player-online",
    "/audio-key-finder",
    "/stereo-to-mono-converter",
  ].map((p, i) => ({
    url: `${SITE}${p}`,
    changeFrequency: "monthly" as const,
    priority: i === 0 ? 1 : 0.85,
  }));
}
