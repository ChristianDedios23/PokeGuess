const CHAT_MESSAGE_SFX = "/sounds/chat-message.mp3";
const TURN_PING_SFX = "/sounds/turn-ping.mp3";
const BUTTON_CLICK_SFX = "/sounds/button-click.mp3";
const CHAT_MUTE_KEY = "pokeguess_chat_sound_muted";

export type SoundCategory = "turn" | "button" | "chat" | "music";

export const MIN_VOLUME_TIER = 1;
export const MAX_VOLUME_TIER = 5;
const DEFAULT_VOLUME_TIER = MAX_VOLUME_TIER;

/**
 * "Normal" volume for each category — what tier 5 plays at. Lower tiers scale
 * this down linearly, and tier 1 mutes the category entirely.
 */
const BASE_VOLUME: Record<SoundCategory, number> = {
  turn: 0.15,
  button: 0.05,
  chat: 0.20,
  music: 0.15,
};

const VOLUME_TIER_KEY: Record<SoundCategory, string> = {
  turn: "pokeguess_volume_turn",
  button: "pokeguess_volume_button",
  chat: "pokeguess_volume_chat",
  music: "pokeguess_volume_music",
};

let chatMessageAudio: HTMLAudioElement | null = null;
let turnPingAudio: HTMLAudioElement | null = null;
let buttonClickAudio: HTMLAudioElement | null = null;

function getChatMessageAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!chatMessageAudio) {
    chatMessageAudio = new Audio(CHAT_MESSAGE_SFX);
    chatMessageAudio.preload = "auto";
  }
  return chatMessageAudio;
}

function getTurnPingAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!turnPingAudio) {
    turnPingAudio = new Audio(TURN_PING_SFX);
    turnPingAudio.preload = "auto";
  }
  return turnPingAudio;
}

function getButtonClickAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!buttonClickAudio) {
    buttonClickAudio = new Audio(BUTTON_CLICK_SFX);
    buttonClickAudio.preload = "auto";
  }
  return buttonClickAudio;
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

function clampTier(tier: number): number {
  if (!Number.isFinite(tier)) return DEFAULT_VOLUME_TIER;
  return Math.min(MAX_VOLUME_TIER, Math.max(MIN_VOLUME_TIER, Math.round(tier)));
}

/** Current volume tier (1–5) for a category. Defaults to 5 ("normal"). */
export function getVolumeTier(category: SoundCategory): number {
  if (typeof window === "undefined") return DEFAULT_VOLUME_TIER;
  try {
    const raw = window.localStorage.getItem(VOLUME_TIER_KEY[category]);
    if (raw === null) return DEFAULT_VOLUME_TIER;
    return clampTier(Number(raw));
  } catch {
    return DEFAULT_VOLUME_TIER;
  }
}

export function setVolumeTier(category: SoundCategory, tier: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VOLUME_TIER_KEY[category], String(clampTier(tier)));
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

/** Maps a category's stored tier to an actual audio volume (0–base). */
export function getEffectiveVolume(category: SoundCategory): number {
  const tier = getVolumeTier(category);
  return (BASE_VOLUME[category] * (tier - MIN_VOLUME_TIER)) / (MAX_VOLUME_TIER - MIN_VOLUME_TIER);
}

function play(category: SoundCategory, audio: HTMLAudioElement | null): void {
  if (!audio) return;
  const volume = getEffectiveVolume(category);
  if (volume <= 0) return;
  audio.volume = volume;
  audio.currentTime = 0;
  void audio.play().catch(() => {
    // Browser may block until the user has interacted with the page.
  });
}

/** Play the opponent chat ping. Safe to call often; ignores autoplay blocks. */
export function playChatMessageSound(): void {
  if (isChatSoundMuted()) return;
  play("chat", getChatMessageAudio());
}

/** Play the "it's your turn" ping. */
export function playTurnPingSound(): void {
  play("turn", getTurnPingAudio());
}

/** Play the UI button-click sound. */
export function playButtonClickSound(): void {
  play("button", getButtonClickAudio());
}
