import { randomInt } from "crypto";
import type { FirstPlayer, GameModifiers, GenerationSelection, TurnPlayer } from "../db/types";
import { GameError } from "../types/errors";

export const DEFAULT_MODIFIERS: GameModifiers = {
  generation: "all",
  leaveTimer: "enable",
  playMode: "structured",
  guessingRule: "classic",
  opponentInteract: "no",
  limitedTurns: "unlimited",
  firstPlayer: "random",
};

export const GENERATION_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Inclusive national-dex id ranges per generation. */
const GENERATION_ID_RANGES: Record<number, [number, number]> = {
  1: [1, 151],
  2: [152, 251],
  3: [252, 386],
  4: [387, 493],
  5: [494, 649],
  6: [650, 721],
  7: [722, 809],
  8: [810, 905],
  9: [906, 1025],
};

const MIN_LIMITED_TURNS = 5;
const MAX_LIMITED_TURNS = 20;

export function generationForId(id: number): number | null {
  for (const gen of GENERATION_NUMBERS) {
    const [lo, hi] = GENERATION_ID_RANGES[gen];
    if (id >= lo && id <= hi) return gen;
  }
  return null;
}

/** True when a pokemon id belongs to one of the selected generations. */
export function idMatchesGenerationSelection(
  id: number,
  selection: GenerationSelection,
): boolean {
  if (selection === "all") return true;
  const gen = generationForId(id);
  return gen !== null && selection.includes(gen);
}

/**
 * Validates and normalizes an untrusted modifiers payload from a client.
 * Throws GameError(400) on anything malformed so callers can surface it.
 */
export function validateModifiers(raw: unknown): GameModifiers {
  if (typeof raw !== "object" || raw === null) {
    throw new GameError(400, "Invalid modifiers payload");
  }
  const input = raw as Record<string, unknown>;

  return {
    generation: parseGeneration(input.generation),
    leaveTimer: parseEnum(input.leaveTimer, ["enable", "disable"], "leaveTimer"),
    playMode: parseEnum(input.playMode, ["structured", "freeplay"], "playMode"),
    guessingRule: parseEnum(
      input.guessingRule,
      ["classic", "final-showdown", "casual"],
      "guessingRule",
    ),
    opponentInteract: parseEnum(
      input.opponentInteract,
      ["yes", "no"],
      "opponentInteract",
    ),
    limitedTurns: parseLimitedTurns(input.limitedTurns),
    firstPlayer: parseEnum(
      input.firstPlayer,
      ["random", "player1", "player2"],
      "firstPlayer",
    ),
  };
}

/** Resolves who opens the match. Random is re-rolled each call (start/rematch). */
export function resolveStartingPlayer(firstPlayer: FirstPlayer): TurnPlayer {
  if (firstPlayer === "player1" || firstPlayer === "player2") return firstPlayer;
  return randomInt(0, 2) === 0 ? "player1" : "player2";
}

function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  throw new GameError(400, `Invalid ${field}`);
}

function parseGeneration(value: unknown): GenerationSelection {
  if (value === "all") return "all";
  if (!Array.isArray(value)) throw new GameError(400, "Invalid generation");

  const gens = new Set<number>();
  for (const entry of value) {
    if (
      typeof entry !== "number" ||
      !Number.isInteger(entry) ||
      !(GENERATION_NUMBERS as readonly number[]).includes(entry)
    ) {
      throw new GameError(400, "Invalid generation");
    }
    gens.add(entry);
  }

  // Empty or every-generation both collapse to "all".
  if (gens.size === 0 || gens.size === GENERATION_NUMBERS.length) return "all";
  return [...gens].sort((a, b) => a - b);
}

function parseLimitedTurns(value: unknown): GameModifiers["limitedTurns"] {
  if (value === "unlimited") return "unlimited";
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_LIMITED_TURNS &&
    value <= MAX_LIMITED_TURNS
  ) {
    return value;
  }
  throw new GameError(400, "Invalid limitedTurns");
}
