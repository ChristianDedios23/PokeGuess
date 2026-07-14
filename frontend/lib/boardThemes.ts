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

// Board art lives at frontend/public/board{1,2,3}.png — each is a full PC-box
// frame (bezel, nav arrows, title bar, wallpaper) baked into one 176x165 image.
export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "meadow",
    label: "Pichu Meadow",
    file: "/board1.png",
    accent: "#2f5233",
    pageBackground: { light: "#eaf6df", dark: "#0f1710" },
  },
  {
    id: "tide",
    label: "Tide Pool",
    file: "/board2.png",
    accent: "#1c3f66",
    pageBackground: { light: "#e3f3f8", dark: "#0b161e" },
  },
  {
    id: "sunset",
    label: "Sunset Sky",
    file: "/board3.png",
    accent: "#7a3b12",
    pageBackground: { light: "#fef0e2", dark: "#1c130f" },
  },
];
