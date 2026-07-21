import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { Fredoka, Geist, Geist_Mono } from "next/font/google";
import { SiteChrome } from "@/components/SiteFooter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-fredoka",
});

export const metadata: Metadata = {
  title: "PokéGuess",
  description: "Guess your opponent's Pokémon",
  icons: {
    icon: [{ url: "/PokeGuess Favicon.png", type: "image/png" }],
    apple: [{ url: "/PokeGuess Favicon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="h-dvh overflow-y-auto">
        <div className="flex h-full flex-col">
          <header className="shrink-0 border-b border-zinc-200/70 bg-white/70 backdrop-blur-sm dark:border-zinc-800/70 dark:bg-zinc-950/70">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-3">
              <Link href="/" className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/PokeGuess Favicon.png"
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="h-6 w-6"
                />
                <span
                  style={{ fontFamily: "var(--font-fredoka)" }}
                  className="text-[16px] font-semibold tracking-tight"
                >
                  PokéGuess
                </span>
              </Link>
            </div>
          </header>
          <SiteChrome>{children}</SiteChrome>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
