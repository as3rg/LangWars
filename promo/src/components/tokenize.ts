import { COLORS } from "../theme";

export type Token = {
  text: string;
  color: string;
  italic?: boolean;
};

const keywords = new Set([
  "fn",
  "let",
  "while",
  "if",
  "else",
  "return",
  "true",
  "false",
  "comefrom",
]);

const builtins = new Set([
  "length",
  "set",
  "get",
  "push_back",
  "empty",
  "truthy",
  "eq",
  "cmp",
  "concat",
  "make_set",
]);

const tokenPattern =
  /\/\/.*$|"(?:[^"\\]|\\.)*"|@[A-Za-z_]+|\b(?:fn|let|while|if|else|return|true|false|comefrom)\b|\b-?\d+\b|[A-Za-z_][A-Za-z0-9_]*|\s+|./g;

export const tokenize = (line: string): Token[] => {
  const pieces = line.match(tokenPattern) ?? [];
  return pieces.map((piece) => {
    if (piece.startsWith("//")) {
      return { text: piece, color: "#6e7681", italic: true };
    }
    if (piece.startsWith('"')) {
      return { text: piece, color: "#a5d6ff" };
    }
    if (piece.startsWith("@")) {
      return { text: piece, color: COLORS.purple };
    }
    if (keywords.has(piece)) {
      return { text: piece, color: "#ff7b72" };
    }
    if (/^-?\d+$/.test(piece)) {
      return { text: piece, color: "#79c0ff" };
    }
    if (builtins.has(piece)) {
      return { text: piece, color: "#ffa657" };
    }
    if (/^\s+$/.test(piece)) {
      return { text: piece, color: COLORS.text };
    }
    if (/^[A-Za-z_]/.test(piece)) {
      return { text: piece, color: "#c9d1d9" };
    }
    return { text: piece, color: "#8b949e" };
  });
};
