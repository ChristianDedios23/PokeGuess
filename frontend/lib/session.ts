import { deleteCookie, getCookie, setCookie } from "./cookies";

export interface PlayerSession {
  roomCode: string;
  displayName: string;
  isHost: boolean;
  playerToken: string;
  connectionId?: string;
}

// Rooms expire on the server 1 hour after creation — keep the cookie around a
// little longer than that so it never disappears while the room is still live.
const SESSION_TTL_SECONDS = 60 * 60 * 2;

function cookieName(roomCode: string): string {
  return `pokeguess_session_${roomCode.toUpperCase()}`;
}

export function getSession(roomCode: string): PlayerSession | null {
  const raw = getCookie(cookieName(roomCode));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PlayerSession;
    if (!parsed.playerToken || !parsed.roomCode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: PlayerSession): void {
  setCookie(cookieName(session.roomCode), JSON.stringify(session), SESSION_TTL_SECONDS);
}

export function updateSessionConnectionId(roomCode: string, connectionId: string): void {
  const session = getSession(roomCode);
  if (!session) return;
  saveSession({ ...session, connectionId });
}

export function clearSession(roomCode: string): void {
  deleteCookie(cookieName(roomCode));
}
