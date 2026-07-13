"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { createRoom } from "@/lib/game";
import { saveSession } from "@/lib/session";

export function CreateRoomForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const name = displayName.trim();
    if (!name) return;

    setLoading(true);
    setError(null);

    try {
      const { roomCode, playerToken } = await createRoom(name);
      saveSession({ roomCode, displayName: name, isHost: true, playerToken });
      router.push(`/room/${roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-md justify-center rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <LoadingSpinner label="Creating room..." />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <label className="grid gap-2 text-sm font-medium">
        Your name
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter your display name"
          maxLength={24}
          disabled={loading}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !displayName.trim()}
        className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50 disabled:hover:bg-red-600"
      >
        {loading ? "Creating…" : "Create Room"}
      </button>
    </form>
  );
}
