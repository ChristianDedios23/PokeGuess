"use client";

import { useEffect, useState } from "react";
import type { GameRoom, WsGameOver } from "@/lib/game";
import { fetchPokemonCatalog, type PokemonSummary } from "@/lib/pokemon";

interface GameOverBannerProps {
  room: GameRoom;
  payload: WsGameOver | null;
  selfSlot: "player1" | "player2";
}

export function GameOverBanner({ room, payload, selfSlot }: GameOverBannerProps) {
  const [catalog, setCatalog] = useState<Map<number, PokemonSummary> | null>(null);
  const opponentSlot: "player1" | "player2" = selfSlot === "player1" ? "player2" : "player1";
  const isDraw = room.status === "FINISHED" && !room.winner;
  const won = room.winner === selfSlot;

  useEffect(() => {
    let cancelled = false;
    fetchPokemonCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const selfGuess = room.players[selfSlot]?.guess;
  const opponentGuess = room.players[opponentSlot]?.guess;

  let detail = "The match has ended.";
  if (room.status === "FINISHED") {
    if (isDraw) {
      detail =
        selfGuess?.correct && opponentGuess?.correct
          ? "You both guessed correctly — it's a draw!"
          : "You both guessed wrong — it's a draw!";
    } else {
      detail = won
        ? "You correctly guessed their Pokémon."
        : "They correctly guessed your Pokémon.";
    }
  } else if (payload?.forfeitedBy) {
    const youLeft = payload.forfeitedBy === selfSlot;
    detail =
      payload.reason === "disconnect_timeout"
        ? youLeft
          ? "You didn't reconnect in time."
          : "Your opponent didn't reconnect in time."
        : youLeft
          ? "You forfeited the match."
          : "Your opponent forfeited the match.";
  } else if (room.status === "FORFEITED") {
    detail = won ? "Your opponent didn't finish the match." : "You didn't finish the match.";
  }

  const selfPokemon = catalog?.get(room.players[selfSlot]?.secretPokemonId ?? -1);
  const opponentPokemon = catalog?.get(room.players[opponentSlot]?.secretPokemonId ?? -1);

  const theme = isDraw
    ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
    : won
      ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/40"
      : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40";

  const headline = isDraw ? "It's a draw!" : won ? "You won!" : "You lost";
  const emoji = isDraw ? "🤝" : won ? "🏆" : "💔";

  return (
    <section className={`space-y-5 rounded-2xl border p-6 text-center shadow-sm ${theme}`}>
      <div className="space-y-1">
        <p className="text-3xl">{emoji}</p>
        <p className="text-xl font-bold">{headline}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{detail}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center gap-1 rounded-xl bg-white/60 p-3 dark:bg-black/20">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Your Pokémon
          </p>
          {selfPokemon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selfPokemon.sprite} alt={selfPokemon.name} className="h-16 w-16" />
          )}
          <p className="text-sm font-semibold capitalize">{selfPokemon?.name ?? "…"}</p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-xl bg-white/60 p-3 dark:bg-black/20">
          <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Opponent&apos;s Pokémon
          </p>
          {opponentPokemon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={opponentPokemon.sprite} alt={opponentPokemon.name} className="h-16 w-16" />
          )}
          <p className="text-sm font-semibold capitalize">{opponentPokemon?.name ?? "…"}</p>
        </div>
      </div>
    </section>
  );
}
