import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const load = (
  family: string,
  file: string,
  weight: string,
  style: "normal" | "italic" = "normal",
) =>
  loadFont({
    family,
    url: staticFile(`fonts/${file}`),
    weight,
    style,
    format: "woff2",
  });

let started = false;

export const ensureFonts = () => {
  if (started) {
    return;
  }
  started = true;
  void Promise.all([
    load("LWMono", "jetbrains-mono-latin-wght-normal.woff2", "100 900"),
    load("LWMono", "jetbrains-mono-cyrillic-wght-normal.woff2", "100 900"),
    load("LWMono", "jetbrains-mono-latin-wght-italic.woff2", "100 900", "italic"),
    load("LWDisplay", "space-grotesk-latin-wght-normal.woff2", "300 700"),
    load("LWPixel", "press-start-2p-latin-400-normal.woff2", "400"),
    load("LWPixel", "press-start-2p-cyrillic-400-normal.woff2", "400"),
  ]);
};
