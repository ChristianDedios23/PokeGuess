import { CreateRoomForm } from "@/components/CreateRoomForm";
import { JoinRoomForm } from "@/components/JoinRoomForm";
import { PokeballIcon } from "@/components/PokeballIcon";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-8 p-6">
      <header className="space-y-3 text-center">
        <PokeballIcon className="mx-auto h-12 w-12 drop-shadow-sm" />
        <h1 className="text-3xl font-bold tracking-tight">PokeGuess</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create a room, share the link, and guess your opponent&apos;s Pokémon before they guess
          yours.
        </p>
      </header>
      <CreateRoomForm />

      <div className="mx-auto flex w-full max-w-md items-center gap-3 text-xs font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-600">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        or
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <JoinRoomForm />
    </div>
  );
}
