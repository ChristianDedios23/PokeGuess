import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, "..", "public");

// Mirrors CONTENT_AREA in components/GuessBoard.tsx: the picture area of the
// 840x710 frame, excluding the top nav chrome and bottom bezel.
const REGION = { top: 0.215, bottom: 0.05, left: 0.06, right: 0.06 };

const COLLECTIONS = [
  { folder: "DP Boards", prefix: "DP", boxes: 24 },
  { folder: "Platinum Boards", prefix: "Platinum", boxes: 24 },
  { folder: "BW Boards", prefix: "BW", boxes: 24 },
  { folder: "BW2 Boards", prefix: "BW2", boxes: 24 },
];

function toHex([r, g, b]) {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

async function sampleAverageColor(filePath) {
  const img = sharp(filePath);
  const meta = await img.metadata();
  const width = meta.width ?? 840;
  const height = meta.height ?? 710;

  const left = Math.round(width * REGION.left);
  const top = Math.round(height * REGION.top);
  const right = Math.round(width * REGION.right);
  const bottom = Math.round(height * REGION.bottom);
  const cropWidth = width - left - right;
  const cropHeight = height - top - bottom;

  const { data, info } = await img
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .removeAlpha()
    .resize(24, 24, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let r = 0;
  let g = 0;
  let b = 0;
  const pixelCount = info.width * info.height;
  for (let i = 0; i < data.length; i += info.channels) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return toHex([r / pixelCount, g / pixelCount, b / pixelCount]);
}

const results = {};
for (const { folder, prefix, boxes } of COLLECTIONS) {
  results[folder] = {};
  for (let box = 1; box <= boxes; box++) {
    const filePath = path.join(PUBLIC, folder, `${prefix} Box ${box}.png`);
    try {
      results[folder][box] = await sampleAverageColor(filePath);
    } catch (err) {
      results[folder][box] = null;
      console.error(`Failed ${filePath}: ${err.message}`);
    }
  }
}

console.log(JSON.stringify(results, null, 2));
