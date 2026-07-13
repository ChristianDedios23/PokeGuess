import { CreateRoomForm } from "@/components/CreateRoomForm";
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
    </div>
  );
}
