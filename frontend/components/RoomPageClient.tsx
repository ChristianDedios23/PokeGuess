"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatPanel } from "@/components/ChatPanel";
import { GameOverBanner } from "@/components/GameOverBanner";
import { GuessBoard } from "@/components/GuessBoard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { RoomLobby } from "@/components/RoomLobby";
import type { ChatMessage, GameRoom, WsGameOver } from "@/lib/game";
import { joinRoom } from "@/lib/game";
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
  const [gameOver, setGameOver] = useState<WsGameOver | null>(null);
  const [confirmingForfeit, setConfirmingForfeit] = useState(false);

  const hasSession = mounted && session?.roomCode === roomCode;
  const displayName = hasSession ? session!.displayName : "";
  const isHost = hasSession ? session!.isHost : false;
  const playerToken = hasSession ? session!.playerToken : undefined;
  const selfSlot: "player1" | "player2" = isHost ? "player1" : "player2";

  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return `/room/${roomCode}`;
    return `${window.location.origin}/room/${roomCode}`;
  }, [roomCode]);

  const handleRoomUpdate = useCallback((nextRoom: GameRoom) => {
    setRoom(nextRoom);
  }, []);

  const handleGameStarted = useCallback((nextRoom: GameRoom) => {
    setGameOver(null);
    setRoom(nextRoom);
  }, []);

  const handleGameOver = useCallback((payload: WsGameOver) => {
    setRoom(payload.room);
    setGameOver(payload);
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

  const { status, connectionId, error: socketError, reconnect, send } = useRoomSocket({
    roomCode,
    displayName,
    playerToken,
    enabled: hasSession,
    onRoomUpdate: handleRoomUpdate,
    onGameStarted: handleGameStarted,
    onGameOver: handleGameOver,
    onChatMessage: handleChatMessage,
    onChatMessageSent: handleChatMessageSent,
  });

  useEffect(() => {
    setSession(getSession(roomCode));
    setMounted(true);
  }, [roomCode]);

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    const name = joinName.trim();
    if (!name) return;

    setLoading(true);
    setError(null);

    try {
      const { playerToken: token } = await joinRoom(roomCode, name);
      saveSession({ roomCode, displayName: name, isHost: false, playerToken: token });
      setSession(getSession(roomCode));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setLoading(false);
    }
  }

  function handleReady() {
    if (!connectionId) return;
    setLoading(true);
    setError(null);
    try {
      send({ action: "readyUp" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to ready up");
    } finally {
      setLoading(false);
    }
  }

  function handleStart() {
    if (!connectionId) return;
    setLoading(true);
    setError(null);
    try {
      send({ action: "startGame" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
    } finally {
      setLoading(false);
    }
  }

  function handleGuess(pokemonId: number) {
    if (!connectionId || hasGuessed) return;
    setError(null);
    try {
      send({ action: "makeGuess", pokemonId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit guess");
    }
  }

  function handleForfeit() {
    if (!connectionId) return;
    if (!confirmingForfeit) {
      setConfirmingForfeit(true);
      return;
    }
    setError(null);
    try {
      send({ action: "forfeitGame" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to forfeit");
    } finally {
      setConfirmingForfeit(false);
    }
  }

  function handleRequestRematch() {
    if (!connectionId) return;
    setError(null);
    try {
      send({ action: "requestRematch" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request rematch");
    }
  }

  function handleLeave() {
    try {
      send({ action: "leaveRoom" });
    } catch {
      // Not connected — nothing to notify the server about.
    }
    router.push("/");
  }

  const gameActive = room?.status === "ACTIVE";
  const gameEnded = room?.status === "FINISHED" || room?.status === "FORFEITED";
  const ownSecretPokemonId = room?.players[selfSlot]?.secretPokemonId;
  const hasGuessed = Boolean(room?.players[selfSlot]?.guess);
  const opponentSlot: "player1" | "player2" = selfSlot === "player1" ? "player2" : "player1";
  const opponentName = room?.players[opponentSlot]?.displayName ?? "your opponent";
  const selfRematchRequested = Boolean(room?.players[selfSlot]?.rematchRequested);
  const opponentRematchRequested = Boolean(room?.players[opponentSlot]?.rematchRequested);

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
        <div className="space-y-2 text-center">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Room {roomCode}
          </p>
          <h1 className="text-2xl font-bold">Join the game</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Enter your name to join this room.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <LoadingSpinner label="Joining room..." />
          </div>
        ) : (
          <form
            onSubmit={handleJoin}
            className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <label className="grid gap-2 text-sm font-medium">
              Your name
              <input
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="Enter your display name"
                maxLength={24}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading || !joinName.trim()}
              className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600"
            >
              Join Room
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mx-auto block text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
        >
          Create your own room instead
        </button>
      </div>
    );
  }

  const statusDotColor =
    status === "connected"
      ? "bg-green-500"
      : status === "connecting"
        ? "bg-amber-500"
        : status === "error"
          ? "bg-red-500"
          : "bg-zinc-400";

  return (
    <div
      className={`mx-auto flex w-full flex-col ${
        gameActive
          ? "relative h-full max-w-7xl overflow-hidden px-4 sm:px-6"
          : "max-w-2xl gap-6 p-6"
      }`}
    >
      <header
        className={`flex flex-wrap items-start justify-between gap-2 ${
          gameActive
            ? "absolute top-0 right-0 left-0 z-20 px-4 py-2 sm:px-6"
            : "shrink-0"
        }`}
      >
        <div className="space-y-0.5">
          <h1 className={`font-bold ${gameActive ? "text-lg" : "text-2xl"}`}>Room {roomCode}</h1>
          {!gameActive && (
            <p className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${statusDotColor}`}
              />
              Playing as {displayName}
              {isHost ? " (Host)" : ""}
              {" · "}
              {status === "connected"
                ? "Connected"
                : status === "connecting"
                  ? "Connecting…"
                  : "Offline"}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          {gameActive && !confirmingForfeit && (
            <button
              type="button"
              onClick={handleForfeit}
              disabled={!connectionId}
              className="rounded-lg border border-red-300 bg-white/80 px-3 py-1.5 text-xs font-medium text-red-700 backdrop-blur-sm transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-zinc-950/70 dark:text-red-300 dark:hover:bg-red-950"
            >
              Forfeit
            </button>
          )}
          {gameActive && confirmingForfeit && (
            <>
              <button
                type="button"
                onClick={() => setConfirmingForfeit(false)}
                className="rounded-lg border border-zinc-300 bg-white/80 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/70 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleForfeit}
                disabled={!connectionId}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                Confirm forfeit
              </button>
            </>
          )}
          {!gameEnded && (
            <button
              type="button"
              onClick={handleLeave}
              className="rounded-lg border border-zinc-300 bg-white/80 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/70 dark:hover:bg-zinc-800"
            >
              Leave game
            </button>
          )}
        </div>
      </header>

      {(error || socketError) && (
        <p
          className={`rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300 ${
            gameActive ? "absolute top-14 right-4 left-4 z-20 sm:right-6 sm:left-6" : "shrink-0"
          }`}
        >
          {error ?? socketError}
        </p>
      )}

      {status === "error" && (
        <button
          type="button"
          onClick={reconnect}
          className={`self-start rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 ${
            gameActive ? "absolute top-14 left-4 z-20 sm:left-6" : "shrink-0"
          }`}
        >
          Reconnect
        </button>
      )}

      {room && room.status === "WAITING" && (
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
        <div className="flex h-full min-h-0 flex-col gap-3 pt-14 pb-2 lg:flex-row lg:items-center lg:gap-4">
          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col self-stretch">
            {hasGuessed && (
              <p className="mb-2 w-full shrink-0 rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                You&apos;ve made your guess. Waiting for your opponent to make theirs…
              </p>
            )}
            <div className="relative min-h-0 w-full flex-1">
              <GuessBoard
                roomCode={roomCode}
                selfSlot={selfSlot}
                board={room.board}
                ownSecretPokemonId={ownSecretPokemonId}
                disabled={!connectionId || hasGuessed}
                onGuess={handleGuess}
              />
            </div>
          </div>

          <div className="h-36 w-full shrink-0 self-center lg:h-[min(100%,36rem)] lg:w-72 xl:w-80">
            <ChatPanel
              className="h-full"
              connectionId={connectionId}
              selfDisplayName={displayName}
              selfConnectionId={connectionId}
              enabled={gameActive}
              isHost={isHost}
              connectionStatus={status}
              incomingMessage={incomingChat}
              sentConfirmation={sentConfirmation}
              onSendMessage={(message) => {
                send({ action: "sendChatMessage", message });
              }}
            />
          </div>
        </div>
      )}

      {room && gameEnded && (
        <div className="space-y-4">
          <GameOverBanner room={room} payload={gameOver} selfSlot={selfSlot} />

          <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {opponentRematchRequested && !selfRematchRequested && (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {opponentName} wants a rematch!
              </p>
            )}
            {selfRematchRequested && !opponentRematchRequested && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Waiting for {opponentName} to accept the rematch…
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={handleRequestRematch}
                disabled={!connectionId || selfRematchRequested}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600"
              >
                {selfRematchRequested
                  ? "Rematch requested ✓"
                  : opponentRematchRequested
                    ? "Accept rematch"
                    : "Request rematch"}
              </button>
              <button
                type="button"
                onClick={handleLeave}
                className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Back to main menu
              </button>
            </div>
          </div>
        </div>
      )}

      {!room && hasSession && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <LoadingSpinner label="Connecting to room..." />
        </div>
      )}
    </div>
  );
}
