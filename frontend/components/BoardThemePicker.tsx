"use client";

import { useEffect, useRef } from "react";
import { BOARD_COLLECTIONS, type BoardTheme } from "@/lib/boardThemes";

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
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Board themes"
      className="absolute top-0 right-0 z-30 flex max-h-full w-44 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/95 shadow-xl backdrop-blur-md dark:border-zinc-700/80 dark:bg-zinc-900/95 sm:w-52"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200/80 px-3 py-2 dark:border-zinc-700/80">
        <p className="text-xs font-semibold tracking-wide text-zinc-700 uppercase dark:text-zinc-200">
          {BOARD_COLLECTIONS[0]?.label ?? "Themes"}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close theme picker"
          className="rounded-md px-1.5 py-0.5 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          ×
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-2">
        {themes.map((theme, index) => {
          const selected = theme.id === selectedId;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => {
                onSelect(index);
                onClose();
              }}
              className={`group w-full overflow-hidden rounded-xl border text-left transition ${
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
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="truncate text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
                  {theme.label}
                </span>
                {selected && (
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    Active
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
