import type { Metadata } from "next";
import Link from "next/link";
import { Fredoka, Geist, Geist_Mono } from "next/font/google";
import { PokeballIcon } from "@/components/PokeballIcon";
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
      <body className="flex h-dvh flex-col overflow-hidden">
        <header className="shrink-0 border-b border-zinc-200/70 bg-white/70 backdrop-blur-sm dark:border-zinc-800/70 dark:bg-zinc-950/70">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-6 py-3">
            <Link href="/" className="flex items-center gap-2">
              <PokeballIcon className="h-6 w-6" />
              <span
                style={{ fontFamily: "var(--font-fredoka)" }}
                className="text-sm font-semibold tracking-tight"
              >
                PokéGuess
              </span>
            </Link>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
