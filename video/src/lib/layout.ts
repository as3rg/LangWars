import { useVideoConfig } from "remotion";

export type Layout = {
  vertical: boolean;
  width: number;
  height: number;
  u: number;
  pad: number;
  gap: number;
};

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const u = vertical ? width / 1080 : (width / 1920) * 1.12;
  return {
    vertical,
    width,
    height,
    u,
    pad: vertical ? 68 : 96,
    gap: vertical ? 28 : 34,
  };
};
