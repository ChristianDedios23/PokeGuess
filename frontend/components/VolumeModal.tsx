"use client";

import { Fragment, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineBell,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCursorArrowRays,
  HiOutlineMusicalNote,
} from "react-icons/hi2";
import type { IconType } from "react-icons";
import {
  MAX_VOLUME_TIER,
  MIN_VOLUME_TIER,
  getVolumeTier,
  playButtonClickSound,
  playChatMessageSound,
  playTurnPingSound,
  setVolumeTier,
  type SoundCategory,
} from "@/lib/sounds";
import { refreshMusicVolume } from "@/lib/music";

interface VolumeModalProps {
  open: boolean;
  onClose: () => void;
}

interface CategoryConfig {
  category: SoundCategory;
  label: string;
  description: string;
  Icon: IconType;
  preview: () => void;
}

const CATEGORIES: CategoryConfig[] = [
  {
    category: "music",
    label: "Music",
    description: "Background music.",
    Icon: HiOutlineMusicalNote,
    // Not a one-shot: apply the new level to the live playlist immediately.
    preview: refreshMusicVolume,
  },
  {
    category: "turn",
    label: "Turn ping",
    description: "Plays when it becomes your turn.",
    Icon: HiOutlineBell,
    preview: playTurnPingSound,
  },
  {
    category: "button",
    label: "Buttons",
    description: "Clicks on menu and game buttons.",
    Icon: HiOutlineCursorArrowRays,
    preview: playButtonClickSound,
  },
  {
    category: "chat",
    label: "Chat ping",
    description: "Plays when a message arrives.",
    Icon: HiOutlineChatBubbleLeftRight,
    preview: playChatMessageSound,
  },
];

const TIERS = Array.from(
  { length: MAX_VOLUME_TIER - MIN_VOLUME_TIER + 1 },
  (_, index) => MIN_VOLUME_TIER + index,
);

export function VolumeModal({ open, onClose }: VolumeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const [tiers, setTiers] = useState<Record<SoundCategory, number>>({
    music: MAX_VOLUME_TIER,
    turn: MAX_VOLUME_TIER,
    button: MAX_VOLUME_TIER,
    chat: MAX_VOLUME_TIER,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setVisible(false);
      setTiers({
        music: getVolumeTier("music"),
        turn: getVolumeTier("turn"),
        button: getVolumeTier("button"),
        chat: getVolumeTier("chat"),
      });

      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
      };
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setRendered(false), 180);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!rendered) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rendered, onClose]);

  if (!mounted || !rendered) return null;

  function handleSetTier(config: CategoryConfig, tier: number) {
    setVolumeTier(config.category, tier);
    setTiers((current) => ({ ...current, [config.category]: tier }));
    // Preview at the new level (tier 1 is silent, so nothing plays).
    config.preview();
  }

  // Portal onto document.body so the scrim covers the full viewport, matching
  // the themes picker (the board sits under CSS transforms otherwise).
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="volume-title"
      className={`p-4 ${visible ? "" : "pointer-events-none"}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <button
        type="button"
        aria-label="Close volume settings"
        onClick={onClose}
        className="modal-scrim absolute inset-0 bg-black/55 outline-none ring-0 transition-[box-shadow] active:transform-none active:ring-1 active:ring-inset active:ring-white/25 focus-visible:outline-none"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 180ms ease-out",
        }}
      />

      <div
        className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-500 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(4px) scale(0.99)",
          transition: "opacity 180ms ease-out, transform 180ms ease-out",
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <h2 id="volume-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Volume
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-5 p-5">
          {CATEGORIES.map((config) => {
            const { category, label, description, Icon } = config;
            const activeTier = tiers[category];
            return (
              <div key={category} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{label}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
                  </div>
                </div>

                <div
                  role="group"
                  aria-label={`${label} volume`}
                  className="flex items-center px-1"
                >
                  {TIERS.map((tier, index) => {
                    const filled = tier <= activeTier;
                    return (
                      <Fragment key={tier}>
                        {index > 0 && (
                          <span
                            aria-hidden="true"
                            className={`h-0.5 flex-1 transition-colors ${
                              filled ? "bg-amber-500 dark:bg-amber-400" : "bg-zinc-200 dark:bg-zinc-700"
                            }`}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleSetTier(config, tier)}
                          aria-label={`${label} volume level ${tier}`}
                          aria-pressed={tier === activeTier}
                          title={tier === MIN_VOLUME_TIER ? "Off" : `Level ${tier}`}
                          className="group shrink-0 p-1"
                        >
                          <span
                            className={`block size-3.5 rounded-full border-2 transition-colors ${
                              filled
                                ? "border-amber-500 bg-amber-500 group-hover:bg-amber-400 group-hover:border-amber-400 dark:border-amber-400 dark:bg-amber-400"
                                : "border-zinc-300 bg-transparent group-hover:border-zinc-400 dark:border-zinc-600 dark:group-hover:border-zinc-500"
                            } ${tier === activeTier ? "ring-2 ring-amber-400/40" : ""}`}
                          />
                        </button>
                      </Fragment>
                    );
                  })}
                </div>
                <p className="text-right text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                  {activeTier === MIN_VOLUME_TIER ? "Off" : `Level ${activeTier} of ${MAX_VOLUME_TIER}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
