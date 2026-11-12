import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

type JunkKind =
  | "bike"
  | "crutch"
  | "trash"
  | "bag"
  | "keyboard"
  | "cable"
  | "cone"
  | "floppy"
  | "wrench"
  | "tape"
  | "tire"
  | "bucket"
  | "plunger"
  | "note";

type JunkItem = {
  readonly kind: JunkKind;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly rotate: number;
};

const items: JunkItem[] = [
  { kind: "bike", x: 132, y: 138, w: 186, h: 122, rotate: -22 },
  { kind: "bike", x: 432, y: 406, w: 160, h: 106, rotate: 26 },
  { kind: "bike", x: 280, y: 332, w: 132, h: 88, rotate: 8 },
  { kind: "crutch", x: 388, y: 86, w: 92, h: 194, rotate: 24 },
  { kind: "crutch", x: 136, y: 370, w: 92, h: 188, rotate: -34 },
  { kind: "crutch", x: 556, y: 346, w: 80, h: 168, rotate: -18 },
  { kind: "trash", x: 576, y: 210, w: 90, h: 124, rotate: 14 },
  { kind: "trash", x: 94, y: 526, w: 82, h: 112, rotate: -8 },
  { kind: "bag", x: 218, y: 514, w: 110, h: 138, rotate: 20 },
  { kind: "bag", x: 524, y: 276, w: 92, h: 116, rotate: 32 },
  { kind: "keyboard", x: 468, y: 552, w: 160, h: 78, rotate: -16 },
  { kind: "keyboard", x: 122, y: 276, w: 140, h: 68, rotate: 12 },
  { kind: "cable", x: 76, y: 206, w: 128, h: 128, rotate: 38 },
  { kind: "cable", x: 422, y: 180, w: 112, h: 112, rotate: -24 },
  { kind: "cone", x: 552, y: 456, w: 94, h: 124, rotate: -10 },
  { kind: "cone", x: 366, y: 540, w: 92, h: 120, rotate: 16 },
  { kind: "floppy", x: 258, y: 218, w: 102, h: 102, rotate: 16 },
  { kind: "floppy", x: 596, y: 558, w: 88, h: 88, rotate: -8 },
  { kind: "wrench", x: 514, y: 82, w: 132, h: 114, rotate: 42 },
  { kind: "wrench", x: 156, y: 456, w: 120, h: 104, rotate: 58 },
  { kind: "tape", x: 260, y: 78, w: 112, h: 88, rotate: -12 },
  { kind: "tape", x: 398, y: 260, w: 104, h: 82, rotate: -28 },
  { kind: "tire", x: 100, y: 106, w: 122, h: 122, rotate: 16 },
  { kind: "bucket", x: 334, y: 442, w: 100, h: 112, rotate: -12 },
  { kind: "plunger", x: 560, y: 528, w: 82, h: 152, rotate: 24 },
  { kind: "note", x: 214, y: 302, w: 116, h: 94, rotate: -8 },
  { kind: "bike", x: 168, y: 528, w: 148, h: 100, rotate: 34 },
  { kind: "crutch", x: 296, y: 132, w: 76, h: 158, rotate: -14 },
  { kind: "trash", x: 430, y: 476, w: 78, h: 108, rotate: 20 },
  { kind: "bag", x: 430, y: 72, w: 88, h: 110, rotate: -30 },
  { kind: "keyboard", x: 560, y: 430, w: 136, h: 66, rotate: 30 },
  { kind: "cable", x: 170, y: 360, w: 100, h: 100, rotate: -42 },
  { kind: "cone", x: 250, y: 470, w: 78, h: 104, rotate: 8 },
  { kind: "floppy", x: 500, y: 340, w: 80, h: 80, rotate: -20 },
  { kind: "wrench", x: 350, y: 350, w: 110, h: 96, rotate: -52 },
  { kind: "tape", x: 130, y: 150, w: 90, h: 72, rotate: 10 },
  { kind: "plunger", x: 330, y: 540, w: 70, h: 130, rotate: -22 },
  { kind: "note", x: 600, y: 610, w: 100, h: 80, rotate: 14 },
];

const debris = [
  { x: 168, y: 250, size: 10, color: COLORS.amber, radius: "50%" },
  { x: 486, y: 138, size: 8, color: COLORS.green, radius: "2px" },
  { x: 636, y: 318, size: 12, color: COLORS.blue, radius: "50%" },
  { x: 88, y: 330, size: 9, color: COLORS.red, radius: "2px" },
  { x: 314, y: 596, size: 11, color: COLORS.amber, radius: "50%" },
  { x: 530, y: 616, size: 8, color: COLORS.green, radius: "2px" },
  { x: 250, y: 154, size: 7, color: COLORS.blue, radius: "50%" },
  { x: 660, y: 470, size: 10, color: COLORS.red, radius: "2px" },
  { x: 68, y: 220, size: 8, color: COLORS.amber, radius: "50%" },
  { x: 430, y: 352, size: 7, color: COLORS.green, radius: "2px" },
  { x: 190, y: 180, size: 6, color: COLORS.green, radius: "50%" },
  { x: 420, y: 230, size: 9, color: COLORS.amber, radius: "2px" },
  { x: 580, y: 240, size: 7, color: COLORS.blue, radius: "50%" },
  { x: 340, y: 300, size: 10, color: COLORS.red, radius: "2px" },
  { x: 140, y: 560, size: 8, color: COLORS.blue, radius: "50%" },
  { x: 480, y: 560, size: 6, color: COLORS.amber, radius: "2px" },
  { x: 630, y: 640, size: 8, color: COLORS.green, radius: "50%" },
  { x: 260, y: 620, size: 9, color: COLORS.red, radius: "2px" },
  { x: 700, y: 360, size: 6, color: COLORS.amber, radius: "50%" },
  { x: 80, y: 480, size: 7, color: COLORS.green, radius: "2px" },
  { x: 310, y: 180, size: 16, color: "#556173", radius: "50%" },
  { x: 460, y: 600, size: 14, color: "#8b949e", radius: "50%" },
  { x: 110, y: 620, size: 18, color: "#556173", radius: "50%" },
  { x: 650, y: 80, size: 14, color: "#8b949e", radius: "50%" },
];

const paths = [
  "M 170 170 C 250 90, 350 130, 440 180",
  "M 290 340 C 400 240, 490 360, 580 300",
  "M 140 530 C 240 450, 360 570, 480 630",
  "M 440 180 C 500 290, 440 390, 490 500",
  "M 340 80 C 380 180, 290 240, 340 340",
  "M 590 130 C 510 210, 610 290, 550 390",
  "M 150 310 C 230 350, 240 440, 160 540",
  "M 630 430 C 530 470, 560 570, 480 650",
  "M 300 640 C 350 550, 430 490, 530 440",
  "M 660 190 C 590 260, 670 380, 630 510",
  "M 240 200 C 310 260, 410 240, 460 330",
  "M 400 630 C 450 550, 390 460, 310 400",
  "M 510 100 C 440 160, 480 230, 410 270",
  "M 90 370 C 170 310, 250 270, 330 230",
  "M 610 570 C 530 530, 490 480, 440 410",
  "M 210 610 C 270 530, 350 480, 430 360",
  "M 80 230 C 170 270, 260 340, 340 430",
  "M 550 190 C 490 260, 530 340, 600 390",
  "M 200 430 C 290 390, 370 420, 450 470",
  "M 470 300 C 520 340, 540 390, 520 450",
  "M 120 600 C 200 520, 300 480, 380 560",
  "M 620 100 C 560 200, 640 300, 580 420",
  "M 240 80 C 280 180, 380 200, 420 300",
  "M 500 640 C 460 560, 400 520, 340 460",
  "M 160 400 C 240 380, 300 300, 380 240",
  "M 660 520 C 580 500, 520 440, 460 380",
];

const allItems: JunkItem[] = [
  ...items,
  ...items.map((item, index) => ({
    ...item,
    x: Math.max(40, Math.min(600, item.x + (index % 2 === 0 ? 34 : -34))),
    y: Math.max(40, Math.min(580, item.y + (index % 3 === 0 ? -26 : 28))),
    w: item.w * 0.72,
    h: item.h * 0.72,
    rotate: item.rotate + 37,
  })),
  ...items.map((item, index) => ({
    ...item,
    x: Math.max(40, Math.min(610, item.x + (index % 2 === 0 ? -52 : 52))),
    y: Math.max(40, Math.min(600, item.y + (index % 4 === 0 ? 38 : -42))),
    w: item.w * 0.52,
    h: item.h * 0.52,
    rotate: item.rotate - 61,
  })),
];

const allDebris = [
  ...debris,
  ...debris.map((piece, index) => ({
    ...piece,
    x: Math.max(20, Math.min(700, piece.x + (index % 2 === 0 ? 22 : -18))),
    y: Math.max(20, Math.min(700, piece.y + (index % 3 === 0 ? 16 : -12))),
    size: piece.size * 0.8,
  })),
  ...debris.map((piece, index) => ({
    ...piece,
    x: Math.max(20, Math.min(720, piece.x + (index % 2 === 0 ? -30 : 26))),
    y: Math.max(20, Math.min(720, piece.y + (index % 4 === 0 ? -20 : 24))),
    size: piece.size * 0.6,
  })),
];

export const JunkBall: React.FC<{ size?: number; faint?: boolean }> = ({
  size = 760,
  faint = false,
}) => {
  const frame = useCurrentFrame();
  const spin = interpolate(frame, [0, 96], [-5, 5]);
  const wobble = Math.sin(frame * 0.08) * 2;
  const renderItems = faint ? items : allItems;
  const renderDebris = faint ? debris : allDebris;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -80,
          top: -80,
          width: size + 160,
          height: size + 160,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(63, 185, 80, 0.20), rgba(88, 166, 255, 0.09) 48%, transparent 70%)",
          filter: "blur(18px)",
        }}
      />
      <svg
        viewBox="0 0 760 760"
        width={size}
        height={size}
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        {paths.map((path, index) => (
          <path
            key={index}
            d={path}
            fill="none"
            stroke={
              index % 3 === 0
                ? "rgba(63, 185, 80, 0.34)"
                : index % 3 === 1
                  ? "rgba(88, 166, 255, 0.28)"
                  : "rgba(210, 153, 34, 0.24)"
            }
            strokeWidth={index % 4 === 0 ? 4 : 2}
            strokeDasharray="9 12"
            strokeDashoffset={-frame * (1.2 + (index % 4) * 0.4)}
          />
        ))}
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          rotate: `${spin + wobble}deg`,
          scale: 1 + Math.sin(frame * 0.09) * 0.008,
          filter: "drop-shadow(0 14px 20px rgba(0,0,0,0.35))",
        }}
      >
        {renderDebris.map((piece, index) => (
          <div
            key={`debris-${index}`}
            style={{
              position: "absolute",
              left: piece.x,
              top: piece.y,
              width: piece.size,
              height: piece.size,
              borderRadius: piece.radius,
              background: piece.color,
              opacity: 0.75,
              rotate: `${index * 31 + frame * 0.5}deg`,
            }}
          />
        ))}
        {renderItems.map((item, index) => {
          const Icon = iconFor(item.kind);
          const drift = Math.sin(frame * 0.06 + index * 1.7) * 3;
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                left: item.x,
                top: item.y,
                width: item.w,
                height: item.h,
                rotate: `${item.rotate + drift}deg`,
              }}
            >
              <Icon />
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: "18%",
          right: "18%",
          bottom: 8,
          height: 46,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.5)",
          filter: "blur(18px)",
        }}
      />
    </div>
  );
};

const iconFor = (kind: JunkKind): React.FC => {
  switch (kind) {
    case "bike":
      return Bicycle;
    case "crutch":
      return Crutch;
    case "trash":
      return TrashCan;
    case "bag":
      return TrashBag;
    case "keyboard":
      return BrokenKeyboard;
    case "cable":
      return Cable;
    case "cone":
      return Cone;
    case "floppy":
      return Floppy;
    case "wrench":
      return Wrench;
    case "tape":
      return DuctTape;
    case "tire":
      return Tire;
    case "bucket":
      return Bucket;
    case "plunger":
      return Plunger;
    case "note":
      return FixmeNote;
  }
};

const Svg: React.FC<{ children: React.ReactNode; viewBox: string }> = ({
  children,
  viewBox,
}) => (
  <svg
    viewBox={viewBox}
    width="100%"
    height="100%"
    style={{ overflow: "visible", display: "block" }}
  >
    {children}
  </svg>
);

const Bicycle: React.FC = () => (
  <Svg viewBox="0 0 200 132">
    <circle
      cx="46"
      cy="90"
      r="30"
      fill="none"
      stroke="#c9d1d9"
      strokeWidth="7"
    />
    <circle
      cx="154"
      cy="90"
      r="30"
      fill="none"
      stroke="#c9d1d9"
      strokeWidth="7"
    />
    <path
      d="M46 90 L46 60 M20 90 L72 90 M30 72 L62 108 M62 72 L30 108"
      stroke="#8b949e"
      strokeWidth="2.5"
      opacity="0.8"
    />
    <path
      d="M154 90 L154 60 M128 90 L180 90 M138 72 L170 108 M170 72 L138 108"
      stroke="#8b949e"
      strokeWidth="2.5"
      opacity="0.8"
    />
    <path
      d="M46 90 L82 42 L122 42 L154 90 L98 90 L82 42"
      fill="none"
      stroke={COLORS.green}
      strokeWidth="7"
      strokeLinejoin="round"
    />
    <path
      d="M68 30 L94 30"
      stroke="#c9d1d9"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <path
      d="M124 34 L150 22"
      stroke="#c9d1d9"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <circle cx="98" cy="90" r="7" fill="#c9d1d9" />
  </Svg>
);

const Crutch: React.FC = () => (
  <Svg viewBox="0 0 70 150">
    <rect x="13" y="20" width="10" height="122" rx="5" fill="#c9a06a" />
    <rect x="47" y="20" width="10" height="122" rx="5" fill="#c9a06a" />
    <path
      d="M12 22 Q35 -2 58 22"
      fill="none"
      stroke="#c9a06a"
      strokeWidth="11"
      strokeLinecap="round"
    />
    <rect x="13" y="60" width="44" height="11" rx="5" fill="#8b949e" />
    <rect x="17" y="130" width="36" height="13" rx="6" fill="#8b949e" />
    <rect x="24" y="70" width="4" height="52" rx="2" fill="#a87945" />
  </Svg>
);

const TrashCan: React.FC = () => (
  <Svg viewBox="0 0 100 136">
    <rect x="20" y="32" width="60" height="94" rx="9" fill="#4d5a6c" />
    <rect x="13" y="18" width="74" height="18" rx="9" fill="#8b949e" />
    <rect x="39" y="6" width="22" height="14" rx="7" fill="#8b949e" />
    <path
      d="M34 50 L34 110 M50 50 L50 110 M66 50 L66 110"
      stroke="#2b3543"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M38 74 L50 62 L62 74 M38 88 L50 100 L62 88"
      stroke={COLORS.green}
      strokeWidth="4"
      fill="none"
      opacity="0.75"
    />
  </Svg>
);

const TrashBag: React.FC = () => (
  <Svg viewBox="0 0 110 150">
    <path
      d="M32 34 C22 66 18 102 30 130 C42 144 68 144 80 130 C92 102 88 66 78 34 Z"
      fill="#2b3543"
      stroke="#4d5a6c"
      strokeWidth="4"
    />
    <path
      d="M38 32 L55 14 L72 32"
      fill="none"
      stroke="#8b949e"
      strokeWidth="7"
      strokeLinecap="round"
    />
    <path
      d="M44 62 L48 116 M66 62 L62 116"
      stroke="#58a6ff"
      strokeWidth="3"
      opacity="0.5"
    />
    <path
      d="M36 108 C48 116 64 116 76 108"
      stroke="#58a6ff"
      strokeWidth="3"
      fill="none"
      opacity="0.35"
    />
  </Svg>
);

const BrokenKeyboard: React.FC = () => (
  <Svg viewBox="0 0 180 92">
    <rect
      x="6"
      y="18"
      width="150"
      height="64"
      rx="9"
      fill="#232c39"
      stroke="#4d5a6c"
      strokeWidth="3"
    />
    {[0, 1, 2].map((row) => (
      <g key={row}>
        {Array.from({ length: 9 }).map((_, index) => (
          <rect
            key={index}
            x={16 + index * 15}
            y={28 + row * 16}
            width={11}
            height={10}
            rx={2}
            fill={index === 4 && row === 1 ? COLORS.red : "#2b3543"}
          />
        ))}
      </g>
    ))}
    <rect
      x="138"
      y="8"
      width="20"
      height="20"
      rx="3"
      fill={COLORS.blue}
      rotate="24 148 18"
    />
    <path
      d="M128 28 L140 20"
      stroke={COLORS.blue}
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.7"
    />
  </Svg>
);

const Cable: React.FC = () => (
  <Svg viewBox="0 0 150 150">
    <path
      d="M10 118 C34 80 16 46 48 26 C74 10 96 44 82 68 C70 90 104 96 120 76 C136 56 126 32 142 22"
      fill="none"
      stroke="#d29922"
      strokeWidth="9"
      strokeLinecap="round"
    />
    <path
      d="M10 118 C34 80 16 46 48 26 C74 10 96 44 82 68"
      fill="none"
      stroke="#8b949e"
      strokeWidth="3"
      strokeDasharray="4 7"
      opacity="0.7"
    />
    <rect x="128" y="12" width="16" height="20" rx="4" fill="#8b949e" />
    <path d="M132 8 L132 2 M140 8 L140 2" stroke="#c9d1d9" strokeWidth="3" />
    <circle cx="34" cy="46" r="4" fill={COLORS.red} />
  </Svg>
);

const Cone: React.FC = () => (
  <Svg viewBox="0 0 110 144">
    <path d="M55 8 L94 128 L16 128 Z" fill="#f0883e" />
    <path d="M36 76 L74 76 L82 100 L28 100 Z" fill="#e6edf3" />
    <rect x="8" y="126" width="94" height="12" rx="6" fill="#c9d1d9" />
    <path d="M55 8 L55 126" stroke="#b85f24" strokeWidth="2" opacity="0.4" />
  </Svg>
);

const Floppy: React.FC = () => (
  <Svg viewBox="0 0 112 112">
    <rect
      x="10"
      y="10"
      width="92"
      height="92"
      rx="7"
      fill="#1f6feb"
      stroke="#58a6ff"
      strokeWidth="3"
    />
    <rect x="40" y="10" width="42" height="30" rx="3" fill="#0b0e14" />
    <rect x="50" y="16" width="22" height="18" fill="#8b949e" />
    <rect x="24" y="58" width="64" height="34" rx="4" fill="#e6edf3" />
    <path
      d="M32 66 L80 66 M32 76 L68 76"
      stroke="#8b949e"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <text
      x="56"
      y="94"
      textAnchor="middle"
      fontFamily="monospace"
      fontSize="12"
      fill="#1f6feb"
    >
      1.44
    </text>
  </Svg>
);

const Wrench: React.FC = () => (
  <Svg viewBox="0 0 148 128">
    <path
      d="M24 104 L92 36 C86 22 92 8 106 6 C116 4 126 12 126 22 C126 30 120 36 112 38 L104 30 L90 44 L98 52 C90 66 68 78 52 80 L46 74 Z"
      fill="#8b949e"
      stroke="#c9d1d9"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <circle cx="106" cy="22" r="9" fill="#0b0e14" />
    <path d="M30 112 L44 98" stroke="#c9d1d9" strokeWidth="6" strokeLinecap="round" />
  </Svg>
);

const DuctTape: React.FC = () => (
  <Svg viewBox="0 0 130 104">
    <ellipse
      cx="54"
      cy="52"
      rx="42"
      ry="36"
      fill="#8b949e"
      stroke="#c9d1d9"
      strokeWidth="3"
    />
    <ellipse cx="54" cy="52" rx="20" ry="17" fill="#0b0e14" />
    <path
      d="M92 42 C112 38 124 48 122 60 C120 72 108 78 96 74 L94 62 C104 64 108 60 108 54 C108 48 102 46 94 50 Z"
      fill="#8b949e"
      stroke="#c9d1d9"
      strokeWidth="2.5"
    />
  </Svg>
);

const Tire: React.FC = () => (
  <Svg viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="48" fill="#1b232d" stroke="#4d5a6c" strokeWidth="10" />
    <circle cx="60" cy="60" r="22" fill="#2b3543" stroke="#8b949e" strokeWidth="4" />
    <circle cx="60" cy="60" r="8" fill="#8b949e" />
    {Array.from({ length: 12 }).map((_, index) => {
      const angle = (index / 12) * Math.PI * 2;
      const x1 = 60 + Math.cos(angle) * 38;
      const y1 = 60 + Math.sin(angle) * 38;
      const x2 = 60 + Math.cos(angle) * 49;
      const y2 = 60 + Math.sin(angle) * 49;
      return (
        <line
          key={index}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#8b949e"
          strokeWidth="4"
          strokeLinecap="round"
        />
      );
    })}
  </Svg>
);

const Bucket: React.FC = () => (
  <Svg viewBox="0 0 100 112">
    <path d="M16 30 L84 30 L72 104 L28 104 Z" fill="#4d5a6c" stroke="#8b949e" strokeWidth="3" />
    <path d="M20 44 L80 44" stroke="#2b3543" strokeWidth="4" />
    <path d="M16 30 C10 12 30 6 50 6 C70 6 90 12 84 30" fill="none" stroke="#8b949e" strokeWidth="4" />
    <path d="M30 56 L38 96 M50 56 L50 96 M70 56 L62 96" stroke="#2b3543" strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="50" cy="30" rx="34" ry="7" fill="#5d6b7c" />
  </Svg>
);

const Plunger: React.FC = () => (
  <Svg viewBox="0 0 90 160">
    <rect x="41" y="8" width="8" height="86" rx="4" fill="#c9a06a" />
    <path d="M14 96 C14 76 76 76 76 96 C76 116 66 130 45 130 C24 130 14 116 14 96 Z" fill="#f85149" />
    <path d="M22 102 C30 94 60 94 68 102" fill="none" stroke="#b8382f" strokeWidth="4" />
    <rect x="36" y="6" width="18" height="10" rx="5" fill="#8b949e" />
  </Svg>
);

const FixmeNote: React.FC = () => (
  <Svg viewBox="0 0 120 100">
    <path d="M8 12 L112 8 L108 92 L12 96 Z" fill="#d29922" stroke="#f0c674" strokeWidth="3" />
    <path d="M60 8 L62 96" stroke="#b07d12" strokeWidth="2" opacity="0.5" />
    <text x="60" y="48" textAnchor="middle" fontFamily="monospace" fontSize="18" fontWeight="700" fill="#3a2a08">
      FIXME
    </text>
    <text x="60" y="72" textAnchor="middle" fontFamily="monospace" fontSize="13" fill="#5c4410">
      do not touch
    </text>
  </Svg>
);
