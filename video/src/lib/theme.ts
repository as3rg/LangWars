export const COLORS = {
  bg0: "#050510",
  bg1: "#0a0a1a",
  bg2: "#101028",
  bg3: "#151534",
  line: "#232347",
  lineSoft: "#1a1a38",
  cyan: "#0ff1ca",
  cyanDim: "#0aa88f",
  magenta: "#ff2e88",
  violet: "#8a5cf6",
  amber: "#ffcf5c",
  text: "#e8e8ff",
  muted: "#8f8fb8",
  dim: "#5f5f86",
};

export const FONTS = {
  mono: "LWMono",
  display: "LWDisplay",
  pixel: "LWPixel",
};

export const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const glow = (color: string, amount = 1) =>
  `0 0 ${18 * amount}px ${color}66, 0 0 ${48 * amount}px ${color}33`;
