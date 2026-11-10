# LWLang v0.3 (language seed spec)

LWLang is a small, brace-delimited, statically-typed-looking language used in LangWars.
The arena's gimmick: **the language grows with the tasks**. A task declares the language
version and the addon packs it enables.

> The parser in `src/lwlang` is the reference implementation used by the editor.
> The backend judge will eventually use an equivalent compiler.

## Versions

| Version | Adds | Addon pack |
| --- | --- | --- |
| v0.1 | core language, `print` | `core` |
| v0.2 | `match` / `case` / `_`, string concat with `cat` | `match` |
| v0.3 | `speak expr` (formatted print), `len(x)`, `push(arr, x)` | `speak` |

Tasks select a version; the editor only accepts keywords available in that version.
Version-gated syntax produces a `LANG002` error (unknown keyword).

## Lexical

- Comments: `// line`, `/* block */`
- Identifiers: `[A-Za-z_][A-Za-z0-9_]*`
- Keywords (v0.3): `fn let mut if elif else while for in return match case true false
  and or not speak`
- Types: `int float bool str arr void`
- Literals: decimal ints, floats, `"strings"` with `\n \t \" \\` escapes, `true/false`
- Operators: `+ - * / % == != < <= > >= = += -= *= /= -> , . ( ) { } [ ] :` and `_`

## Grammar (informal)

```ebnf
program    := item*
item       := fnDecl
fnDecl     := "fn" ident "(" params? ")" ( "->" type )? block
params     := ident ":" type ("," ident ":" type)*
block      := "{" stmt* "}"
stmt       := letStmt | assign | exprStmt | ifStmt | whileStmt | forStmt
            | returnStmt | speakStmt | matchStmt | block
letStmt    := ("let" | "mut") ident (":" type)? "=" expr
assign     := lvalue ("=" | "+=" | "-=" | "*=" | "/=") expr
ifStmt     := "if" expr block ("elif" expr block)* ("else" block)?
whileStmt  := "while" expr block
forStmt    := "for" ident "in" expr block
returnStmt := "return" expr?
speakStmt  := "speak" expr
matchStmt  := "match" expr "{" ("case" pattern ("if" expr)? "->" (block | expr))* ("_" "->" (block|expr))? "}"
pattern    := literal | "_" | ident | ident "(" pattern,* ")"
expr       := orExpr
orExpr     := andExpr ("or" andExpr)*
andExpr    := notExpr ("and" notExpr)*
notExpr    := "not" notExpr | cmpExpr
cmpExpr    := addExpr (("=="|"!="|"<"|"<="|">"|">=") addExpr)*
addExpr    := mulExpr (("+"|"-"|"cat") mulExpr)*
mulExpr    := unary (("*"|"/"|"%") unary)*
unary      := ("-"|"not") unary | postfix
postfix    := primary ("(" args ")")? ("[" expr "]")?
primary    := number | string | bool | ident | "(" expr ")" | arrayLit
arrayLit   := "[" (expr ("," expr)*)? "]"
```

`cat` is an infix string concatenation operator introduced in v0.2:
`"nya " cat name`.

## Semantics (brief)

- All values are dynamically typed at runtime; annotations are advisory and checked by
  the `types` addon (warnings only in this slice).
- `speak x` prints `x` followed by a newline.
- Truthiness: `0`, `""`, `false`, `[]` are falsy.
- Functions are top-level only in v0.3.

## Addon packs

An addon pack may contribute:

1. `keywords` — merged into highlighting/autocomplete for its version.
2. `passes` — diagnostics. Each pass declares `kind: 'source' | 'ast'`.
   - **source passes** receive `{ code, lines }`.
   - **ast passes** receive `{ ast, tokens }`.
3. Optional future `grammarPatch` (reserved; currently ignored by the mock highlighter).

Diagnostics returned:

```ts
type Diagnostic = {
  severity: 'error' | 'warning' | 'info'
  message: string
  code: string          // stable, e.g. LW1001
  addonId: string
  from: number          // offset
  to: number            // offset
}
```

### Core passes (always on)

| Code | Kind | Severity | Rule |
| --- | --- | --- | --- |
| `SYN001` | ast | error | unexpected token / parse error |
| `SYN002` | ast | error | unclosed block/bracket |
| `LANG002` | ast | error | keyword not available in this language version |
| `STYLE001` | source | warning | trailing whitespace |
| `STYLE002` | source | warning | tab character (spaces only) |
| `STYLE003` | source | info | line longer than 100 chars |
| `NAME001` | ast | warning | function not in `snake_case` |
| `UNUSED01` | ast | warning | `let` binding never read |
| `NOBASE01` | ast | warning | recursive call with no obvious base case |

### Pack passes

| Pack | Code | Kind | Rule |
| --- | --- | --- | --- |
| `match` | `MATCH01` | ast | `match` without `_` wildcard (non-exhaustive) |
| `match` | `MATCH02` | ast | duplicate case literal |
| `speak` | `SPEAK01` | ast | `speak` with no argument |
| `speak` | `SPEAK02` | ast | `cat` used with a non-string literal |
| `perf` (task addon) | `PERF01` | source | block nesting deeper than 4 |
| `perf` (task addon) | `PERF02` | ast | loop body larger than 40 statements |
