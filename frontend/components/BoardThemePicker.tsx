"use client";

import { useEffect, useState } from "react";
import {
  BOARD_COLLECTIONS,
  getCollectionForTheme,
  type BoardTheme,
} from "@/lib/boardThemes";

interface BoardThemePickerProps {
  open: boolean;
  selectedId: string;
  onClose: () => void;
  onSelect: (index: number) => void;
  themes: BoardTheme[];
}

export function BoardThemePicker({
  open,
  selectedId,
  onClose,
  onSelect,
  themes,
}: BoardThemePickerProps) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState(
    () => getCollectionForTheme(selectedId)?.id ?? BOARD_COLLECTIONS[0]?.id ?? "",
  );

  const activeCollection =
    BOARD_COLLECTIONS.find((collection) => collection.id === activeCollectionId) ??
    BOARD_COLLECTIONS[0];

  useEffect(() => {
    if (open) {
      setRendered(true);
      setVisible(false);
      setActiveCollectionId(
        getCollectionForTheme(selectedId)?.id ?? BOARD_COLLECTIONS[0]?.id ?? "",
      );

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
  }, [open, selectedId]);

  useEffect(() => {
    if (!rendered) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rendered, onClose]);

  if (!rendered) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="themes-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        visible ? "" : "pointer-events-none"
      }`}
    >
      <button
        type="button"
        aria-label="Close themes"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 active:scale-100"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 180ms ease-out",
        }}
      />

      <div
        className="relative z-10 flex max-h-[min(100%,36rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-500 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(4px) scale(0.99)",
          transition: "opacity 180ms ease-out, transform 180ms ease-out",
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <h2
            id="themes-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Themes
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

        <div
          role="tablist"
          aria-label="Pokémon game"
          className="grid shrink-0 grid-cols-4 border-b border-zinc-200 px-3 pt-2 dark:border-zinc-700"
        >
          {BOARD_COLLECTIONS.map((collection) => {
            const active = collection.id === activeCollection?.id;
            const shortLabel =
              collection.id === "bw"
                ? "B/W"
                : collection.id === "bw2"
                  ? "B2/W2"
                  : collection.id === "dp"
                    ? "D/P"
                    : "Pt";

            return (
              <button
                key={collection.id}
                type="button"
                role="tab"
                aria-selected={active}
                title={collection.label}
                onClick={() => setActiveCollectionId(collection.id)}
                className={`border-b-2 px-1 py-2.5 text-xs font-semibold transition ${
                  active
                    ? "border-amber-500 text-amber-700 dark:text-amber-300"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
                }`}
              >
                {shortLabel}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          aria-label={activeCollection?.label}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {activeCollection?.themes.map((theme) => {
              const index = themes.findIndex((entry) => entry.id === theme.id);
              const selected = theme.id === selectedId;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    if (index >= 0) onSelect(index);
                    onClose();
                  }}
                  className={`group overflow-hidden rounded-xl border text-left transition ${
                    selected
                      ? "border-amber-400 ring-2 ring-amber-400/50"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-500"
                  }`}
                >
                  <div
                    className="relative w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                    style={{ aspectRatio: "840 / 710" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={theme.file}
                      alt=""
                      draggable={false}
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-1 px-2.5 py-2">
                    <span className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-200">
                      {theme.label}
                    </span>
                    {selected && (
                      <span className="shrink-0 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        Active
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
