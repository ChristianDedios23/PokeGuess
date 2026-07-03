export interface PlayerSession {
  roomCode: string;
  displayName: string;
  isHost: boolean;
  connectionId?: string;
}

const SESSION_KEY = "pokeguess_session";

export function getSession(): PlayerSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerSession;
  } catch {
    return null;
  }
}

export function saveSession(session: PlayerSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function updateSessionConnectionId(connectionId: string): void {
  const session = getSession();
  if (!session) return;
  saveSession({ ...session, connectionId });
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function sessionMatchesRoom(roomCode: string): boolean {
  const session = getSession();
  return session?.roomCode === roomCode;
}
