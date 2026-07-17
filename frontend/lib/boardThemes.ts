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

const DEFAULT_PAGE_BG = { light: "#eef2ee", dark: "#101410" };

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

const SHARED_WALLPAPER_ACCENTS = [
  "#2f5233",
  "#4a5568",
  "#c4a35a",
  "#8b7355",
  "#6b6b6b",
  "#c45c2a",
  "#7eb8d8",
  "#4a4a5c",
  "#f0c878",
  "#3d8b9e",
  "#4a90a4",
  "#87ceeb",
  "#9ca3af",
  "#e53e3e",
  "#718096",
  "#a0aec0",
];

function boardPath(folder: string, fileName: string): string {
  return encodeURI(`/${folder}/${fileName}`);
}

function sharedWallpapers(
  collectionId: string,
  folder: string,
  filePrefix: string,
): BoardTheme[] {
  return SHARED_WALLPAPER_NAMES.map((label, index) => {
    const box = index + 1;
    return {
      id: `${collectionId}-box-${box}`,
      label,
      file: boardPath(folder, `${filePrefix} Box ${box}.png`),
      accent: SHARED_WALLPAPER_ACCENTS[index],
      pageBackground: DEFAULT_PAGE_BG,
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
    return {
      id: `${collectionId}-box-${box}`,
      label,
      file: boardPath(folder, `${filePrefix} Box ${box}.png`),
      accent: accents?.[index] ?? "#4a5568",
      pageBackground: DEFAULT_PAGE_BG,
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
  "#c04040",
  "#30b8d8",
  "#6b7280",
  "#7c3aed",
  "#f472b6",
  "#1f2937",
  "#4b5563",
  "#ec4899",
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
  "#6b7280",
  "#7c3aed",
  "#b45309",
  "#2563eb",
  "#111827",
  "#e5e7eb",
  "#c04040",
  "#30b8d8",
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
  "#312e81",
  "#65a30d",
  "#d97706",
  "#ef4444",
  "#0d9488",
  "#facc15",
  "#6366f1",
  "#7c3aed",
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
  "#4c1d95",
  "#db2777",
  "#d97706",
  "#7c2d12",
  "#0d9488",
  "#facc15",
  "#6366f1",
  "#7c3aed",
];

export const BOARD_COLLECTIONS: BoardCollection[] = [
  {
    id: "dp",
    label: "Diamond & Pearl",
    themes: [
      ...sharedWallpapers("dp", "DP Boards", "DP"),
      ...specialWallpapers("dp", "DP Boards", "DP", [...DP_SPECIAL], [...DP_SPECIAL_ACCENTS]),
    ],
  },
  {
    id: "platinum",
    label: "Platinum",
    themes: [
      ...sharedWallpapers("platinum", "Platinum Boards", "Platinum"),
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
      ...sharedWallpapers("bw", "BW Boards", "BW"),
      ...specialWallpapers("bw", "BW Boards", "BW", [...BW_SPECIAL], [...BW_SPECIAL_ACCENTS]),
    ],
  },
  {
    id: "bw2",
    label: "Black 2 & White 2",
    themes: [
      ...sharedWallpapers("bw2", "BW2 Boards", "BW2"),
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
