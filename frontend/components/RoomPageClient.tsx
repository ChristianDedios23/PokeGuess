"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatPanel } from "@/components/ChatPanel";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { RoomLobby } from "@/components/RoomLobby";
import type { ChatMessage, GameRoom } from "@/lib/game";
import { joinRoom, readyUp, startGame } from "@/lib/game";
import { getSession, saveSession, type PlayerSession } from "@/lib/session";
import { useRoomSocket } from "@/lib/useRoomSocket";

interface RoomPageClientProps {
  roomCode: string;
}

export function RoomPageClient({ roomCode }: RoomPageClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [joinName, setJoinName] = useState("");
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomingChat, setIncomingChat] = useState<ChatMessage | null>(null);
  const [sentConfirmation, setSentConfirmation] = useState<{
    message: string;
    sentAt: string;
  } | null>(null);

  const hasSession = mounted && session?.roomCode === roomCode;
  const displayName = hasSession ? session!.displayName : "";
  const isHost = hasSession ? session!.isHost : false;

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return `/room/${roomCode}`;
    return `${window.location.origin}/room/${roomCode}`;
  }, [roomCode]);

  const handleRoomUpdate = useCallback((nextRoom: GameRoom) => {
    setRoom(nextRoom);
  }, []);

  const handleGameStarted = useCallback((nextRoom: GameRoom) => {
    setRoom(nextRoom);
  }, []);

  const handleChatMessage = useCallback(
    (payload: {
      fromConnectionId: string;
      fromDisplayName: string;
      message: string;
      sentAt: string;
    }) => {
      setIncomingChat({
        id: `${payload.sentAt}-${payload.fromConnectionId}`,
        from: payload.fromDisplayName,
        text: payload.message,
        sentAt: payload.sentAt,
        isSelf: false,
      });
    },
    [],
  );

  const handleChatMessageSent = useCallback((payload: { message: string; sentAt: string }) => {
    setSentConfirmation(payload);
  }, []);

  const { status, connectionId, error: socketError, reconnect } = useRoomSocket({
    roomCode,
    displayName,
    enabled: hasSession,
    onRoomUpdate: handleRoomUpdate,
    onGameStarted: handleGameStarted,
    onChatMessage: handleChatMessage,
    onChatMessageSent: handleChatMessageSent,
  });

  useEffect(() => {
    setSession(getSession());
    setMounted(true);
  }, [roomCode]);

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    const name = joinName.trim();
    if (!name) return;

    setLoading(true);
    setError(null);

    try {
      const { room: joinedRoom } = await joinRoom(roomCode, name);
      saveSession({ roomCode, displayName: name, isHost: false });
      setSession(getSession());
      setRoom(joinedRoom);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  }

  async function handleReady() {
    if (!connectionId) return;
    setLoading(true);
    setError(null);
    try {
      const { room: updatedRoom } = await readyUp(connectionId);
      setRoom(updatedRoom);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to ready up");
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    if (!connectionId) return;
    setLoading(true);
    setError(null);
    try {
      const { room: updatedRoom } = await startGame(connectionId);
      setRoom(updatedRoom);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
    } finally {
      setLoading(false);
    }
  }

  const gameActive = room?.status === "ACTIVE";

  if (!mounted) {
    return (
      <div className="mx-auto flex min-h-[40vh] w-full max-w-2xl items-center justify-center p-6">
        <LoadingSpinner label="Loading room..." />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Join room {roomCode}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Enter your name to join this game.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
            <LoadingSpinner label="Joining room..." />
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <label className="grid gap-2 text-sm">
              Your name
              <input
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="Enter your display name"
                maxLength={24}
                className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || !joinName.trim()}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Join Room
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => router.push("/")}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          Create your own room
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Room {roomCode}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Playing as {displayName}
          {isHost ? " (Host)" : ""}
          {" · "}
          {status === "connected" ? "Connected" : status === "connecting" ? "Connecting…" : "Offline"}
        </p>
      </header>

      {(error || socketError) && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error ?? socketError}
        </p>
      )}

      {status === "error" && (
        <button
          type="button"
          onClick={reconnect}
          className="self-start rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
        >
          Reconnect
        </button>
      )}

      {room && !gameActive && (
        <RoomLobby
          room={room}
          isHost={isHost}
          connectionId={connectionId}
          inviteUrl={inviteUrl}
          onReady={handleReady}
          onStart={handleStart}
          loading={loading}
        />
      )}

      {room && gameActive && (
        <ChatPanel
          connectionId={connectionId}
          selfDisplayName={displayName}
          selfConnectionId={connectionId}
          enabled={gameActive}
          incomingMessage={incomingChat}
          sentConfirmation={sentConfirmation}
        />
      )}

      {!room && hasSession && (
        <div className="rounded-xl border border-zinc-200 p-8 dark:border-zinc-800">
          <LoadingSpinner label="Connecting to room..." />
        </div>
      )}
    </div>
  );
}
