"use client";

import { useState } from "react";
import { DoubleUnderline } from "@/components/DoubleUnderline";

interface RoomCodeRevealProps {
  roomCode: string;
  className?: string;
  showHint?: boolean;
  /** When set, clicking the code copies this value (e.g. the room invite URL). */
  copyText?: string;
}

export function RoomCodeReveal({
  roomCode,
  className = "text-3xl font-bold tracking-[0.3em] text-red-600 dark:text-red-500",
  showHint = false,
  copyText,
}: RoomCodeRevealProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; fail silently.
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      {copyText ? (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Room code ${roomCode}. Click to copy invite link.`}
          title="Copy invite link"
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
        >
          <DoubleUnderline className={className}>
            <span
              className={`inline-block transition-[filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                copied
                  ? "blur-none"
                  : "blur-[6px] group-hover/underline:blur-none"
              }`}
            >
              {copied ? "Copied!" : roomCode}
            </span>
          </DoubleUnderline>
        </button>
      ) : (
        <DoubleUnderline
          aria-label={`Room code ${roomCode}. Hover to reveal.`}
          className={className}
        >
          <span className="inline-block blur-[6px] transition-[filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/underline:blur-none">
            {roomCode}
          </span>
        </DoubleUnderline>
      )}
      {showHint && (
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Hover to reveal</p>
      )}
    </div>
  );
}
