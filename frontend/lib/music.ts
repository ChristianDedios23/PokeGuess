import { getEffectiveVolume } from "@/lib/sounds";

// Lo-fi piano background tracks living in frontend/public/sounds/. These play
// on a shuffled, endlessly-looping playlist. Filenames are encoded per-segment
// so spaces / brackets / "#" survive as a valid URL path.
const TRACK_FILES = [
  "Lo-fi Piano Sample (#7) - prophet (128k).mp3",
  "Lo-fi Piano Sample [#9] - prophet (128k).mp3",
  "Lo-fi Piano Sample [#10] - prophet (128k).mp3",
  "Lo-fi Piano Sample [#11] - prophet (128k).mp3",
  "Lo-fi Piano Sample [#12] - prophet (128k).mp3",
  "Lo-fi Piano Sample [#13] - prophet (128k).mp3",
  "Lo-fi Piano Sample [#14] - prophet (128k).mp3",
  "Lo-fi Piano Sample [#15] - prophet (128k).mp3",
  "Lo-fi Piano Sample [#18] - prophet (128k).mp3",
  "Lo-fi Piano Sample [#19] - prophet (128k).mp3",
  "Lo-fi Piano Sample [#20] - prophet (128k).mp3",
  "Lo-fi Piano Sample [#21] - prophet (128k).mp3",
  "Lo-fi Piano Sample [#22] - prophet (128k).mp3",
  "Lo-fi Piano Sample [#23] - prophet (128k).mp3",
];

const TRACK_URLS = TRACK_FILES.map((file) => `/sounds/${encodeURIComponent(file)}`);

let audio: HTMLAudioElement | null = null;
let order: number[] = [];
let orderPos = 0;
let started = false;

/** Fisher–Yates shuffle of [0..n). */
function shuffledOrder(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Reshuffle, avoiding an immediate repeat of the track that just finished. */
function reshuffle(lastPlayed: number | null): void {
  order = shuffledOrder(TRACK_URLS.length);
  orderPos = 0;
  if (lastPlayed !== null && order.length > 1 && order[0] === lastPlayed) {
    [order[0], order[1]] = [order[1], order[0]];
  }
}

function currentVolume(): number {
  return getEffectiveVolume("music");
}

function loadAndPlayCurrent(): void {
  if (!audio) return;
  audio.src = TRACK_URLS[order[orderPos]];
  audio.volume = currentVolume();
  // Tier 1 = silent: stay loaded/paused so a later volume bump resumes instantly.
  if (audio.volume <= 0) {
    audio.pause();
    return;
  }
  void audio.play().catch(() => {
    // Autoplay may be blocked until the user interacts with the page.
  });
}

function handleEnded(): void {
  const justPlayed = order[orderPos] ?? null;
  orderPos += 1;
  if (orderPos >= order.length) {
    reshuffle(justPlayed);
  }
  loadAndPlayCurrent();
}

function ensureAudio(): void {
  if (audio || typeof window === "undefined") return;
  audio = new Audio();
  audio.preload = "none";
  audio.addEventListener("ended", handleEnded);
}

/**
 * Begin (or resume) shuffled background music. Must be triggered off a user
 * gesture the first time, per browser autoplay policy. Safe to call repeatedly.
 */
export function startMusic(): void {
  if (typeof window === "undefined") return;
  ensureAudio();
  if (!audio) return;

  if (!started) {
    started = true;
    reshuffle(null);
    loadAndPlayCurrent();
    return;
  }

  // Already started: just make sure it's audible/playing if not muted.
  refreshMusicVolume();
}

/** Stop playback and reset, e.g. when leaving the room. */
export function stopMusic(): void {
  started = false;
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
  }
}

/**
 * Re-read the "music" volume tier and apply it live. Pauses at tier 1 (off)
 * and resumes when raised back above it. Called when the player adjusts the
 * music volume so changes take effect immediately.
 */
export function refreshMusicVolume(): void {
  if (!audio) return;
  const volume = currentVolume();
  audio.volume = volume;

  if (volume <= 0) {
    audio.pause();
    return;
  }

  if (started && audio.paused) {
    if (!audio.src) loadAndPlayCurrent();
    else void audio.play().catch(() => {});
  }
}
