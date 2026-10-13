import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://audio-to-midi-six.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Audio to MIDI Converter Online Free – Clean Melody Notes, No Stray Mess",
  description:
    "Convert audio, MP3, WAV, voice or hummed melodies to clean MIDI (.mid) online for free. Built-in stray-note filter, scale lock and piano roll preview — 100% in your browser.",
  alternates: { canonical: "/" },
  verification: {
    google: "OzbbXwBKIAGRAIV-NCTTfkOO6b3YAXZjqWxCrmygypM",
  },
  openGraph: {
    title: "Audio to MIDI Converter Online Free – With Stray-Note Cleaner",
    description: "Turn voice, humming, MP3 or WAV melodies into clean DAW-ready MIDI files in your browser.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
