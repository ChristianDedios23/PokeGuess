"use client";

import { useEffect, useState } from "react";

// PokéAPI's default sprites place each Pokémon on a fixed canvas, but small
// creatures (Diglett, Joltik, Magnemite, ...) are drawn occupying only a
// fraction of it. Measuring the actual non-transparent bounding box lets us
// zoom each sprite so it fills a consistent visual footprint on the board,
// instead of tiny Pokémon looking lost inside their circle.
const MAX_SCALE = 2;
const ALPHA_THRESHOLD = 16;
// Trims the computed zoom down a bit so upscaled sprites have some breathing
// room inside their circle instead of touching/spilling past the edge.
const SCALE_ADJUSTMENT = 0.7;

// Manual per-Pokémon fine-tuning, applied on top of the automatic
// bounding-box scale above. Use this when a specific Pokémon still looks
// too small/large after the automatic measurement (e.g. its sprite has a
// lot of transparent padding that isn't purely "empty space", like tails
// or flying poses). Values are multipliers: 1 = no change, 1.15 = 15%
// bigger, 0.9 = 10% smaller. Keyed by Pokédex id.
const MANUAL_SCALE_OVERRIDES: Record<number, number> = {
  973: 0.80, // Flamigo
  528: 0.85, // Swoobat
  282: 1.25, // Gardevoir
  281: 0.90, // Kirlia
  948: 0.70, // Toedscool
  707: 0.95, // Klefki
  950: 0.80, // Klawf
  586: 0.90, // Sawsbuck
  542: 0.90, // Leavanny
  169: 0.90, // Crobat
  847: 0.75, // Barraskewda
  698: 0.90, // Amaura
  193: 0.85, // Yanma
  512: 1.20, // Simisage
};

// Manual position nudges for sprites whose art sits off-center in the PNG
// (e.g. Bramblin's tumbleweed is drawn low on the canvas). Values are
// percentages of the sprite element's size: negative y = shift up.
const MANUAL_OFFSET_OVERRIDES: Record<number, { x?: number; y?: number }> = {
  946: { y: -28 }, // Bramblin
  169: { y: 10 }, // Crobat
};

export interface SpriteTransform {
  scale: number;
  /** Horizontal nudge as a % of the sprite element width. */
  offsetX: number;
  /** Vertical nudge as a % of the sprite element height. Negative = up. */
  offsetY: number;
}

const scaleCache = new Map<string, number>();
const pendingScans = new Map<string, Promise<number>>();

function scanSpriteScale(url: string): Promise<number> {
  const cached = scaleCache.get(url);
  if (cached !== undefined) return Promise.resolve(cached);

  const pending = pendingScans.get(url);
  if (pending) return pending;

  const promise = new Promise<number>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      resolve(measureBoundingBoxScale(image));
    };
    image.onerror = () => resolve(1);
    image.src = url;
  }).then((scale) => {
    scaleCache.set(url, scale);
    pendingScans.delete(url);
    return scale;
  });

  pendingScans.set(url, promise);
  return promise;
}

function measureBoundingBoxScale(image: HTMLImageElement): number {
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) return 1;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 1;

    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, width, height);

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > ALPHA_THRESHOLD) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return 1;

    const contentWidth = maxX - minX + 1;
    const contentHeight = maxY - minY + 1;
    const rawScale = Math.max(width / contentWidth, height / contentHeight) * SCALE_ADJUSTMENT;
    return Math.min(MAX_SCALE, Math.max(1, rawScale));
  } catch {
    // Canvas reads can throw if the image ends up tainted (e.g. blocked
    // CORS response); fall back to the untouched sprite in that case.
    return 1;
  }
}

/** Builds a CSS transform that applies scale + optional position nudge. */
export function spriteTransformStyle(
  { scale, offsetX, offsetY }: SpriteTransform,
  scaleMultiplier = 1,
): { transform: string } {
  const finalScale = scale * scaleMultiplier;
  if (offsetX === 0 && offsetY === 0) {
    return { transform: `scale(${finalScale})` };
  }
  return {
    transform: `translate(${offsetX}%, ${offsetY}%) scale(${finalScale})`,
  };
}

export function useSpriteScale(
  url: string | null | undefined,
  pokemonId?: number | null,
): SpriteTransform {
  const scaleOverride =
    pokemonId != null ? MANUAL_SCALE_OVERRIDES[pokemonId] ?? 1 : 1;
  const offset =
    pokemonId != null ? MANUAL_OFFSET_OVERRIDES[pokemonId] : undefined;
  const offsetX = offset?.x ?? 0;
  const offsetY = offset?.y ?? 0;

  const [scale, setScale] = useState(() => (url ? scaleCache.get(url) ?? 1 : 1));

  useEffect(() => {
    if (!url) {
      setScale(1);
      return;
    }

    const cached = scaleCache.get(url);
    if (cached !== undefined) {
      setScale(cached);
      return;
    }

    let cancelled = false;
    setScale(1);
    scanSpriteScale(url).then((value) => {
      if (!cancelled) setScale(value);
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return {
    scale: scale * scaleOverride,
    offsetX,
    offsetY,
  };
}
