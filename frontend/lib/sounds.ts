const CHAT_MESSAGE_SFX = "/sounds/chat-message.mp3";
const CHAT_MUTE_KEY = "pokeguess_chat_sound_muted";

let chatMessageAudio: HTMLAudioElement | null = null;

function getChatMessageAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!chatMessageAudio) {
    chatMessageAudio = new Audio(CHAT_MESSAGE_SFX);
    chatMessageAudio.preload = "auto";
    chatMessageAudio.volume = 0.55;
  }
  return chatMessageAudio;
}

export function isChatSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CHAT_MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setChatSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAT_MUTE_KEY, muted ? "1" : "0");
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

/** Play the opponent chat ping. Safe to call often; ignores autoplay blocks. */
export function playChatMessageSound(): void {
  if (isChatSoundMuted()) return;
  const audio = getChatMessageAudio();
  if (!audio) return;
  audio.currentTime = 0;
  void audio.play().catch(() => {
    // Browser may block until the user has interacted with the page.
  });
}
