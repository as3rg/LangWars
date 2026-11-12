import React from "react";
import { displayFont, monoFont } from "../fonts";
import { COLORS } from "../theme";

export const MONITOR = {
  left: 760,
  top: 150,
  width: 1060,
  height: 620,
} as const;

export const GUY = {
  left: 130,
  top: 320,
  width: 480,
} as const;

export const HomeStage: React.FC<{
  children: React.ReactNode;
  glow: string;
}> = ({ children, glow }) => {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, #101722 0%, #0d131c 62%, #0a0e15 100%)",
        }}
      />

      <Window />

      <div
        style={{
          position: "absolute",
          left: 498,
          top: 96,
          width: 192,
          height: 254,
          borderRadius: 6,
          border: "10px solid #1b232d",
          background: "#0d1118",
          boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: monoFont,
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.green,
            lineHeight: 1,
          }}
        >
          {"{ }"}
        </div>
        <div
          style={{
            fontFamily: displayFont,
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.text,
            letterSpacing: 1.6,
          }}
        >
          LWLANG
        </div>
        <div
          style={{
            fontFamily: monoFont,
            fontSize: 11,
            color: COLORS.faint,
            letterSpacing: 1.1,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          BREAK
          <br />
          THE WORLD
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 640,
          top: 40,
          width: 1300,
          height: 860,
          background: `radial-gradient(closest-side, ${glow}, transparent 72%)`,
          filter: "blur(42px)",
          opacity: 0.85,
          pointerEvents: "none",
        }}
      />

      <Monitor>{children}</Monitor>

      <Desk />
      <DeskLamp />
      <Keyboard />

      <div
        style={{
          position: "absolute",
          left: MONITOR.left,
          top: 798,
          width: MONITOR.width,
          height: 74,
          background: `linear-gradient(180deg, ${glow}, transparent)`,
          opacity: 0.28,
          pointerEvents: "none",
        }}
      />
    </>
  );
};

const Window: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        left: 64,
        top: 116,
        width: 382,
        height: 376,
        borderRadius: 4,
        border: "12px solid #1b232d",
        background:
          "linear-gradient(180deg, #101c30 0%, #0c1626 58%, #0a111d 100%)",
        overflow: "hidden",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.55)",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 54,
          top: 38,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "#dbe6f2",
          boxShadow: "0 0 34px rgba(219, 230, 242, 0.45)",
        }}
      />
      {[
        { left: 40, top: 58, size: 3 },
        { left: 104, top: 112, size: 2 },
        { left: 236, top: 64, size: 2 },
        { left: 300, top: 150, size: 3 },
        { left: 170, top: 38, size: 2 },
        { left: 320, top: 96, size: 2 },
      ].map((star, index) => (
        <span
          key={index}
          style={{
            position: "absolute",
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            borderRadius: "50%",
            background: "rgba(230, 237, 243, 0.7)",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 112,
          display: "flex",
          alignItems: "flex-end",
          gap: 7,
          padding: "0 10px",
        }}
      >
        {[46, 70, 38, 88, 54, 30, 74, 42, 62, 34, 80, 48].map(
          (height, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                height,
                background: "#070c13",
                borderTop: "1px solid rgba(88, 166, 255, 0.22)",
              }}
            />
          ),
        )}
      </div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: 10,
          translate: "-50% 0",
          background: "#161e28",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "48%",
          height: 10,
          background: "#161e28",
        }}
      />
    </div>
  );
};

const Monitor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: MONITOR.left,
        top: MONITOR.top,
        width: MONITOR.width,
        height: MONITOR.height,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: MONITOR.height - 12,
          width: 148,
          height: 44,
          translate: "-50% 0",
          background: "linear-gradient(180deg, #1b232d, #11161f)",
          border: "1px solid #26303c",
          borderRadius: 10,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: MONITOR.height + 20,
          width: 330,
          height: 18,
          translate: "-50% 0",
          borderRadius: 9,
          background: "#1b232d",
          border: "1px solid #26303c",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 20,
          background: "#05070a",
          border: "2px solid #1b232d",
          boxShadow:
            "0 34px 90px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)",
          padding: 13,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 9,
            overflow: "hidden",
            background: "#0b0e14",
            position: "relative",
          }}
        >
          {children}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 7,
          width: 7,
          height: 7,
          translate: "-50% 0",
          borderRadius: "50%",
          background: "#1e2833",
        }}
      />
    </div>
  );
};

const Desk: React.FC = () => {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 798,
          height: 24,
          background: "linear-gradient(180deg, #1c2533 0%, #141b25 100%)",
          borderTop: "2px solid rgba(255, 255, 255, 0.06)",
          boxShadow: "0 -18px 40px rgba(0,0,0,0.35)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 822,
          bottom: 0,
          background:
            "linear-gradient(180deg, #10161f 0%, #0b1017 55%, #080c12 100%)",
          borderTop: "1px solid rgba(255, 255, 255, 0.04)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 900,
          height: 1,
          background: "rgba(255, 255, 255, 0.035)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 990,
          height: 1,
          background: "rgba(255, 255, 255, 0.03)",
        }}
      />
    </>
  );
};

const Keyboard: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        left: 468,
        top: 748,
        width: 306,
        height: 52,
        borderRadius: 8,
        background: "linear-gradient(180deg, #232c39 0%, #161d27 100%)",
        border: "1px solid #2c3746",
        boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
        padding: "6px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {[12, 12, 11, 9].map((keys, row) => (
        <div
          key={row}
          style={{
            display: "flex",
            gap: 3,
            flex: 1,
            justifyContent: "center",
          }}
        >
          {Array.from({ length: keys }).map((_, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                borderRadius: 2,
                background:
                  (row === 3 && index === 4) || (row === 1 && index === 6)
                    ? "rgba(88, 166, 255, 0.55)"
                    : "#2b3543",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

const DeskLamp: React.FC = () => {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: -40,
          top: 520,
          width: 380,
          height: 300,
          background:
            "radial-gradient(closest-side, rgba(210, 153, 34, 0.20), transparent 72%)",
          filter: "blur(18px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 56,
          top: 760,
          width: 82,
          height: 40,
          borderRadius: "50%",
          background: "#1b232d",
          border: "1px solid #2c3746",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 92,
          top: 640,
          width: 7,
          height: 130,
          background: "#232c39",
          borderRadius: 4,
          rotate: "-8deg",
          transformOrigin: "bottom center",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 58,
          top: 604,
          width: 96,
          height: 44,
          borderRadius: "50% 50% 8px 8px",
          background: "linear-gradient(180deg, #2a3442, #1a212b)",
          border: "1px solid #354152",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 644,
          width: 72,
          height: 10,
          borderRadius: "50%",
          background: "rgba(210, 153, 34, 0.35)",
          filter: "blur(4px)",
        }}
      />
    </>
  );
};
