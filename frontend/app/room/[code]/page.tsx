import { RoomPageClient } from "@/components/RoomPageClient";

interface RoomPageProps {
  params: Promise<{ code: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params;
  return <RoomPageClient roomCode={code.toUpperCase()} />;
}
