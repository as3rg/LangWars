import React from "react";

export type Mood = "coding" | "shock" | "rage" | "sad" | "smug";

const SKIN = "#f2c49b";
const SKIN_RAGE = "#e9a184";
const HAIR = "#241c17";
const HOODIE = "#1f6feb";
const HOODIE_DARK = "#1859c4";
const INK = "#151a21";

export const Character: React.FC<{ mood: Mood; width?: number }> = ({
  mood,
  width = 360,
}) => {
  const skin = mood === "rage" ? SKIN_RAGE : SKIN;
  const sleeve = HOODIE;

  return (
    <svg
      viewBox="0 0 320 420"
      width={width}
      height={(width * 420) / 320}
      style={{ overflow: "visible", display: "block" }}
    >
      {mood === "rage" ? (
        <circle cx="160" cy="190" r="152" fill="rgba(248, 81, 73, 0.24)" />
      ) : null}

      <path
        d="M62 414 C62 336 100 296 160 296 C220 296 258 336 258 414 Z"
        fill={HOODIE}
      />
      <path
        d="M116 300 C128 332 192 332 204 300 L204 294 L116 294 Z"
        fill={HOODIE_DARK}
      />

      <rect x="142" y="242" width="36" height="46" rx="15" fill={skin} />
      <circle cx="76" cy="192" r="16" fill={skin} />
      <circle cx="244" cy="192" r="16" fill={skin} />

      <circle cx="160" cy="188" r="84" fill={skin} />

      <path
        d="M74 176 C74 90 246 90 246 176 C246 148 214 126 160 126 C106 126 74 148 74 176 Z"
        fill={HAIR}
      />
      <path
        d="M76 168 C70 188 72 208 80 222 L93 215 C85 201 83 185 87 170 Z"
        fill={HAIR}
      />
      <path
        d="M244 168 C250 188 248 208 240 222 L227 215 C235 201 237 185 233 170 Z"
        fill={HAIR}
      />

      <Face mood={mood} />

      {mood === "shock" ? (
        <path
          d="M248 138 C254 156 262 166 262 175 A13 13 0 0 1 236 175 C236 166 242 156 248 138 Z"
          fill="#58a6ff"
        />
      ) : null}

      {mood === "rage" ? (
        <path
          d="M214 116 L203 136 L216 136 L206 157"
          fill="none"
          stroke="#f85149"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      <Arms mood={mood} sleeve={sleeve} skin={skin} />
    </svg>
  );
};

const Face: React.FC<{ mood: Mood }> = ({ mood }) => {
  if (mood === "rage") {
    return (
      <>
        <path
          d="M108 166 L146 182"
          stroke={INK}
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M212 166 L174 182"
          stroke={INK}
          strokeWidth="11"
          strokeLinecap="round"
        />
        <circle cx="133" cy="196" r="7" fill="#6d160f" />
        <circle cx="187" cy="196" r="7" fill="#6d160f" />
        <path
          d="M126 232 Q160 262 194 232 Q160 248 126 232 Z"
          fill="#55130e"
        />
        <rect x="140" y="232" width="40" height="9" rx="2" fill="#f4f1ea" />
      </>
    );
  }

  if (mood === "shock") {
    return (
      <>
        <path
          d="M112 158 L146 154"
          stroke={INK}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M208 158 L174 154"
          stroke={INK}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <ellipse cx="132" cy="190" rx="20" ry="24" fill="#ffffff" />
        <ellipse cx="188" cy="190" rx="20" ry="24" fill="#ffffff" />
        <circle cx="133" cy="192" r="9" fill={INK} />
        <circle cx="187" cy="192" r="9" fill={INK} />
        <ellipse cx="160" cy="247" rx="21" ry="27" fill="#3a1410" />
      </>
    );
  }

  if (mood === "sad") {
    return (
      <>
        <path
          d="M112 176 L146 164"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M208 176 L174 164"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <circle cx="132" cy="194" r="7" fill={INK} />
        <circle cx="188" cy="194" r="7" fill={INK} />
        <path
          d="M144 246 Q160 234 176 246"
          fill="none"
          stroke={INK}
          strokeWidth="8"
          strokeLinecap="round"
        />
      </>
    );
  }

  if (mood === "smug") {
    return (
      <>
        <path
          d="M112 170 L146 162"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M208 162 L174 168"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M118 192 L144 192"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M176 192 L202 192"
          stroke={INK}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M146 236 Q166 250 180 232"
          fill="none"
          stroke={INK}
          strokeWidth="8"
          strokeLinecap="round"
        />
      </>
    );
  }

  return (
    <>
      <path
        d="M112 172 L146 172"
        stroke={INK}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M208 172 L174 172"
        stroke={INK}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <circle cx="132" cy="192" r="7" fill={INK} />
      <circle cx="188" cy="192" r="7" fill={INK} />
      <path
        d="M148 238 Q160 246 172 238"
        fill="none"
        stroke={INK}
        strokeWidth="8"
        strokeLinecap="round"
      />
    </>
  );
};

const Arms: React.FC<{ mood: Mood; sleeve: string; skin: string }> = ({
  mood,
  sleeve,
  skin,
}) => {
  if (mood === "shock") {
    return (
      <>
        <path
          d="M102 322 C80 298 64 272 56 250"
          fill="none"
          stroke={sleeve}
          strokeWidth="28"
          strokeLinecap="round"
        />
        <path
          d="M218 322 C240 298 256 272 264 250"
          fill="none"
          stroke={sleeve}
          strokeWidth="28"
          strokeLinecap="round"
        />
        <circle cx="52" cy="242" r="16" fill={skin} />
        <circle cx="268" cy="242" r="16" fill={skin} />
      </>
    );
  }

  if (mood === "rage") {
    return (
      <>
        <path
          d="M104 326 C108 348 112 366 116 380"
          fill="none"
          stroke={sleeve}
          strokeWidth="28"
          strokeLinecap="round"
        />
        <path
          d="M216 326 C212 348 208 366 204 380"
          fill="none"
          stroke={sleeve}
          strokeWidth="28"
          strokeLinecap="round"
        />
        <circle cx="118" cy="388" r="17" fill={skin} />
        <circle cx="202" cy="388" r="17" fill={skin} />
      </>
    );
  }

  if (mood === "smug") {
    return (
      <>
        <path
          d="M102 330 C122 374 198 378 222 334"
          fill="none"
          stroke={sleeve}
          strokeWidth="28"
          strokeLinecap="round"
        />
        <circle cx="226" cy="330" r="15" fill={skin} />
      </>
    );
  }

  return (
    <>
      <path
        d="M102 326 C90 348 84 370 88 390"
        fill="none"
        stroke={sleeve}
        strokeWidth="28"
        strokeLinecap="round"
      />
      <path
        d="M218 326 C230 348 236 370 232 390"
        fill="none"
        stroke={sleeve}
        strokeWidth="28"
        strokeLinecap="round"
      />
      <circle cx="88" cy="398" r="15" fill={skin} />
      <circle cx="232" cy="398" r="15" fill={skin} />
    </>
  );
};
