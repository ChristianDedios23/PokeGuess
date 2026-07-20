"use client";

import { useState } from "react";
import { FaDoorOpen } from "react-icons/fa";
import { PiNotePencil } from "react-icons/pi";
import {
  DEFAULT_MODIFIERS,
  ModifiersModal,
  type GameModifiers,
} from "@/components/ModifiersModal";
import { RoomCodeReveal } from "@/components/RoomCodeReveal";
import type { GameRoom, RoomPlayer } from "@/lib/game";

interface RoomLobbyProps {
  room: GameRoom;
  isHost: boolean;
  connectionId: string | null;
  inviteUrl: string;
  onReady: () => void;
  onStart: () => void;
  onLeave: () => void;
  loading: boolean;
}

function readinessChip(player: RoomPlayer | undefined) {
  if (!player) return null;
  if (player.ready) {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
        Ready
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      Not ready
    </span>
  );
}

function connectionChip(player: RoomPlayer | undefined) {
  if (!player) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
        Waiting…
      </span>
    );
  }
  if (player.connected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
      Offline
    </span>
  );
}

function statusChips(player: RoomPlayer | undefined) {
  return (
    <span className="flex items-center gap-1.5">
      {readinessChip(player)}
      {connectionChip(player)}
    </span>
  );
}

export function RoomLobby({
  room,
  isHost,
  connectionId,
  inviteUrl,
  onReady,
  onStart,
  onLeave,
  loading,
}: RoomLobbyProps) {
  const player1 = room.players.player1;
  const player2 = room.players.player2;
  const selfSlot = connectionId
    ? player1?.connectionId === connectionId
      ? player1
      : player2?.connectionId === connectionId
        ? player2
        : null
    : null;

  const bothReady = Boolean(player1?.ready && player2?.ready);
  const canStart = isHost && player2 && bothReady && connectionId;

  const [linkCopied, setLinkCopied] = useState(false);
  const [modifiersOpen, setModifiersOpen] = useState(false);
  const [modifiers, setModifiers] = useState<GameModifiers>(DEFAULT_MODIFIERS);

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; fail silently.
    }
  }

  return (
    <section className="relative space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setModifiersOpen(true)}
        className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white/80 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
        aria-haspopup="dialog"
        aria-expanded={modifiersOpen}
      >
        <PiNotePencil className="size-3.5 shrink-0" aria-hidden="true" />
        Modifiers
      </button>

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Room code</p>
        <RoomCodeReveal roomCode={room.roomCode} copyable showHint />
        <button
          type="button"
          onClick={copyInviteLink}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <span role="status" aria-live="polite">
            {linkCopied ? "Copied!" : "Copy invite link"}
          </span>
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Players</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
            <span className="font-medium">{player1?.displayName ?? "Host"} · (Host)</span>
            {statusChips(player1)}
          </li>
          <li className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
            <span className="font-medium">{player2?.displayName ?? "Waiting for opponent…"}</span>
            {statusChips(player2)}
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReady}
            disabled={!connectionId || !player2 || selfSlot?.ready || loading}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {selfSlot?.ready ? "Ready ✓" : "I'm ready!"}
          </button>

          {isHost && (
            <button
              type="button"
              onClick={onStart}
              disabled={!canStart || loading}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600"
            >
              Start game
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onLeave}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <FaDoorOpen className="size-3.5 shrink-0" aria-hidden="true" />
          Leave game
        </button>
      </div>

      <ModifiersModal
        open={modifiersOpen}
        value={modifiers}
        onChange={setModifiers}
        onClose={() => setModifiersOpen(false)}
        readOnly={!isHost}
      />
    </section>
  );
}
