"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const ROOM_CODE_LENGTH = 6;

export function JoinRoomForm() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) return;
    if (code.length !== ROOM_CODE_LENGTH) {
      setError(`Room codes are ${ROOM_CODE_LENGTH} characters long`);
      return;
    }

    setError(null);
    router.push(`/room/${code}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <label className="grid gap-2 text-sm font-medium">
        Room code
        <input
          value={roomCode}
          onChange={(e) => {
            setError(null);
            setRoomCode(e.target.value.toUpperCase());
          }}
          placeholder="ABC123"
          maxLength={ROOM_CODE_LENGTH}
          autoCapitalize="characters"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal tracking-[0.2em] uppercase transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={!roomCode.trim()}
        className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-semibold transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Join Room
      </button>
    </form>
  );
}
