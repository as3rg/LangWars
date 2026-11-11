import React from "react";
import { useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../lib/theme";
import { useLayout } from "../lib/layout";

export type CodeLine = { text: string; tone?: "normal" | "dim" | "bad" | "ok" };

type Token = { text: string; color: string; bold?: boolean };

const KEYWORDS = new Set([
  "function",
  "return",
  "let",
  "const",
  "if",
  "else",
  "for",
  "while",
  "true",
  "false",
  "null",
  "and",
  "or",
  "not",
]);

const TOKEN_RE =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(\b\d+\b)|([A-Za-z_][A-Za-z0-9_]*)/g;

const tokenize = (text: string): Token[] => {
  const tokens: Token[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(text)) !== null) {
    if (match.index > last) {
      tokens.push({ text: text.slice(last, match.index), color: COLORS.muted });
    }
    const [full, comment, str, num, word] = match;
    if (comment) {
      tokens.push({ text: full, color: COLORS.dim });
    } else if (str) {
      tokens.push({ text: full, color: COLORS.cyan });
    } else if (num) {
      tokens.push({ text: full, color: COLORS.amber });
    } else if (word && KEYWORDS.has(word)) {
      tokens.push({ text: full, color: COLORS.magenta, bold: true });
    } else if (word) {
      const after = text.slice(match.index + full.length).trimStart();
      tokens.push({
        text: full,
        color: after.startsWith("(") ? COLORS.violet : COLORS.text,
        bold: after.startsWith("("),
      });
    } else {
      tokens.push({ text: full, color: COLORS.text });
    }
    last = match.index + full.length;
  }
  if (last < text.length) {
    tokens.push({ text: text.slice(last), color: COLORS.muted });
  }
  return tokens;
};

const sliceTokens = (tokens: Token[], count: number): Token[] => {
  let left = count;
  const out: Token[] = [];
  for (const token of tokens) {
    if (left <= 0) break;
    if (token.text.length <= left) {
      out.push(token);
      left -= token.text.length;
    } else {
      out.push({ ...token, text: token.text.slice(0, left) });
      left = 0;
    }
  }
  return out;
};

export const CodeWindow: React.FC<{
  title?: string;
  lines: CodeLine[];
  typedChars?: number;
  status?: "idle" | "run" | "pass" | "fail";
  width?: number | string;
  height?: number | string;
  fontSize?: number;
  highlight?: number[];
  style?: React.CSSProperties;
}> = ({
  title = "solution.lw",
  lines,
  typedChars,
  status = "idle",
  width = "100%",
  height,
  fontSize = 20,
  highlight = [],
  style,
}) => {
  const { u } = useLayout();
  const frame = useCurrentFrame();
  const accent =
    status === "fail"
      ? COLORS.magenta
      : status === "pass"
        ? COLORS.cyan
        : status === "run"
          ? COLORS.amber
          : COLORS.line;
  const caretOn = Math.floor(frame / 8) % 2 === 0;

  const full = lines.map((l) => l.text).join("\n");
  const total = full.length;
  const limit = typedChars === undefined ? total : Math.max(0, Math.min(total, typedChars));

  let consumed = 0;
  const rendered = lines.map((line, li) => {
    const tokens = tokenize(line.text);
    const charsAvailable = Math.max(0, Math.min(line.text.length, limit - consumed));
    consumed += line.text.length + 1;
    const visible = sliceTokens(tokens, charsAvailable);
    const isActive =
      typedChars !== undefined &&
      limit >= consumed - line.text.length - 1 &&
      limit < consumed;
    return { line, li, visible, isActive, shown: charsAvailable };
  });

  return (
    <div
      style={{
        width,
        height,
        background: `linear-gradient(165deg, ${COLORS.bg2}, ${COLORS.bg1})`,
        border: `${1.5 * u}px solid ${accent}66`,
        boxShadow: `0 0 ${34 * u}px ${accent === COLORS.line ? COLORS.cyan : accent}1f`,
        clipPath: `polygon(0 0, calc(100% - ${14 * u}px) 0, 100% ${14 * u}px, 100% 100%, 0 100%)`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8 * u,
          padding: `${9 * u}px ${14 * u}px`,
          borderBottom: `${1 * u}px solid ${COLORS.line}`,
          background: `${COLORS.bg0}88`,
        }}
      >
        <span style={{ width: 9 * u, height: 9 * u, borderRadius: "50%", background: COLORS.magenta, opacity: 0.8 }} />
        <span style={{ width: 9 * u, height: 9 * u, borderRadius: "50%", background: COLORS.amber, opacity: 0.8 }} />
        <span style={{ width: 9 * u, height: 9 * u, borderRadius: "50%", background: COLORS.cyan, opacity: 0.8 }} />
        <span
          style={{
            marginLeft: 8 * u,
            color: COLORS.muted,
            fontFamily: FONTS.mono,
            fontSize: 13 * u,
            letterSpacing: 0.5 * u,
          }}
        >
          {title}
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            color: accent,
            fontFamily: FONTS.pixel,
            fontSize: 9 * u,
            letterSpacing: 1 * u,
            textTransform: "uppercase",
          }}
        >
          {status === "idle" ? "EDIT" : status === "fail" ? "FAILED" : status === "pass" ? "PASSED" : "RUNNING"}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          padding: `${12 * u}px ${16 * u}px`,
          fontFamily: FONTS.mono,
          fontSize: fontSize * u,
          lineHeight: 1.65,
          overflow: "hidden",
        }}
      >
        {rendered.map(({ line, li, visible, isActive, shown }) => (
          <div
            key={li}
            style={{
              display: "flex",
              gap: 14 * u,
              background: highlight.includes(li) ? `${COLORS.magenta}14` : "transparent",
              opacity: line.tone === "dim" ? 0.5 : 1,
              whiteSpace: "pre",
            }}
          >
            <span
              style={{
                width: 24 * u,
                textAlign: "right",
                color: COLORS.dim,
                flexShrink: 0,
                userSelect: "none",
              }}
            >
              {li + 1}
            </span>
            <span style={{ color: line.tone === "bad" ? COLORS.magenta : COLORS.text }}>
              {visible.map((token, ti) => (
                <span
                  key={ti}
                  style={{ color: token.color, fontWeight: token.bold ? 700 : 400 }}
                >
                  {token.text}
                </span>
              ))}
              {isActive && caretOn && (
                <span
                  style={{
                    display: "inline-block",
                    width: 2 * u,
                    height: fontSize * u,
                    background: COLORS.cyan,
                    verticalAlign: "text-bottom",
                    marginLeft: 1,
                  }}
                />
              )}
              {shown === 0 && !isActive ? "\u00a0" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TerminalTestRow: React.FC<{
  input: string;
  expected: string;
  state: "pass" | "fail" | "pending";
  delay?: number;
  size?: number;
}> = ({ input, expected, state, delay = 0, size = 18 }) => {
  const { u } = useLayout();
  const frame = useCurrentFrame();
  const color =
    state === "pass" ? COLORS.cyan : state === "fail" ? COLORS.magenta : COLORS.muted;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12 * u,
        padding: `${7 * u}px ${12 * u}px`,
        border: `${1 * u}px solid ${color}44`,
        background: `${color}0d`,
        fontFamily: FONTS.mono,
        fontSize: size * u,
        opacity: frame >= delay ? 1 : 0,
        transform: `translateX(${frame >= delay ? 0 : -16}px)`,
      }}
    >
      <span style={{ color: COLORS.muted }}>{input}</span>
      <span style={{ color: COLORS.dim }}>→</span>
      <span style={{ color: COLORS.text }}>{expected}</span>
      <span style={{ flex: 1 }} />
      <span style={{ color, fontWeight: 700 }}>
        {state === "pass" ? "PASS" : state === "fail" ? "FAIL" : "..."}
      </span>
    </div>
  );
};
