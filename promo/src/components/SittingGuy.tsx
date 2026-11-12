import React from "react";
import { useCurrentFrame } from "remotion";

export type SittingMood = "coding" | "shock" | "smug" | "sad";

const SKIN = "#f2c49b";
const HAIR = "#241c17";
const HOODIE = "#1f6feb";
const HOODIE_DARK = "#1859c4";
const INK = "#151a21";

export const SittingGuy: React.FC<{
  mood: SittingMood;
  typing?: boolean;
  width?: number;
}> = ({ mood, typing = false, width = 480 }) => {
  const frame = useCurrentFrame();
  const bounce = typing ? Math.sin(frame * 0.85) * 3 : 0;
  const blink = frame % 96 < 5;

  return (
    <svg
      viewBox="0 0 460 470"
      width={width}
      height={(width * 470) / 460}
      style={{ overflow: "visible", display: "block" }}
    >
      <rect
        x="84"
        y="236"
        width="70"
        height="214"
        rx="32"
        fill="#1b232d"
        stroke="#2a3442"
        strokeWidth="2"
      />
      <rect x="96" y="252" width="46" height="178" rx="22" fill="#232c39" />
      <rect x="104" y="430" width="250" height="30" rx="14" fill="#1b232d" />
      <rect x="112" y="422" width="230" height="26" rx="12" fill="#232c39" />

      <path
        d="M150 444 C136 382 152 314 208 284 C236 270 268 274 286 296 C304 318 300 354 296 386 C292 414 300 432 306 448 Z"
        fill={HOODIE}
      />
      <path
        d="M208 284 C232 272 264 276 282 296 C276 301 256 294 238 298 C224 301 214 306 208 312 Z"
        fill={HOODIE_DARK}
      />

      <path d="M264 238 L290 238 L290 278 L264 278 Z" fill={SKIN} />
      <path
        d="M264 238 L290 238 L290 250 C282 254 270 254 264 250 Z"
        fill="rgba(0,0,0,0.12)"
      />

      <circle cx="286" cy="188" r="70" fill={SKIN} />
      <path
        d="M350 182 Q372 194 350 210 Q346 200 346 190 Z"
        fill={SKIN}
      />
      <circle cx="226" cy="192" r="13" fill={SKIN} />

      <path
        d="M286 116 C238 116 216 150 218 186 C219 202 224 212 230 220 C224 192 232 162 252 148 C276 131 318 132 340 152 C350 161 354 172 352 184 C362 154 338 116 286 116 Z"
        fill={HAIR}
      />

      <path
        d="M224 166 C228 112 344 110 352 164"
        fill="none"
        stroke="#0f141b"
        strokeWidth="17"
        strokeLinecap="round"
      />
      <circle
        cx="224"
        cy="192"
        r="24"
        fill="#11161f"
        stroke="#2b3644"
        strokeWidth="2"
      />
      <circle cx="224" cy="192" r="12" fill="#1b2430" />
      <circle cx="224" cy="192" r="4" fill="#58a6ff" opacity="0.7" />

      <ProfileFace mood={mood} blink={blink} />

      <path
        d="M278 306 C308 322 336 338 356 356"
        fill="none"
        stroke={HOODIE}
        strokeWidth="30"
        strokeLinecap="round"
      />
      <g style={{ translate: `0 ${bounce}px` }}>
        <path
          d="M356 356 C382 382 410 410 430 426"
          fill="none"
          stroke={HOODIE}
          strokeWidth="28"
          strokeLinecap="round"
        />
        <circle cx="430" cy="428" r="16" fill={SKIN} />
      </g>
    </svg>
  );
};

const ProfileFace: React.FC<{ mood: SittingMood; blink: boolean }> = ({
  mood,
  blink,
}) => {
  if (mood === "shock") {
    return (
      <>
        <path
          d="M316 152 L346 146"
          stroke={INK}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <ellipse cx="334" cy="178" rx="12" ry="14" fill="#ffffff" />
        <circle cx="334" cy="180" r="6" fill={INK} />
        <ellipse cx="340" cy="222" rx="12" ry="15" fill="#3a1410" />
        <path
          d="M248 138 C252 150 258 157 258 164 A10 10 0 0 1 238 164 C238 157 244 150 248 138 Z"
          fill="#58a6ff"
        />
      </>
    );
  }

  if (mood === "sad") {
    return (
      <>
        <path
          d="M318 176 L346 166"
          stroke={INK}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="334" cy="184" r="5" fill={INK} />
        <path
          d="M330 222 Q340 214 348 222"
          fill="none"
          stroke={INK}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </>
    );
  }

  if (mood === "smug") {
    return (
      <>
        <path
          d="M318 156 L346 150"
          stroke={INK}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M322 180 L346 180"
          stroke={INK}
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M330 214 Q342 224 350 210"
          fill="none"
          stroke={INK}
          strokeWidth="5"
          strokeLinecap="round"
        />
      </>
    );
  }

  return (
    <>
      <path
        d="M318 160 L346 158"
        stroke={INK}
        strokeWidth="6"
        strokeLinecap="round"
      />
      {blink ? (
        <path
          d="M328 180 L340 180"
          stroke={INK}
          strokeWidth="5"
          strokeLinecap="round"
        />
      ) : (
        <circle cx="334" cy="180" r="5" fill={INK} />
      )}
      <path
        d="M330 216 Q340 222 348 214"
        fill="none"
        stroke={INK}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </>
  );
};
