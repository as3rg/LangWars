import React from "react";
import { Interactive, useCurrentFrame, useVideoConfig } from "remotion";
import { monoFont } from "../fonts";
import { COLORS } from "../theme";
import { tokenize } from "./tokenize";

export type CodeLine = {
  readonly text: string;
  readonly danger?: boolean;
};

type Props = {
  readonly filename: string;
  readonly lines: CodeLine[];
  readonly typing: number;
  readonly width: number;
  readonly height: number;
  readonly fontSize?: number;
  readonly glow?: string;
  readonly compact?: boolean;
  readonly status?: React.ReactNode;
};

export const EditorWindow: React.FC<Props> = ({
  filename,
  lines,
  typing,
  width,
  height,
  fontSize,
  glow = "rgba(88, 166, 255, 0.22)",
  compact = false,
  status,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cursorOn = Math.floor(frame / (fps / 2)) % 2 === 0;
  const codeSize = fontSize ?? (compact ? 17 : 23);

  const totalChars = lines.reduce((sum, line) => sum + line.text.length + 1, 0);
  let budget = Math.floor(typing * totalChars);
  const visible = lines.map((line) => {
    if (budget <= 0) {
      return { line, text: "", complete: false, visible: false };
    }
    const cost = line.text.length + 1;
    if (budget >= cost) {
      budget -= cost;
      return { line, text: line.text, complete: true, visible: true };
    }
    const partial = line.text.slice(0, budget);
    budget = 0;
    return { line, text: partial, complete: false, visible: true };
  });

  const revealed = visible.filter((entry) => entry.visible);

  return (
    <Interactive.Div
      name="Editor window"
      style={{
        width,
        height,
        background: COLORS.panel,
        border: compact ? "none" : `1px solid ${COLORS.border}`,
        borderRadius: compact ? 0 : 22,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: compact
          ? "none"
          : `0 42px 120px rgba(0, 0, 0, 0.62), 0 0 90px ${glow}, inset 0 1px 0 rgba(255, 255, 255, 0.04)`,
      }}
    >
      <div
        style={{
          height: compact ? 50 : 62,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: compact ? "0 18px" : "0 24px",
          borderBottom: `1px solid ${COLORS.borderSoft}`,
          background: COLORS.panelRaised,
        }}
      >
        {compact ? null : (
          <>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#ff5f57",
              }}
            />
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#febc2e",
              }}
            />
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#28c840",
              }}
            />
          </>
        )}
        <span
          style={{
            marginLeft: compact ? 0 : 18,
            fontFamily: monoFont,
            fontSize: compact ? 15 : 19,
            color: COLORS.muted,
          }}
        >
          {filename}
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: compact ? "5px 11px" : "7px 14px",
            borderRadius: 999,
            border: `1px solid ${COLORS.border}`,
            fontFamily: monoFont,
            fontSize: compact ? 13 : 16,
            color: COLORS.green,
            letterSpacing: 0.4,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: COLORS.green,
            }}
          />
          LWLang
        </span>
      </div>

      <div
        style={{
          flex: 1,
          padding: compact ? "14px 0 10px" : "26px 0 18px",
          overflow: "hidden",
          display: "flex",
        }}
      >
        <div
          style={{
            width: compact ? 52 : 68,
            flexShrink: 0,
            textAlign: "right",
            paddingRight: compact ? 16 : 22,
            fontFamily: monoFont,
            fontSize: codeSize - 2,
            lineHeight: 1.62,
            color: "#3d4a5a",
          }}
        >
          {revealed.map((entry, index) => (
            <div key={index}>{index + 1}</div>
          ))}
        </div>
        <div
          style={{
            flex: 1,
            paddingRight: 24,
            fontFamily: monoFont,
            fontSize: codeSize,
            lineHeight: 1.62,
            whiteSpace: "pre",
            overflow: "hidden",
          }}
        >
          {revealed.map((entry, index) => {
            const isLast = index === revealed.length - 1;
            if (entry.line.danger) {
              return (
                <div
                  key={index}
                  style={{
                    color: COLORS.red,
                    background: COLORS.redSoft,
                    borderLeft: `4px solid ${COLORS.red}`,
                    paddingLeft: 14,
                    marginLeft: -18,
                    fontWeight: 700,
                  }}
                >
                  {entry.text}
                  {isLast ? (
                    <Cursor
                      color={COLORS.red}
                      on={cursorOn}
                      size={codeSize}
                    />
                  ) : null}
                </div>
              );
            }
            return (
              <div key={index}>
                {tokenize(entry.text).map((token, tokenIndex) => (
                  <span
                    key={tokenIndex}
                    style={{
                      color: token.color,
                      fontStyle: token.italic ? "italic" : "normal",
                    }}
                  >
                    {token.text}
                  </span>
                ))}
                {isLast ? (
                  <Cursor color={COLORS.blue} on={cursorOn} size={codeSize} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {status ? (
        <div
          style={{
            minHeight: compact ? 62 : 84,
            display: "flex",
            alignItems: "center",
            padding: compact ? "0 18px" : "0 24px",
            borderTop: `1px solid ${COLORS.borderSoft}`,
            background: COLORS.panelRaised,
          }}
        >
          {status}
        </div>
      ) : null}
    </Interactive.Div>
  );
};

const Cursor: React.FC<{ color: string; on: boolean; size: number }> = ({
  color,
  on,
  size,
}) => {
  return (
    <span
      style={{
        display: "inline-block",
        width: size * 0.62,
        height: size + 1,
        translate: "0 4px",
        marginLeft: 2,
        background: color,
        opacity: on ? 1 : 0,
      }}
    />
  );
};
