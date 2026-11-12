import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

export const Duck: React.FC<{ width?: number; crown?: boolean }> = ({
  width = 140,
  crown = false,
}) => (
  <svg viewBox="0 0 168 124" width={width} height={(width * 124) / 168}>
    <path
      d="M24 78 C24 50 48 34 76 34 C106 34 132 52 132 76 C132 96 108 106 78 106 C48 106 24 98 24 78 Z"
      fill="#f2cc60"
    />
    <circle cx="116" cy="48" r="31" fill="#f2cc60" />
    <path d="M142 44 L168 54 L142 64 Z" fill="#f0883e" />
    <circle cx="124" cy="39" r="5" fill="#151a21" />
    <circle cx="126" cy="37" r="1.6" fill="#ffffff" />
    <path
      d="M52 54 C62 44 86 44 96 54 C84 64 62 64 52 54 Z"
      fill="#e3b23c"
    />
    <path
      d="M24 72 C14 70 8 78 14 86 C18 92 28 92 34 88 Z"
      fill="#f2cc60"
    />
    <path
      d="M60 92 C72 100 90 100 102 92"
      fill="none"
      stroke="#d9a92f"
      strokeWidth="4"
      strokeLinecap="round"
      opacity="0.7"
    />
    {crown ? (
      <path
        d="M94 10 L104 27 L116 13 L126 29 L138 12 L136 36 L94 36 Z"
        fill="#d29922"
        stroke="#f0c674"
        strokeWidth="2"
      />
    ) : null}
  </svg>
);

export const Clown: React.FC<{
  width?: number;
  outfit?: string;
  hair?: string;
  splat?: boolean;
}> = ({ width = 280, outfit = "#1f6feb", hair = "#f85149", splat = false }) => (
  <svg viewBox="0 0 240 330" width={width} height={(width * 330) / 240}>
    <ellipse cx="70" cy="310" rx="46" ry="18" fill="#c93c37" />
    <ellipse cx="170" cy="310" rx="46" ry="18" fill="#c93c37" />
    <rect x="72" y="220" width="26" height="84" rx="10" fill={outfit} />
    <rect x="142" y="220" width="26" height="84" rx="10" fill={outfit} />
    {[0, 1, 2, 3].map((index) => (
      <g key={index}>
        <rect
          x="72"
          y={230 + index * 18}
          width="26"
          height="8"
          fill="#f7f1e3"
          opacity="0.85"
        />
        <rect
          x="142"
          y={230 + index * 18}
          width="26"
          height="8"
          fill="#f7f1e3"
          opacity="0.85"
        />
      </g>
    ))}
    <ellipse cx="120" cy="206" rx="64" ry="74" fill={outfit} />
    {[0, 1, 2, 3, 4, 5].map((index) => (
      <circle
        key={index}
        cx={80 + (index % 3) * 40}
        cy={170 + Math.floor(index / 3) * 40}
        r="7"
        fill="#f7f1e3"
        opacity="0.2"
      />
    ))}
    <path
      d="M72 182 C48 156 32 132 28 108"
      fill="none"
      stroke={outfit}
      strokeWidth="22"
      strokeLinecap="round"
    />
    <path
      d="M168 182 C192 156 208 132 212 108"
      fill="none"
      stroke={outfit}
      strokeWidth="22"
      strokeLinecap="round"
    />
    <circle cx="26" cy="102" r="17" fill="#f7f1e3" />
    <circle cx="214" cy="102" r="17" fill="#f7f1e3" />
    <path d="M96 166 L120 178 L96 190 Z" fill="#f85149" />
    <path d="M144 166 L120 178 L144 190 Z" fill="#f85149" />
    <circle cx="120" cy="178" r="7" fill="#d29922" />

    {[
      { cx: 66, cy: 74, r: 26 },
      { cx: 174, cy: 74, r: 26 },
      { cx: 120, cy: 38, r: 30 },
      { cx: 82, cy: 44, r: 18 },
      { cx: 158, cy: 44, r: 18 },
    ].map((puff, index) => (
      <circle key={index} cx={puff.cx} cy={puff.cy} r={puff.r} fill={hair} />
    ))}
    <path d="M120 10 L96 46 L144 46 Z" fill={COLORS.amber} />
    <circle cx="120" cy="12" r="8" fill={COLORS.red} />

    <circle cx="120" cy="102" r="58" fill="#f7f1e3" />
    <circle cx="74" cy="114" r="9" fill="#f7b6b2" opacity="0.75" />
    <circle cx="166" cy="114" r="9" fill="#f7b6b2" opacity="0.75" />
    <circle cx="98" cy="94" r="7" fill="#151a21" />
    <circle cx="142" cy="94" r="7" fill="#151a21" />
    <path
      d="M84 84 L108 80"
      stroke="#151a21"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M156 84 L132 80"
      stroke="#151a21"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <circle cx="120" cy="116" r="13" fill="#f85149" />
    <circle cx="116" cy="112" r="4" fill="#ff8a84" opacity="0.8" />
    {splat ? (
      <>
        <path
          d="M62 106 C58 76 82 56 120 58 C158 56 182 76 178 106 C192 122 180 148 158 148 C146 166 94 166 82 148 C60 148 48 122 62 106 Z"
          fill="#f7f1e3"
        />
        <path
          d="M80 148 C82 160 70 168 62 160 C54 152 62 142 70 142 M160 148 C158 160 170 168 178 160 C186 152 178 142 170 142"
          stroke="#f7f1e3"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
        {[
          { x: 98, y: 92, color: COLORS.red, rotate: 20 },
          { x: 128, y: 104, color: COLORS.blue, rotate: -18 },
          { x: 112, y: 128, color: COLORS.green, rotate: 45 },
          { x: 144, y: 86, color: COLORS.amber, rotate: 12 },
          { x: 86, y: 120, color: COLORS.red, rotate: -40 },
        ].map((sprinkle, index) => (
          <rect
            key={index}
            x={sprinkle.x}
            y={sprinkle.y}
            width="14"
            height="5"
            rx="2"
            fill={sprinkle.color}
            rotate={`${sprinkle.rotate} ${sprinkle.x} ${sprinkle.y}`}
          />
        ))}
      </>
    ) : (
      <path
        d="M92 132 Q120 158 148 132"
        fill="none"
        stroke="#b8382f"
        strokeWidth="7"
        strokeLinecap="round"
      />
    )}
  </svg>
);

export const Cake: React.FC<{ width?: number }> = ({ width = 120 }) => (
  <svg viewBox="0 0 140 120" width={width} height={(width * 120) / 140}>
    <ellipse cx="70" cy="104" rx="54" ry="12" fill="#5c3a21" opacity="0.8" />
    <rect x="16" y="46" width="108" height="52" rx="10" fill="#f2c49b" />
    <path
      d="M16 58 C32 70 46 50 64 62 C82 74 98 54 116 62 C120 64 124 60 124 54 L124 46 L16 46 Z"
      fill="#f7f1e3"
    />
    <path
      d="M20 64 C34 76 48 56 66 68 C84 80 100 60 118 68"
      stroke="#f7f1e3"
      strokeWidth="9"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="70" cy="36" r="11" fill="#f85149" />
    <path
      d="M70 25 C70 15 80 15 84 10"
      stroke="#3fb950"
      strokeWidth="3"
      fill="none"
    />
    {[
      { x: 40, y: 78 },
      { x: 62, y: 86 },
      { x: 86, y: 76 },
      { x: 102, y: 88 },
    ].map((dot, index) => (
      <circle key={index} cx={dot.x} cy={dot.y} r="3" fill={COLORS.amber} />
    ))}
  </svg>
);

export const Trophy: React.FC<{ width?: number }> = ({ width = 150 }) => (
  <svg viewBox="0 0 140 160" width={width} height={(width * 160) / 140}>
    <path
      d="M40 14 H100 V48 C100 80 82 96 70 96 C58 96 40 80 40 48 Z"
      fill="#d29922"
      stroke="#f0c674"
      strokeWidth="4"
    />
    <path
      d="M40 24 H14 C14 52 26 66 44 68"
      fill="none"
      stroke="#d29922"
      strokeWidth="10"
      strokeLinecap="round"
    />
    <path
      d="M100 24 H126 C126 52 114 66 96 68"
      fill="none"
      stroke="#d29922"
      strokeWidth="10"
      strokeLinecap="round"
    />
    <rect x="62" y="96" width="16" height="24" fill="#d29922" />
    <rect x="46" y="120" width="48" height="14" rx="5" fill="#8b949e" />
    <rect x="34" y="134" width="72" height="12" rx="5" fill="#4d5a6c" />
    <path d="M70 34 L76 46 L90 48 L80 58 L82 72 L70 65 L58 72 L60 58 L50 48 L64 46 Z" fill="#ffe3b0" />
  </svg>
);

export const PotPerson: React.FC<{ width?: number; variant?: number }> = ({
  width = 230,
  variant = 0,
}) => {
  const hair = variant === 0 ? "#241c17" : variant === 1 ? "#4d3a2a" : "#1b232d";
  const shirt = variant === 0 ? "#1f6feb" : variant === 1 ? "#3fb950" : "#d29922";
  return (
    <svg viewBox="0 0 160 220" width={width} height={(width * 220) / 160}>
      <path
        d="M28 210 C34 164 52 148 80 148 C108 148 126 164 132 210 Z"
        fill={shirt}
      />
      {variant === 0 ? (
        <path d="M80 168 L72 200 L80 194 L88 200 Z" fill="#f85149" />
      ) : null}
      <circle cx="80" cy="78" r="46" fill="#f2c49b" />
      <path
        d="M80 30 C54 30 38 46 38 72 C38 60 52 44 80 44 C108 44 122 60 122 72 C122 46 106 30 80 30 Z"
        fill={hair}
      />
      <path
        d="M28 140 C18 116 14 92 18 70"
        fill="none"
        stroke={shirt}
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M132 140 C142 116 146 92 142 70"
        fill="none"
        stroke={shirt}
        strokeWidth="18"
        strokeLinecap="round"
      />
      <circle cx="18" cy="62" r="13" fill="#f2c49b" />
      <circle cx="142" cy="62" r="13" fill="#f2c49b" />

      {variant === 1 ? (
        <>
          <circle cx="64" cy="78" r="14" fill="none" stroke="#151a21" strokeWidth="3" />
          <circle cx="96" cy="78" r="14" fill="none" stroke="#151a21" strokeWidth="3" />
          <path d="M78 78 L82 78" stroke="#151a21" strokeWidth="3" />
        </>
      ) : (
        <>
          <circle cx="64" cy="78" r="6" fill="#151a21" />
          <circle cx="96" cy="78" r="6" fill="#151a21" />
        </>
      )}
      <path
        d={variant === 2 ? "M60 102 Q80 116 100 102" : "M62 106 Q80 94 98 106"}
        fill="none"
        stroke="#151a21"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {variant === 2 ? (
        <path d="M44 38 H116 L108 56 H52 Z" fill="#c93c37" />
      ) : null}
      {variant !== 2 ? (
        <>
          <path
            d="M118 56 C122 66 126 72 126 78 A8 8 0 0 1 110 78 C110 72 114 66 118 56 Z"
            fill="#58a6ff"
          />
          <circle cx="126" cy="84" r="2.5" fill="#58a6ff" />
        </>
      ) : null}
    </svg>
  );
};

export const Flame: React.FC<{
  width?: number;
  seed?: number;
  color?: string;
  inner?: string;
}> = ({ width = 100, seed = 0, color = "#f85149", inner = "#ffb86b" }) => {
  const frame = useCurrentFrame();
  const flicker = 0.9 + Math.abs(Math.sin(frame * 0.35 + seed)) * 0.28;
  const sway = Math.sin(frame * 0.22 + seed) * 4;
  return (
    <svg
      viewBox="0 0 100 160"
      width={width}
      height={(width * 160) / 100}
      style={{
        overflow: "visible",
        scale: `${1} ${flicker}`,
        translate: `${sway}px 0px`,
        transformOrigin: "50% 100%",
      }}
    >
      <path
        d="M50 154 C10 122 20 84 44 62 C40 92 62 96 60 70 C86 96 92 128 50 154 Z"
        fill={color}
      />
      <path
        d="M50 144 C26 122 30 96 48 78 C46 100 62 104 60 86 C78 108 78 132 50 144 Z"
        fill={inner}
        opacity="0.9"
      />
      <path
        d="M50 134 C36 120 38 106 50 94 C50 108 60 112 58 100 C68 116 66 130 50 134 Z"
        fill="#ffe3b0"
        opacity="0.85"
      />
    </svg>
  );
};

export const DuckKnight: React.FC<{
  width?: number;
  crown?: boolean;
  color?: string;
}> = ({ width = 170, crown = false, color = "#1f6feb" }) => (
  <svg viewBox="0 0 260 190" width={width} height={(width * 190) / 260}>
    <g transform="translate(16 54) scale(1.22)">
      <path
        d="M24 78 C24 50 48 34 76 34 C106 34 132 52 132 76 C132 96 108 106 78 106 C48 106 24 98 24 78 Z"
        fill="#f2cc60"
      />
      <circle cx="116" cy="48" r="31" fill="#f2cc60" />
      <path d="M142 44 L168 54 L142 64 Z" fill="#f0883e" />
      <circle cx="124" cy="39" r="5" fill="#151a21" />
      <circle cx="126" cy="37" r="1.6" fill="#ffffff" />
      <path
        d="M52 54 C62 44 86 44 96 54 C84 64 62 64 52 54 Z"
        fill="#e3b23c"
      />
      <path d="M24 72 C14 70 8 78 14 86 C18 92 28 92 34 88 Z" fill="#f2cc60" />
    </g>

    <path
      d="M64 96 L64 118 L78 118 L78 100 Z"
      fill="#3a4656"
      stroke="#c9d1d9"
      strokeWidth="2"
    />
    <path
      d="M94 96 L94 118 L108 118 L108 100 Z"
      fill="#3a4656"
      stroke="#c9d1d9"
      strokeWidth="2"
    />
    <path
      d="M76 58 C76 48 88 44 100 46 C112 43 122 52 122 64 L122 98 L76 98 Z"
      fill="#8b949e"
      stroke="#c9d1d9"
      strokeWidth="2"
    />
    <path d="M88 52 L110 52 L110 98 L99 104 L88 98 Z" fill={color} />
    <path
      d="M77 66 C70 68 66 72 64 78"
      fill="none"
      stroke="#8b949e"
      strokeWidth="11"
      strokeLinecap="round"
    />
    <circle
      cx="62"
      cy="80"
      r="19"
      fill="#2b3543"
      stroke="#c9d1d9"
      strokeWidth="3"
    />
    <path
      d="M53 80 L71 80 M62 71 L62 89"
      stroke="#f2cc60"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M118 64 C130 57 140 48 146 40"
      fill="none"
      stroke="#8b949e"
      strokeWidth="12"
      strokeLinecap="round"
    />
    <circle cx="146" cy="40" r="9" fill="#c9d1d9" />
    <path
      d="M146 40 L212 12"
      stroke="#e6edf3"
      strokeWidth="7"
      strokeLinecap="round"
    />
    <path
      d="M136 35 L156 47"
      stroke="#d29922"
      strokeWidth="7"
      strokeLinecap="round"
    />
    <path d="M212 12 L222 8 L218 18 Z" fill="#e6edf3" />
    <circle cx="100" cy="38" r="21" fill="#c9d1d9" />
    <path d="M80 38 H120" stroke="#151a21" strokeWidth="5" />
    <path d="M86 34 L94 34 M106 34 L114 34" stroke="#151a21" strokeWidth="3" />
    <path
      d="M100 18 C96 4 80 2 70 10 C82 8 90 14 92 22 Z"
      fill={color}
    />
    {crown ? (
      <path
        d="M84 10 L92 22 L100 10 L108 22 L116 10 L114 30 L86 30 Z"
        fill="#d29922"
        stroke="#f0c674"
        strokeWidth="2"
      />
    ) : null}
  </svg>
);
