"use client";

import type { GameRoom } from "@/lib/game";

interface RoomLobbyProps {
  room: GameRoom;
  isHost: boolean;
  connectionId: string | null;
  inviteUrl: string;
  onReady: () => void;
  onStart: () => void;
  loading: boolean;
}

export function RoomLobby({
  room,
  isHost,
  connectionId,
  inviteUrl,
  onReady,
  onStart,
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

  async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteUrl);
  }

  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">Room code</p>
          <p className="text-2xl font-semibold tracking-widest">{room.roomCode}</p>
        </div>
        <button
          type="button"
          onClick={copyInviteLink}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
        >
          Copy invite link
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Players</p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
            <span>{player1?.displayName ?? "Host"} (Host)</span>
            <span>{player1?.ready ? "Ready" : player1?.connected ? "Connected" : "…"}</span>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
            <span>{player2?.displayName ?? "Waiting for opponent…"}</span>
            <span>
              {player2 ? (player2.ready ? "Ready" : player2.connected ? "Connected" : "…") : "—"}
            </span>
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReady}
          disabled={!connectionId || !player2 || selfSlot?.ready || loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {selfSlot?.ready ? "Ready" : "Ready up"}
        </button>

        {isHost && (
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart || loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Start game
          </button>
        )}
      </div>
    </section>
  );
}
