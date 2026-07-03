import { CreateRoomForm } from "@/components/CreateRoomForm";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center gap-8 p-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold">PokeGuess</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create a room, share the link, and play with a friend.
        </p>
      </header>
      <CreateRoomForm />
    </div>
  );
}
