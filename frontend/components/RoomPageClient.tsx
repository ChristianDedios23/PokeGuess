"use client";

import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { FaDoorOpen } from "react-icons/fa";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlineEllipsisVertical,
  HiOutlineHandRaised,
  HiOutlineMagnifyingGlass,
} from "react-icons/hi2";
import { IoIosPaper } from "react-icons/io";
import { LuPaintbrush } from "react-icons/lu";
import { MdGavel } from "react-icons/md";
import { ChatPanel } from "@/components/ChatPanel";
import { GameOverBanner } from "@/components/GameOverBanner";
import { GuessBoard } from "@/components/GuessBoard";
import { GameInfoModal } from "@/components/HowToPlayModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { OpponentDisconnectBanner } from "@/components/OpponentDisconnectBanner";
import { RoomCodeReveal } from "@/components/RoomCodeReveal";
import { RoomLobby } from "@/components/RoomLobby";
import { ScoreBar } from "@/components/ScoreBar";
import { SecretPokemonPanel, YourPokemonCard } from "@/components/SecretPokemonPanel";
import { SecretRevealScreen } from "@/components/SecretRevealScreen";
import type { ChatMessage, GameRoom, PokemonGender, WsGameOver } from "@/lib/game";
import { FORFEIT_GRACE_MS, joinRoom } from "@/lib/game";
import { getSession, saveSession, type PlayerSession } from "@/lib/session";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useRoomSocket } from "@/lib/useRoomSocket";

interface RoomPageClientProps {
  roomCode: string;
}

interface MatchScore {
  player1: number;
  player2: number;
}

function scoreKey(roomCode: string): string {
  return `pokeguess_score_${roomCode.toUpperCase()}`;
}

function loadScore(roomCode: string): MatchScore {
  if (typeof window === "undefined") return { player1: 0, player2: 0 };
  try {
    const raw = window.localStorage.getItem(scoreKey(roomCode));
    if (!raw) return { player1: 0, player2: 0 };
    const parsed = JSON.parse(raw) as Partial<MatchScore>;
    return {
      player1: typeof parsed.player1 === "number" ? parsed.player1 : 0,
      player2: typeof parsed.player2 === "number" ? parsed.player2 : 0,
    };
  } catch {
    return { player1: 0, player2: 0 };
  }
}

function saveScore(roomCode: string, score: MatchScore): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(scoreKey(roomCode), JSON.stringify(score));
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
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [hoveredPokemonId, setHoveredPokemonId] = useState<number | null>(null);
  const [hoveredGender, setHoveredGender] = useState<PokemonGender | null>(null);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [selectedGuessId, setSelectedGuessId] = useState<number | null>(null);
  const [confirmingGuess, setConfirmingGuess] = useState(false);
  const [gameInfoPanel, setGameInfoPanel] = useState<"rules" | "howToPlay" | null>(null);
  const [revealingSecret, setRevealingSecret] = useState(false);
  const [score, setScore] = useState<MatchScore>({ player1: 0, player2: 0 });
  const [mobileSheet, setMobileSheet] = useState<"info" | "chat" | null>(null);
  const [unreadChat, setUnreadChat] = useState(false);

  const isMobileLayout = useMediaQuery("(max-width: 1023px)");

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
    setRevealingSecret(true);
  }, []);

  const handleGameOver = useCallback(
    (payload: WsGameOver) => {
      setRoom(payload.room);
      setGameOver(payload);

      const winner = payload.room.winner;
      if (winner === "player1" || winner === "player2") {
        setScore((prev) => {
          const next = { ...prev, [winner]: prev[winner] + 1 };
          saveScore(roomCode, next);
          return next;
        });
      }
    },
    [roomCode],
  );

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
      if (mobileSheet !== "chat") setUnreadChat(true);
    },
    [mobileSheet],
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
    setScore(loadScore(roomCode));
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
      setError(err instanceof Error ? err.message : "There was an error joining the room. Please try again.");
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

  function handleSelectForGuess(pokemonId: number) {
    setSelectedGuessId((current) => (current === pokemonId ? null : pokemonId));
    setConfirmingGuess(false);
  }

  function handleSubmitGuess() {
    if (selectedGuessId === null) return;
    if (!confirmingGuess) {
      setConfirmingGuess(true);
      return;
    }
    handleGuess(selectedGuessId);
    setConfirmingGuess(false);
  }

  function requestForfeit() {
    setConfirmingLeave(false);
    setConfirmingForfeit(true);
  }

  function handleForfeit() {
    if (!connectionId) return;
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
    setConfirmingLeave(false);
    try {
      send({ action: "leaveRoom" });
    } catch {
      // Not connected — nothing to notify the server about.
    }
    router.push("/");
  }

  function requestLeave() {
    setConfirmingForfeit(false);
    setConfirmingLeave(true);
  }

  const gameActive = room?.status === "ACTIVE";
  const gameEnded = room?.status === "FINISHED" || room?.status === "FORFEITED";
  const mobileGameHeader = gameActive && isMobileLayout;

  useEffect(() => {
    if (!gameActive) {
      setThemePickerOpen(false);
      setMobileSheet(null);
    }
  }, [gameActive]);
  const ownSecretPokemonId = room?.players[selfSlot]?.secretPokemonId;
  const ownSecretGender = room?.players[selfSlot]?.secretGender ?? "genderless";
  const hasGuessed = Boolean(room?.players[selfSlot]?.guess);
  const opponentSlot: "player1" | "player2" = selfSlot === "player1" ? "player2" : "player1";
  const opponentName = room?.players[opponentSlot]?.displayName ?? "your opponent";
  const selfRematchRequested = Boolean(room?.players[selfSlot]?.rematchRequested);
  const opponentRematchRequested = Boolean(room?.players[opponentSlot]?.rematchRequested);
  const opponentDisconnectedAt = gameActive
    ? room?.players[opponentSlot]?.disconnectedAt
    : undefined;
  const opponentHasLeft = Boolean(opponentDisconnectedAt) && !room?.players[opponentSlot]?.connected;

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
          ? "relative h-full max-w-[100rem] overflow-hidden px-2 sm:px-4"
          : "max-w-2xl gap-6 p-6"
      }`}
    >
      {gameActive && revealingSecret && (
        <SecretRevealScreen
          pokemonId={ownSecretPokemonId}
          gender={ownSecretGender}
          onDone={() => setRevealingSecret(false)}
        />
      )}

      <GameInfoModal
        panel={gameInfoPanel}
        onClose={() => setGameInfoPanel(null)}
      />

      <header
        className={`z-20 gap-2 ${
          gameActive
            ? `grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2 sm:px-6 ${
                mobileGameHeader ? "" : "absolute top-0 right-0 left-0"
              }`
            : "flex shrink-0 flex-wrap items-start justify-between"
        }`}
      >
        {gameActive ? (
          mobileGameHeader ? (
            <>
              <div className="justify-self-start">
                <MobileHeaderMenu
                  themesOpen={themePickerOpen}
                  onThemes={() => {
                    setGameInfoPanel(null);
                    setThemePickerOpen((open) => !open);
                  }}
                  onRules={() => {
                    setThemePickerOpen(false);
                    setGameInfoPanel("rules");
                  }}
                  onHowToPlay={() => {
                    setThemePickerOpen(false);
                    setGameInfoPanel("howToPlay");
                  }}
                />
              </div>
              <RoomCodeReveal
                roomCode={roomCode}
                copyable
                showHint
                className="text-sm font-bold tracking-[0.2em] text-red-600 dark:text-red-500"
              />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 justify-self-start">
                <button
                  type="button"
                  onClick={() => {
                    setGameInfoPanel(null);
                    setThemePickerOpen((open) => !open);
                  }}
                  aria-expanded={themePickerOpen}
                  aria-haspopup="dialog"
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition ${
                    themePickerOpen
                      ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-200"
                      : "border-zinc-300 bg-white/80 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  <LuPaintbrush className="size-3.5 shrink-0" aria-hidden="true" />
                  Themes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setThemePickerOpen(false);
                    setGameInfoPanel("rules");
                  }}
                  aria-expanded={gameInfoPanel === "rules"}
                  aria-haspopup="dialog"
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition ${
                    gameInfoPanel === "rules"
                      ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-200"
                      : "border-zinc-300 bg-white/80 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  <IoIosPaper className="size-3.5 shrink-0" aria-hidden="true" />
                  Rules
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setThemePickerOpen(false);
                    setGameInfoPanel("howToPlay");
                  }}
                  aria-expanded={gameInfoPanel === "howToPlay"}
                  aria-haspopup="dialog"
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition ${
                    gameInfoPanel === "howToPlay"
                      ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-200"
                      : "border-zinc-300 bg-white/80 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  <HiOutlineHandRaised className="size-3.5 shrink-0" aria-hidden="true" />
                  How to Play
                </button>
              </div>
              <RoomCodeReveal
                roomCode={roomCode}
                copyable
                showHint
                className="text-lg font-bold tracking-[0.25em] text-red-600 dark:text-red-500"
              />
            </>
          )
        ) : room?.status !== "WAITING" ? (
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold">Room {roomCode}</h1>
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
          </div>
        ) : (
          <div className="space-y-0.5">
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
          </div>
        )}

        <div className={`flex gap-2 ${gameActive ? "justify-self-end" : ""}`}>
          {gameActive && (
            <button
              type="button"
              onClick={requestForfeit}
              disabled={!connectionId}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white/80 px-3 py-1.5 text-xs font-medium text-red-700 backdrop-blur-sm transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-zinc-950/70 dark:text-red-300 dark:hover:bg-red-950"
              aria-label="Forfeit"
            >
              <MdGavel className="size-3.5 shrink-0" aria-hidden="true" />
              {!mobileGameHeader && "Forfeit"}
            </button>
          )}
          {!gameEnded && (
            <button
              type="button"
              onClick={requestLeave}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white/80 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/70 dark:hover:bg-zinc-800"
              aria-label="Leave game"
            >
              <FaDoorOpen className="size-3.5 shrink-0" aria-hidden="true" />
              {!mobileGameHeader && "Leave game"}
            </button>
          )}
        </div>
      </header>

      {gameActive ? (
        (error || socketError || status === "error" || opponentHasLeft) && (
          <div
            className={`z-20 flex flex-col items-start gap-2 ${
              mobileGameHeader
                ? "shrink-0"
                : "absolute top-14 right-4 left-4 sm:right-6 sm:left-6"
            }`}
          >
            {(error || socketError) && (
              <p className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {error ?? socketError}
              </p>
            )}
            {status === "error" && (
              <button
                type="button"
                onClick={reconnect}
                className="rounded-lg border border-zinc-300 bg-white/80 px-3 py-2 text-sm font-medium backdrop-blur-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/70 dark:hover:bg-zinc-800"
              >
                Reconnect
              </button>
            )}
            {opponentHasLeft && opponentDisconnectedAt && (
              <OpponentDisconnectBanner
                opponentName={opponentName}
                disconnectedAt={opponentDisconnectedAt}
                graceMs={FORFEIT_GRACE_MS}
              />
            )}
          </div>
        )
      ) : (
        <>
          {(error || socketError) && (
            <p className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error ?? socketError}
            </p>
          )}
          {status === "error" && (
            <button
              type="button"
              onClick={reconnect}
              className="shrink-0 self-start rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Reconnect
            </button>
          )}
        </>
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

      {room && gameActive && !isMobileLayout && (
        <div className="flex h-full min-h-0 translate-y-8 flex-col gap-2 pt-12 pb-1 lg:flex-row lg:items-center lg:justify-center lg:gap-3">
          <div className="order-3 h-72 w-full shrink-0 self-center lg:order-1 lg:h-[82.5%] lg:w-[250px] xl:w-[298px]">
            <SecretPokemonPanel
              className="h-full"
              variant="inspectView"
              hoveredPokemonId={hoveredPokemonId}
              hoveredGender={hoveredGender}
            />
          </div>

          <div className="relative order-1 flex min-h-0 min-w-0 w-full flex-1 flex-col self-stretch lg:order-2 lg:h-[82.5%] lg:self-center">
            <ScoreBar
              className="pointer-events-none absolute right-0 bottom-full left-0 z-10 mb-2 -translate-y-2"
              player1Name={room.players.player1?.displayName ?? "Player 1"}
              player2Name={room.players.player2?.displayName ?? "Player 2"}
              score1={score.player1}
              score2={score.player2}
            />
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
                boardGenders={room.boardGenders ?? []}
                disabled={!connectionId || hasGuessed}
                selected={selectedGuessId}
                onSelectForGuess={handleSelectForGuess}
                onHoverPokemon={(pokemonId, gender) => {
                  setHoveredPokemonId(pokemonId);
                  setHoveredGender(gender);
                }}
                themePickerOpen={themePickerOpen}
                onThemePickerOpenChange={setThemePickerOpen}
              />
            </div>
            <YourPokemonCard
              className="mt-1 shrink-0"
              pokemonId={ownSecretPokemonId}
              secretGender={ownSecretGender}
              onHover={(hovering) => {
                if (hovering) {
                  setHoveredPokemonId(ownSecretPokemonId ?? null);
                  setHoveredGender(ownSecretGender);
                } else {
                  setHoveredPokemonId(null);
                  setHoveredGender(null);
                }
              }}
            />
            {selectedGuessId !== null && (
              <div className="flex shrink-0 justify-center pt-2">
                <button
                  type="button"
                  onClick={handleSubmitGuess}
                  disabled={!connectionId || hasGuessed}
                  style={{ fontFamily: "var(--font-fredoka)" }}
                  className="shrink-0 rounded-full bg-gradient-to-b from-red-500 to-red-600 px-4 py-2 text-xs font-bold text-white shadow-[0_3px_0_0_rgba(153,27,27,1),0_6px_10px_-2px_rgba(0,0,0,0.3)] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_0_rgba(153,27,27,1)] disabled:opacity-50"
                >
                  {confirmingGuess ? "Confirm final guess?" : "Submit guess"}
                </button>
              </div>
            )}
          </div>

          <div className="order-2 h-36 w-full min-w-0 shrink-0 self-center lg:order-3 lg:h-[82.5%] lg:w-[250px] xl:w-[298px]">
            <ChatPanel
              className="h-full"
              connectionId={connectionId}
              selfDisplayName={displayName}
              selfConnectionId={connectionId}
              enabled={gameActive}
              isHost={isHost}
              connectionStatus={status === "idle" ? "disconnected" : status}
              incomingMessage={incomingChat}
              sentConfirmation={sentConfirmation}
              onSendMessage={(message) => {
                send({ action: "sendChatMessage", message });
              }}
            />
          </div>
        </div>
      )}

      {room && gameActive && isMobileLayout && (
        <>
          <div className="flex h-full min-h-0 flex-col gap-2 pb-16">
            <ScoreBar
              className="shrink-0"
              player1Name={room.players.player1?.displayName ?? "Player 1"}
              player2Name={room.players.player2?.displayName ?? "Player 2"}
              score1={score.player1}
              score2={score.player2}
            />
            {hasGuessed && (
              <p className="w-full shrink-0 rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                You&apos;ve made your guess. Waiting for your opponent to make theirs…
              </p>
            )}
            <div
              className="relative min-h-0 w-full"
              style={{ aspectRatio: "840 / 710" }}
            >
              <GuessBoard
                roomCode={roomCode}
                selfSlot={selfSlot}
                board={room.board}
                boardGenders={room.boardGenders ?? []}
                disabled={!connectionId || hasGuessed}
                selected={selectedGuessId}
                onSelectForGuess={handleSelectForGuess}
                onHoverPokemon={(pokemonId, gender) => {
                  setHoveredPokemonId(pokemonId);
                  setHoveredGender(gender);
                }}
                themePickerOpen={themePickerOpen}
                onThemePickerOpenChange={setThemePickerOpen}
                align="top"
              />
            </div>
            <div className="flex shrink-0 items-center justify-center gap-3">
              <YourPokemonCard
                pokemonId={ownSecretPokemonId}
                secretGender={ownSecretGender}
                onHover={(hovering) => {
                  if (hovering) {
                    setHoveredPokemonId(ownSecretPokemonId ?? null);
                    setHoveredGender(ownSecretGender);
                  } else {
                    setHoveredPokemonId(null);
                    setHoveredGender(null);
                  }
                }}
              />
              {selectedGuessId !== null && (
                <button
                  type="button"
                  onClick={handleSubmitGuess}
                  disabled={!connectionId || hasGuessed}
                  style={{ fontFamily: "var(--font-fredoka)" }}
                  className="shrink-0 rounded-full bg-gradient-to-b from-red-500 to-red-600 px-4 py-2 text-xs font-bold text-white shadow-[0_3px_0_0_rgba(153,27,27,1),0_6px_10px_-2px_rgba(0,0,0,0.3)] transition hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_0_rgba(153,27,27,1)] disabled:opacity-50"
                >
                  {confirmingGuess ? "Confirm final guess?" : "Submit guess"}
                </button>
              )}
            </div>
          </div>

          <MobileSheet
            mobileSheet={mobileSheet}
            unreadChat={unreadChat}
            onToggleInfo={() =>
              setMobileSheet((current) => (current === "info" ? null : "info"))
            }
            onToggleChat={() => {
              setMobileSheet((current) => (current === "chat" ? null : "chat"));
              setUnreadChat(false);
            }}
          >
            <div
              className={`h-full min-h-0 ${
                mobileSheet === "info" ? "flex flex-col" : "hidden"
              }`}
            >
              <SecretPokemonPanel
                className="h-full"
                variant="inspectView"
                hoveredPokemonId={hoveredPokemonId}
                hoveredGender={hoveredGender}
              />
            </div>
            <div
              className={`h-full min-h-0 ${
                mobileSheet === "chat" ? "flex flex-col" : "hidden"
              }`}
            >
              <ChatPanel
                className="h-full"
                connectionId={connectionId}
                selfDisplayName={displayName}
                selfConnectionId={connectionId}
                enabled={gameActive}
                isHost={isHost}
                connectionStatus={status === "idle" ? "disconnected" : status}
                incomingMessage={incomingChat}
                sentConfirmation={sentConfirmation}
                onSendMessage={(message) => {
                  send({ action: "sendChatMessage", message });
                }}
              />
            </div>
          </MobileSheet>
        </>
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
                onClick={requestLeave}
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

      <LeaveRoomModal
        open={confirmingLeave}
        onCancel={() => setConfirmingLeave(false)}
        onConfirm={handleLeave}
      />

      <ForfeitModal
        open={confirmingForfeit}
        onCancel={() => setConfirmingForfeit(false)}
        onConfirm={handleForfeit}
      />
    </div>
  );
}

function LeaveRoomModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setVisible(false);
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
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rendered, onCancel]);

  if (!rendered) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-room-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        visible ? "" : "pointer-events-none"
      }`}
    >
      <button
        type="button"
        aria-label="Cancel leaving room"
        onClick={onCancel}
        className="modal-scrim absolute inset-0 bg-black/55 outline-none ring-0 transition-[box-shadow] active:transform-none active:ring-1 active:ring-inset active:ring-white/25 focus-visible:outline-none"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 180ms ease-out",
        }}
      />

      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-500 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(4px) scale(0.99)",
          transition: "opacity 180ms ease-out, transform 180ms ease-out",
        }}
      >
        <h2
          id="leave-room-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Leave room?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          You’ll leave this match and return to the main menu. Your opponent will
          see that you’ve disconnected.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Stay
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            <FaDoorOpen className="size-3.5 shrink-0" aria-hidden="true" />
            Leave room
          </button>
        </div>
      </div>
    </div>
  );
}

function ForfeitModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setVisible(false);
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
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rendered, onCancel]);

  if (!rendered) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forfeit-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        visible ? "" : "pointer-events-none"
      }`}
    >
      <button
        type="button"
        aria-label="Cancel forfeit"
        onClick={onCancel}
        className="modal-scrim absolute inset-0 bg-black/55 outline-none ring-0 transition-[box-shadow] active:transform-none active:ring-1 active:ring-inset active:ring-white/25 focus-visible:outline-none"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 180ms ease-out",
        }}
      />

      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-500 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(4px) scale(0.99)",
          transition: "opacity 180ms ease-out, transform 180ms ease-out",
        }}
      >
        <h2
          id="forfeit-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Forfeit this match?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Your opponent will be declared the winner. This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Keep playing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            <MdGavel className="size-3.5 shrink-0" aria-hidden="true" />
            Forfeit match
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileHeaderMenu({
  themesOpen,
  onThemes,
  onRules,
  onHowToPlay,
}: {
  themesOpen: boolean;
  onThemes: () => void;
  onRules: () => void;
  onHowToPlay: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Game menu"
        className={`inline-flex items-center justify-center rounded-lg border p-2 backdrop-blur-sm transition ${
          open || themesOpen
            ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-200"
            : "border-zinc-300 bg-white/80 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
        }`}
      >
        <HiOutlineEllipsisVertical className="size-4 shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Game menu"
          className="absolute top-full left-0 z-30 mt-1 w-44 overflow-hidden rounded-lg border border-zinc-300 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              onThemes();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <LuPaintbrush className="size-4 shrink-0" aria-hidden="true" />
            Themes
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              onRules();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <IoIosPaper className="size-4 shrink-0" aria-hidden="true" />
            Rules
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              onHowToPlay();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <HiOutlineHandRaised className="size-4 shrink-0" aria-hidden="true" />
            How to Play
          </button>
        </div>
      )}
    </div>
  );
}

const MOBILE_SHEET_BODY_HEIGHT = "min(60dvh, 26rem)";

function MobileSheet({
  mobileSheet,
  unreadChat,
  onToggleInfo,
  onToggleChat,
  children,
}: {
  mobileSheet: "info" | "chat" | null;
  unreadChat: boolean;
  onToggleInfo: () => void;
  onToggleChat: () => void;
  children: ReactNode;
}) {
  const open = mobileSheet !== null;

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (mobileSheet === "info") onToggleInfo();
      else if (mobileSheet === "chat") onToggleChat();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, mobileSheet, onToggleInfo, onToggleChat]);

  return (
    <div
      role="region"
      aria-label="Inspect and chat"
      className="absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-2xl border border-zinc-300 bg-white shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-zinc-700 dark:bg-zinc-900"
      style={{
        height: `calc(3.5rem + ${MOBILE_SHEET_BODY_HEIGHT})`,
        transform: open ? "translateY(0)" : `translateY(${MOBILE_SHEET_BODY_HEIGHT})`,
      }}
    >
      <div className="z-10 flex h-14 shrink-0 items-center gap-2 bg-white/95 px-3 py-2 backdrop-blur-sm dark:bg-zinc-950/95">
        <button
          type="button"
          onClick={onToggleInfo}
          aria-pressed={mobileSheet === "info"}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition-all duration-150 active:scale-95 ${
            mobileSheet === "info"
              ? "bg-amber-100 text-amber-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:bg-amber-950 dark:text-amber-200"
              : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          <HiOutlineMagnifyingGlass className="size-4 shrink-0" aria-hidden="true" />
          Inspect
        </button>
        <span
          aria-hidden="true"
          className="h-6 w-px shrink-0 bg-zinc-200 dark:bg-zinc-800"
        />
        <button
          type="button"
          onClick={onToggleChat}
          aria-pressed={mobileSheet === "chat"}
          className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition-all duration-150 active:scale-95 ${
            mobileSheet === "chat"
              ? "bg-amber-100 text-amber-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:bg-amber-950 dark:text-amber-200"
              : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          <HiOutlineChatBubbleLeftRight className="size-4 shrink-0" aria-hidden="true" />
          Chat
          {unreadChat && mobileSheet !== "chat" && (
            <span
              aria-hidden="true"
              className="absolute top-1 right-[28%] h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-950"
            />
          )}
        </button>
      </div>
      <div className="min-h-0 flex-1 border-t border-zinc-200 dark:border-zinc-800">
        {children}
      </div>
    </div>
  );
}
