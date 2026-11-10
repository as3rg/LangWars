export interface BaseNode {
  type: string
  from: number
  to: number
}

export interface Program extends BaseNode {
  type: 'Program'
  body: AstNode[]
}

export interface FnDecl extends BaseNode {
  type: 'FnDecl'
  name: string
  nameFrom: number
  nameTo: number
  params: Param[]
  returnType: string | null
  body: Block
}

export interface Param extends BaseNode {
  type: 'Param'
  name: string
  annotation: string | null
}

export interface Block extends BaseNode {
  type: 'Block'
  body: AstNode[]
}

export interface LetStmt extends BaseNode {
  type: 'LetStmt'
  mutable: boolean
  name: string
  nameFrom: number
  nameTo: number
  annotation: string | null
  init: AstNode | null
}

export interface AssignStmt extends BaseNode {
  type: 'AssignStmt'
  target: AstNode
  op: string
  value: AstNode
}

export interface ExprStmt extends BaseNode {
  type: 'ExprStmt'
  expr: AstNode
}

export interface IfStmt extends BaseNode {
  type: 'IfStmt'
  cond: AstNode
  then: Block
  elifs: Array<{ cond: AstNode; block: Block; from: number; to: number }>
  elseBlock: Block | null
}

export interface WhileStmt extends BaseNode {
  type: 'WhileStmt'
  cond: AstNode
  body: Block
}

export interface ForStmt extends BaseNode {
  type: 'ForStmt'
  name: string
  nameFrom: number
  nameTo: number
  iter: AstNode
  body: Block
}

export interface ReturnStmt extends BaseNode {
  type: 'ReturnStmt'
  value: AstNode | null
}

export interface SpeakStmt extends BaseNode {
  type: 'SpeakStmt'
  value: AstNode | null
}

export interface MatchArm extends BaseNode {
  type: 'MatchArm'
  pattern: AstNode
  guard: AstNode | null
  body: AstNode
}

export interface MatchStmt extends BaseNode {
  type: 'MatchStmt'
  subject: AstNode
  arms: MatchArm[]
  hasWildcard: boolean
}

export interface Ident extends BaseNode {
  type: 'Ident'
  name: string
}

export interface NumberLit extends BaseNode {
  type: 'NumberLit'
  raw: string
  value: number
  isFloat: boolean
}

export interface StringLit extends BaseNode {
  type: 'StringLit'
  raw: string
  value: string
}

export interface BoolLit extends BaseNode {
  type: 'BoolLit'
  value: boolean
}

export interface ArrayLit extends BaseNode {
  type: 'ArrayLit'
  items: AstNode[]
}

export interface UnaryExpr extends BaseNode {
  type: 'UnaryExpr'
  op: string
  operand: AstNode
}

export interface BinaryExpr extends BaseNode {
  type: 'BinaryExpr'
  op: string
  left: AstNode
  right: AstNode
}

export interface CallExpr extends BaseNode {
  type: 'CallExpr'
  callee: AstNode
  args: AstNode[]
}

export interface MemberExpr extends BaseNode {
  type: 'MemberExpr'
  object: AstNode
  property: string
}

export interface IndexExpr extends BaseNode {
  type: 'IndexExpr'
  object: AstNode
  index: AstNode
}

export interface WildcardPattern extends BaseNode {
  type: 'WildcardPattern'
}

export interface LiteralPattern extends BaseNode {
  type: 'LiteralPattern'
  value: AstNode
}

export interface NamedPattern extends BaseNode {
  type: 'NamedPattern'
  name: string
  args: AstNode[]
}

export type AstNode =
  | Program
  | FnDecl
  | Param
  | Block
  | LetStmt
  | AssignStmt
  | ExprStmt
  | IfStmt
  | WhileStmt
  | ForStmt
  | ReturnStmt
  | SpeakStmt
  | MatchStmt
  | MatchArm
  | Ident
  | NumberLit
  | StringLit
  | BoolLit
  | ArrayLit
  | UnaryExpr
  | BinaryExpr
  | CallExpr
  | MemberExpr
  | IndexExpr
  | WildcardPattern
  | LiteralPattern
  | NamedPattern

export function isNode(value: unknown): value is AstNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    typeof (value as { from?: unknown }).from === 'number' &&
    typeof (value as { to?: unknown }).to === 'number'
  )
}

export function walk(node: AstNode, visit: (node: AstNode, parent: AstNode | null) => void, parent: AstNode | null = null): void {
  visit(node, parent)
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'from' || key === 'to') continue
    const value = (node as unknown as Record<string, unknown>)[key]
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) walk(item, visit, node)
      }
    } else if (isNode(value)) {
      walk(value, visit, node)
    }
  }
}

export function walkStatements(block: Block, visit: (node: AstNode) => void): void {
  for (const stmt of block.body) walk(stmt, visit)
}

export function collectNodes(node: AstNode): AstNode[] {
  const nodes: AstNode[] = []
  walk(node, (child) => nodes.push(child))
  return nodes
}
