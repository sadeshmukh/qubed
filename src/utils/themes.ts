export interface Theme {
  name: string;
  background: string;
  box: string;
  hexagon: string;
  particle: string;
  boundary: string;
  contactPoint: string;
  velocityVector: string;
  angularVector: string;
  trail: string;
  textureOpacity: number;
  objectPalette: string[];
}

export interface TextureOption {
  name: string;
  url: string;
}

export const TEXTURE_OPTIONS: Record<string, TextureOption> = {
  none: { name: "None", url: "" },
  grid: { name: "Grid", url: "" },
  dots: { name: "Dots", url: "" },
  fabric: { name: "Fabric", url: "" },
  worn_dots: {
    name: "Worn Dots",
    url: "/assets/textures/worn-dots.png",
  },
  concrete_wall: {
    name: "Concrete Wall",
    url: "/assets/textures/concrete-wall.png",
  },
  paper_fibers: {
    name: "Paper Fibers",
    url: "/assets/textures/paper-fibers.png",
  },
  subtle_grunge: {
    name: "Subtle Grunge",
    url: "/assets/textures/subtle-grunge.png",
  },
  white_wall: {
    name: "White Wall",
    url: "/assets/textures/white-wall.png",
  },
  textured_paper: {
    name: "Textured Paper",
    url: "/assets/textures/textured-paper.png",
  },
};

export const THEMES: Record<string, Theme> = {
  default: {
    name: "Default",
    background: "#0a0a0f",
    box: "#3b82f6",
    hexagon: "#f59e0b",
    particle: "#ef4444",
    boundary: "#374151",
    contactPoint: "#fbbf24",
    velocityVector: "#10b981",
    angularVector: "#f472b6",
    trail: "#ffffff",
    textureOpacity: 0.1,
    objectPalette: [
      "#3b82f6", // blue
      "#f59e0b", // amber
      "#ef4444", // red
      "#10b981", // emerald
      "#f472b6", // pink
      "#8b5cf6", // violet
      "#06b6d4", // cyan
      "#f97316", // orange
      "#84cc16", // lime
      "#ec4899", // fuchsia
      "#6366f1", // indigo
      "#14b8a6", // teal
    ],
  },
  neon: {
    name: "Neon",
    background: "#0a0a0a",
    box: "#00ffff",
    hexagon: "#ff00ff",
    particle: "#ffff00",
    boundary: "#333333",
    contactPoint: "#00ff00",
    velocityVector: "#ff8000",
    angularVector: "#8000ff",
    trail: "#00ffff",
    textureOpacity: 0.2,
    objectPalette: [
      "#00ffff", // cyan
      "#ff00ff", // magenta
      "#ffff00", // yellow
      "#00ff80", // spring green
      "#ff8000", // orange
      "#8000ff", // purple
      "#ff0080", // hot pink
      "#80ff00", // chartreuse
      "#0080ff", // dodger blue
      "#ff8080", // light coral
      "#80ff80", // light green
      "#8080ff", // light blue
    ],
  },
  sunset: {
    name: "Sunset",
    background: "#1a0f0a",
    box: "#ff6b35",
    hexagon: "#f7931e",
    particle: "#ffd23f",
    boundary: "#c1272d",
    contactPoint: "#ffad3b",
    velocityVector: "#ff8c69",
    angularVector: "#ff69b4",
    trail: "#ff8c69",
    textureOpacity: 0.15,
    objectPalette: [
      "#ff6b35", // orange red
      "#f7931e", // orange
      "#ffd23f", // gold
      "#ff8c69", // salmon
      "#ff69b4", // hot pink
      "#ffb347", // peach
      "#ff7f50", // coral
      "#ffa500", // orange
      "#ff6347", // tomato
      "#ffcccb", // light pink
      "#ffd700", // gold
      "#ff4500", // red orange
    ],
  },
  minimal: {
    name: "Minimal",
    background: "#fafafa",
    box: "#2d3748",
    hexagon: "#4a5568",
    particle: "#718096",
    boundary: "#1a202c",
    contactPoint: "#a0aec0",
    velocityVector: "#4a5568",
    angularVector: "#718096",
    trail: "#2d3748",
    textureOpacity: 0.4,
    objectPalette: [
      "#1a202c", // gray 900
      "#2d3748", // gray 800
      "#4a5568", // gray 600
      "#718096", // gray 500
      "#a0aec0", // gray 400
      "#cbd5e0", // gray 300
      "#e2e8f0", // gray 200
      "#374151", // neutral 700
      "#6b7280", // neutral 500
      "#9ca3af", // neutral 400
      "#d1d5db", // neutral 300
      "#525a67", // custom gray
    ],
  },
  "ayu-light": {
    name: "Ayu Light",
    background: "#fafafa",
    box: "#fa8d3e",
    hexagon: "#399ee6",
    particle: "#86b300",
    boundary: "#8a9199",
    contactPoint: "#f07178",
    velocityVector: "#4cbf99",
    angularVector: "#a37acc",
    trail: "#5c6166",
    textureOpacity: 0.3,
    objectPalette: [
      "#fa8d3e", // orange
      "#399ee6", // blue
      "#86b300", // green
      "#f07178", // red
      "#4cbf99", // teal
      "#a37acc", // purple
      "#e6ba7e", // yellow
      "#55b4d4", // cyan
      "#f29668", // light orange
      "#95e6cb", // mint
      "#d4bfff", // lavender
      "#ffb454", // amber
    ],
  },
  "ayu-dark": {
    name: "Ayu Dark",
    background: "#0f1419",
    box: "#ffb454",
    hexagon: "#59c2ff",
    particle: "#aad94c",
    boundary: "#39424e",
    contactPoint: "#f29668",
    velocityVector: "#95e6cb",
    angularVector: "#d4bfff",
    trail: "#bfbdb6",
    textureOpacity: 0.2,
    objectPalette: [
      "#ffb454", // orange
      "#59c2ff", // blue
      "#aad94c", // green
      "#f29668", // coral
      "#95e6cb", // mint
      "#d4bfff", // lavender
      "#e6b450", // yellow
      "#73d0ff", // cyan
      "#ff8f40", // red orange
      "#c2d94c", // lime
      "#b8cc52", // olive
      "#ffd173", // gold
    ],
  },
  "solarized-light": {
    name: "Solarized Light",
    background: "#fdf6e3",
    box: "#268bd2",
    hexagon: "#2aa198",
    particle: "#859900",
    boundary: "#93a1a1",
    contactPoint: "#dc322f",
    velocityVector: "#b58900",
    angularVector: "#6c71c4",
    trail: "#586e75",
    textureOpacity: 0.4,
    objectPalette: [
      "#268bd2", // blue
      "#2aa198", // cyan
      "#859900", // green
      "#dc322f", // red
      "#b58900", // yellow
      "#6c71c4", // violet
      "#d33682", // magenta
      "#cb4b16", // orange
      "#719e07", // base green
      "#586e75", // base01
      "#657b83", // base00
      "#839496", // base0
    ],
  },
  "solarized-dark": {
    name: "Solarized Dark",
    background: "#002b36",
    box: "#268bd2",
    hexagon: "#2aa198",
    particle: "#859900",
    boundary: "#586e75",
    contactPoint: "#dc322f",
    velocityVector: "#b58900",
    angularVector: "#6c71c4",
    trail: "#93a1a1",
    textureOpacity: 0.3,
    objectPalette: [
      "#268bd2", // blue
      "#2aa198", // cyan
      "#859900", // green
      "#dc322f", // red
      "#b58900", // yellow
      "#6c71c4", // violet
      "#d33682", // magenta
      "#cb4b16", // orange
      "#719e07", // base green
      "#93a1a1", // base1
      "#839496", // base0
      "#657b83", // base00
    ],
  },
};

export function getTheme(themeName: string): Theme {
  return THEMES[themeName] || THEMES.default;
}

export function getTextureColor(theme: Theme): string {
  const bg = theme.background;
  if (bg.startsWith("#")) {
    const hex = bg.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    // invert colors
    const invR = 255 - r;
    const invG = 255 - g;
    const invB = 255 - b;

    return `rgb(${invR}, ${invG}, ${invB})`;
  }
  return "#000000";
}
