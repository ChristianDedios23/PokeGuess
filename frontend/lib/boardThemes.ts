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

// High-res PC box frames (840x710) live under frontend/public/boards/bw/
export const BOARD_COLLECTIONS: BoardCollection[] = [
  {
    id: "bw",
    label: "Black & White",
    themes: [
      {
        id: "bw-meadow",
        label: "Meadow",
        file: "/boards/bw/box-1.png",
        accent: "#2f5233",
        pageBackground: { light: "#eaf6df", dark: "#0f1710" },
      },
      {
        id: "bw-reshiram",
        label: "Reshiram",
        file: "/boards/bw/box-17.png",
        accent: "#c04040",
        pageBackground: { light: "#f7f0f0", dark: "#1a1212" },
      },
      {
        id: "bw-zekrom",
        label: "Zekrom",
        file: "/boards/bw/box-18.png",
        accent: "#30b8d8",
        pageBackground: { light: "#e8f4f8", dark: "#0b1218" },
      },
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
