export interface BoardTheme {
  id: string;
  label: string;
  file: string;
  accent: string;
  pageBackground: {
    light: string;
    dark: string;
  };
}

export interface BoardCollection {
  id: string;
  label: string;
  themes: BoardTheme[];
}

// Derives a subtle page-background pair from a theme's accent color so the
// page tint actually shifts with the selected board instead of staying flat.
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const value = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = parseInt(value, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function mix(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [tr, tg, tb] = target;
  const mixed = [
    Math.round(r + (tr - r) * amount),
    Math.round(g + (tg - g) * amount),
    Math.round(b + (tb - b) * amount),
  ];
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function pageBackgroundForAccent(accent: string): { light: string; dark: string } {
  return {
    light: mix(accent, [255, 255, 255], 0.88),
    dark: mix(accent, [10, 10, 12], 0.82),
  };
}

// Shared Scenery + Misc wallpapers (boxes 1–16) used across Gen IV and Gen V.
// Names from Bulbapedia: https://bulbapedia.bulbagarden.net/wiki/Wallpaper#Generation_IV
const SHARED_WALLPAPER_NAMES = [
  "Forest",
  "City",
  "Desert",
  "Savanna",
  "Crag",
  "Volcano",
  "Snow",
  "Cave",
  "Beach",
  "Seafloor",
  "River",
  "Sky",
  "Checks",
  "PokéCenter",
  "Machine",
  "Simple",
] as const;

// Accents below are sampled directly from each board image's picture area
// (scripts/sample-board-accents.mjs), not hand-guessed — several names are
// reused across generations (e.g. "Machine", "Simple", "Trio") but the art
// underneath differs per game, so each collection gets its own real values
// instead of sharing one array by label.
const DP_SHARED_ACCENTS = [
  "#89c881",
  "#b7b7b7",
  "#d2ca84",
  "#b8b062",
  "#bca2d9",
  "#e5927e",
  "#d3e6f0",
  "#c4b2a2",
  "#e7cca7",
  "#5b7bdb",
  "#83e2e8",
  "#aadef0",
  "#f697e3",
  "#f8d297",
  "#b2c2b5",
  "#dbf4b6",
];

const PLATINUM_SHARED_ACCENTS = [...DP_SHARED_ACCENTS];

const BW_SHARED_ACCENTS = [
  "#89c881",
  "#b7b7b7",
  "#d2ca84",
  "#b8b062",
  "#bca2d9",
  "#e5927e",
  "#d3e6f0",
  "#c4b2a2",
  "#e7cda7",
  "#5b7bdb",
  "#84e2e9",
  "#a9def0",
  "#87d8f6",
  "#cad2da",
  "#d64950",
  "#e4ecf4",
];

const BW2_SHARED_ACCENTS = [...BW_SHARED_ACCENTS];

function boardPath(folder: string, fileName: string): string {
  return encodeURI(`/${folder}/${fileName}`);
}

function sharedWallpapers(
  collectionId: string,
  folder: string,
  filePrefix: string,
  accents: string[],
): BoardTheme[] {
  return SHARED_WALLPAPER_NAMES.map((label, index) => {
    const box = index + 1;
    const accent = accents[index];
    return {
      id: `${collectionId}-box-${box}`,
      label,
      file: boardPath(folder, `${filePrefix} Box ${box}.png`),
      accent,
      pageBackground: pageBackgroundForAccent(accent),
    };
  });
}

function specialWallpapers(
  collectionId: string,
  folder: string,
  filePrefix: string,
  labels: string[],
  accents?: string[],
  startBox = 17,
): BoardTheme[] {
  return labels.map((label, index) => {
    const box = startBox + index;
    const accent = accents?.[index] ?? "#4a5568";
    return {
      id: `${collectionId}-box-${box}`,
      label,
      file: boardPath(folder, `${filePrefix} Box ${box}.png`),
      accent,
      pageBackground: pageBackgroundForAccent(accent),
    };
  });
}

const BW_SPECIAL = [
  "Reshiram",
  "Zekrom",
  "Monochrome",
  "Team Plasma",
  "Munna",
  "Zoroark",
  "Subway",
  "Musical",
] as const;

const BW_SPECIAL_ACCENTS = [
  "#ececec",
  "#444444",
  "#a0a0a0",
  "#55689c",
  "#f4d0ed",
  "#763e43",
  "#bec1ad",
  "#8f3959",
];

const BW2_SPECIAL = [
  "Monochrome",
  "Team Plasma",
  "Movie",
  "PWT",
  "Black Kyurem",
  "White Kyurem",
  "Reshiram",
  "Zekrom",
] as const;

const BW2_SPECIAL_ACCENTS = [
  "#878787",
  "#8d9694",
  "#e4e0ba",
  "#b0aeba",
  "#434b52",
  "#bfbdbb",
  "#dca498",
  "#095b70",
];

const DP_SPECIAL = [
  "Space",
  "Backyard",
  "Nostalgic",
  "Torchic",
  "Trio",
  "PikaPika",
  "Legend",
  "Team Galactic",
] as const;

const DP_SPECIAL_ACCENTS = [
  "#6b6d96",
  "#97c492",
  "#b6c9aa",
  "#f3b379",
  "#ed95dc",
  "#e0cc77",
  "#9962e2",
  "#8bb5d8",
];

const PLATINUM_SPECIAL = [
  "Distortion",
  "Contest",
  "Nostalgic",
  "Croagunk",
  "Trio",
  "PikaPika",
  "Legend",
  "Team Galactic",
] as const;

const PLATINUM_SPECIAL_ACCENTS = [
  "#5761b9",
  "#c4af9b",
  "#cda6a8",
  "#9798c7",
  "#a5d5a9",
  "#e2ca78",
  "#704649",
  "#67849b",
];

export const BOARD_COLLECTIONS: BoardCollection[] = [
  {
    id: "dp",
    label: "Diamond & Pearl",
    themes: [
      ...sharedWallpapers("dp", "DP Boards", "DP", DP_SHARED_ACCENTS),
      ...specialWallpapers("dp", "DP Boards", "DP", [...DP_SPECIAL], [...DP_SPECIAL_ACCENTS]),
    ],
  },
  {
    id: "platinum",
    label: "Platinum",
    themes: [
      ...sharedWallpapers("platinum", "Platinum Boards", "Platinum", PLATINUM_SHARED_ACCENTS),
      ...specialWallpapers(
        "platinum",
        "Platinum Boards",
        "Platinum",
        [...PLATINUM_SPECIAL],
        [...PLATINUM_SPECIAL_ACCENTS],
      ),
    ],
  },
  {
    id: "bw",
    label: "Black & White",
    themes: [
      ...sharedWallpapers("bw", "BW Boards", "BW", BW_SHARED_ACCENTS),
      ...specialWallpapers("bw", "BW Boards", "BW", [...BW_SPECIAL], [...BW_SPECIAL_ACCENTS]),
    ],
  },
  {
    id: "bw2",
    label: "Black 2 & White 2",
    themes: [
      ...sharedWallpapers("bw2", "BW2 Boards", "BW2", BW2_SHARED_ACCENTS),
      ...specialWallpapers("bw2", "BW2 Boards", "BW2", [...BW2_SPECIAL], [...BW2_SPECIAL_ACCENTS]),
    ],
  },
];

export const BOARD_THEMES: BoardTheme[] = BOARD_COLLECTIONS.flatMap(
  (collection) => collection.themes,
);

export function getCollectionForTheme(themeId: string): BoardCollection | undefined {
  return BOARD_COLLECTIONS.find((collection) =>
    collection.themes.some((theme) => theme.id === themeId),
  );
}
