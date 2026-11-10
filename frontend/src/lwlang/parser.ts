import type {
  AstNode,
  Block,
  FnDecl,
  IfStmt,
  LetStmt,
  MatchArm,
  MatchStmt,
  Param,
  Program,
} from './ast'
import type { RawDiagnostic } from './diagnostics'
import type { Token } from './tokenizer'
import { tokenize } from './tokenizer'
import { KEYWORDS_BY_VERSION, TYPE_NAMES, isKeyword, type LangVersion } from './version'

export interface ParseResult {
  ast: Program
  diagnostics: RawDiagnostic[]
  tokens: Token[]
}

class ParseError extends Error {}

const STMT_START = new Set([
  'let',
  'mut',
  'if',
  'elif',
  'else',
  'while',
  'for',
  'return',
  'speak',
  'match',
  'fn',
  'case',
])

class Parser {
  private tokens: Token[]
  private pos = 0
  diagnostics: RawDiagnostic[] = []
  private activeKeywords: Set<string>

  constructor(tokens: Token[], private code: string, private version: LangVersion) {
    this.tokens = tokens
    this.activeKeywords = new Set(KEYWORDS_BY_VERSION[version])
  }

  parseProgram(): Program {
    const body: AstNode[] = []
    while (!this.atEof()) {
      if (this.at('}')) {
        const token = this.next()
        this.report('Unexpected closing brace', 'SYN002', token)
        continue
      }
      try {
        if (this.at('fn')) {
          body.push(this.parseFn())
        } else {
          body.push(this.parseStmt())
        }
      } catch (error) {
        if (!(error instanceof ParseError)) throw error
        this.synchronize()
      }
    }
    return { type: 'Program', body, from: 0, to: this.code.length }
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.max(0, Math.min(this.pos + offset, this.tokens.length - 1))]
  }

  private next(): Token {
    const token = this.peek()
    if (this.pos < this.tokens.length - 1) this.pos += 1
    return token
  }

  private atEof(): boolean {
    return this.peek().type === 'eof'
  }

  private at(value: string): boolean {
    return this.peek().value === value
  }

  private eat(value: string): boolean {
    if (this.at(value)) {
      this.next()
      return true
    }
    return false
  }

  private expect(value: string, message: string): Token {
    if (this.at(value)) return this.next()
    const token = this.peek()
    this.report(message, 'SYN001', token)
    throw new ParseError(message)
  }

  private expectIdent(message: string): Token {
    const token = this.peek()
    if (token.type === 'ident') return this.next()
    this.report(message, 'SYN001', token)
    throw new ParseError(message)
  }

  private expectType(message: string): Token {
    const token = this.peek()
    if (token.type === 'ident' || TYPE_NAMES.has(token.value)) return this.next()
    this.report(message, 'SYN001', token)
    throw new ParseError(message)
  }

  private report(message: string, code: string, token: Token, severity: RawDiagnostic['severity'] = 'error'): void {
    this.diagnostics.push({
      severity,
      message,
      code,
      from: token.from,
      to: Math.max(token.to, token.from + 1),
    })
  }

  private checkVersionKeyword(token: Token): void {
    if (token.type === 'keyword' && isKeyword(token.value) && !this.activeKeywords.has(token.value)) {
      this.diagnostics.push({
        severity: 'error',
        message: `'${token.value}' is not available in ${this.version}`,
        code: 'LANG002',
        from: token.from,
        to: token.to,
      })
      throw new ParseError('version-gated keyword')
    }
  }

  private synchronize(): void {
    if (!this.atEof()) this.pos += 1
    let depth = 0
    while (!this.atEof()) {
      const token = this.peek()
      if (token.value === '}') {
        if (depth === 0) return
        depth -= 1
      } else if (token.value === '{') {
        depth += 1
      } else if (depth === 0 && token.type === 'keyword' && STMT_START.has(token.value)) {
        return
      }
      this.pos += 1
    }
  }

  private parseFn(): FnDecl {
    const fnToken = this.next()
    const nameToken = this.peek()
    if (nameToken.type !== 'ident') {
      this.report('Expected function name', 'SYN001', nameToken)
      throw new ParseError('fn name')
    }
    this.next()
    this.expect('(', "Expected '(' after function name")
    const params: Param[] = []
    if (!this.at(')')) {
      do {
        const paramToken = this.peek()
        if (paramToken.type !== 'ident') {
          this.report('Expected parameter name', 'SYN001', paramToken)
          throw new ParseError('param name')
        }
        this.next()
        let annotation: string | null = null
        if (this.eat(':')) {
          const typeToken = this.expectType('Expected parameter type')
          annotation = typeToken.value
        }
        params.push({
          type: 'Param',
          name: paramToken.value,
          annotation,
          from: paramToken.from,
          to: annotation ? this.peek(-1).to : paramToken.to,
        })
      } while (this.eat(','))
    }
    this.expect(')', "Expected ')' after parameters")
    let returnType: string | null = null
    if (this.eat('->')) {
      returnType = this.expectType('Expected return type').value
    }
    const body = this.parseBlock()
    return {
      type: 'FnDecl',
      name: nameToken.value,
      nameFrom: nameToken.from,
      nameTo: nameToken.to,
      params,
      returnType,
      body,
      from: fnToken.from,
      to: body.to,
    }
  }

  private parseBlock(): Block {
    const open = this.expect('{', "Expected '{'")
    const body: AstNode[] = []
    while (!this.at('}') && !this.atEof()) {
      try {
        body.push(this.parseStmt())
      } catch (error) {
        if (!(error instanceof ParseError)) throw error
        this.synchronize()
      }
    }
    let end: Token
    if (this.at('}')) {
      end = this.next()
    } else {
      this.diagnostics.push({
        severity: 'error',
        message: "Unclosed block: expected '}'",
        code: 'SYN002',
        from: open.from,
        to: Math.min(open.from + 2, this.code.length),
      })
      end = this.peek()
    }
    return { type: 'Block', body, from: open.from, to: end.to }
  }

  private parseStmt(): AstNode {
    const token = this.peek()
    this.checkVersionKeyword(token)

    switch (token.value) {
      case '{':
        return this.parseBlock()
      case 'let':
      case 'mut':
        return this.parseLet()
      case 'if':
        return this.parseIf()
      case 'while':
        return this.parseWhile()
      case 'for':
        return this.parseFor()
      case 'return':
        return this.parseReturn()
      case 'speak':
        return this.parseSpeak()
      case 'match':
        return this.parseMatch()
      case 'fn':
        this.report('Functions must be declared at the top level', 'SYN001', token)
        throw new ParseError('nested fn')
      default:
        break
    }

    if (token.type === 'keyword' && token.value !== 'true' && token.value !== 'false') {
      this.report(`Unexpected keyword '${token.value}'`, 'SYN001', token)
      throw new ParseError('unexpected keyword')
    }

    const expr = this.parseExpr()
    const opToken = this.peek()
    if (['=', '+=', '-=', '*=', '/='].includes(opToken.value)) {
      this.next()
      const value = this.parseExpr()
      return {
        type: 'AssignStmt',
        target: expr,
        op: opToken.value,
        value,
        from: expr.from,
        to: value.to,
      }
    }
    return { type: 'ExprStmt', expr, from: expr.from, to: expr.to }
  }

  private parseLet(): LetStmt {
    const keyword = this.next()
    const nameToken = this.peek()
    if (nameToken.type !== 'ident') {
      this.report('Expected binding name', 'SYN001', nameToken)
      throw new ParseError('let name')
    }
    this.next()
    let annotation: string | null = null
    if (this.eat(':')) {
      annotation = this.expectType('Expected binding type').value
    }
    let init: AstNode | null = null
    if (this.eat('=')) {
      init = this.parseExpr()
    }
    return {
      type: 'LetStmt',
      mutable: keyword.value === 'mut',
      name: nameToken.value,
      nameFrom: nameToken.from,
      nameTo: nameToken.to,
      annotation,
      init,
      from: keyword.from,
      to: init ? init.to : this.peek(-1).to,
    }
  }

  private parseIf(): IfStmt {
    const ifToken = this.next()
    const cond = this.parseExpr()
    const then = this.parseBlock()
    const elifs: IfStmt['elifs'] = []
    while (this.eat('elif')) {
      const elifCond = this.parseExpr()
      const block = this.parseBlock()
      elifs.push({ cond: elifCond, block, from: elifCond.from, to: block.to })
    }
    let elseBlock: Block | null = null
    if (this.eat('else')) {
      elseBlock = this.parseBlock()
    }
    const last = elseBlock ?? elifs[elifs.length - 1]?.block ?? then
    return {
      type: 'IfStmt',
      cond,
      then,
      elifs,
      elseBlock,
      from: ifToken.from,
      to: last.to,
    }
  }

  private parseWhile(): AstNode {
    const token = this.next()
    const cond = this.parseExpr()
    const body = this.parseBlock()
    return { type: 'WhileStmt', cond, body, from: token.from, to: body.to }
  }

  private parseFor(): AstNode {
    const token = this.next()
    const nameToken = this.expectIdent('Expected loop variable name')
    this.expect('in', "Expected 'in' in for loop")
    const iter = this.parseExpr()
    const body = this.parseBlock()
    return {
      type: 'ForStmt',
      name: nameToken.value,
      nameFrom: nameToken.from,
      nameTo: nameToken.to,
      iter,
      body,
      from: token.from,
      to: body.to,
    }
  }

  private parseReturn(): AstNode {
    const token = this.next()
    const value = this.at('}') || this.atEof() ? null : this.parseExpr()
    return { type: 'ReturnStmt', value, from: token.from, to: value ? value.to : token.to }
  }

  private parseSpeak(): AstNode {
    const token = this.next()
    const value = this.at('}') || this.atEof() ? null : this.parseExpr()
    return { type: 'SpeakStmt', value, from: token.from, to: value ? value.to : token.to }
  }

  private parseMatch(): MatchStmt {
    const token = this.next()
    const subject = this.parseExpr()
    this.expect('{', "Expected '{' after match subject")
    const arms: MatchArm[] = []
    let hasWildcard = false
    while (!this.at('}') && !this.atEof()) {
      if (this.eat('case')) {
        const pattern = this.parsePattern()
        let guard: AstNode | null = null
        if (this.eat('if')) {
          guard = this.parseExpr()
        }
        this.expect('->', "Expected '->' in match arm")
        const body = this.at('{') ? this.parseBlock() : this.parseExpr()
        arms.push({
          type: 'MatchArm',
          pattern,
          guard,
          body,
          from: pattern.from,
          to: body.to,
        })
        continue
      }
      if (this.at('_') && this.peek(1).value === '->') {
        const wildcard = this.next()
        this.next()
        hasWildcard = true
        const body = this.at('{') ? this.parseBlock() : this.parseExpr()
        arms.push({
          type: 'MatchArm',
          pattern: { type: 'WildcardPattern', from: wildcard.from, to: wildcard.to },
          guard: null,
          body,
          from: wildcard.from,
          to: body.to,
        })
        continue
      }
      this.report("Expected 'case', '_' or '}' in match", 'SYN001', this.peek())
      throw new ParseError('match arm')
    }
    const close = this.expect('}', "Expected '}' to close match")
    return {
      type: 'MatchStmt',
      subject,
      arms,
      hasWildcard,
      from: token.from,
      to: close.to,
    }
  }

  private parsePattern(): AstNode {
    const token = this.peek()
    this.checkVersionKeyword(token)
    if (token.type === 'ident' && token.value === '_') {
      this.next()
      return { type: 'WildcardPattern', from: token.from, to: token.to }
    }
    if (token.type === 'ident') {
      this.next()
      const args: AstNode[] = []
      if (this.eat('(')) {
        if (!this.at(')')) {
          do {
            args.push(this.parsePattern())
          } while (this.eat(','))
        }
        this.expect(')', "Expected ')' after pattern arguments")
      }
      return { type: 'NamedPattern', name: token.value, args, from: token.from, to: this.peek(-1).to }
    }
    const value = this.parsePrimary()
    return { type: 'LiteralPattern', value, from: value.from, to: value.to }
  }

  private parseExpr(): AstNode {
    return this.parseOr()
  }

  private parseOr(): AstNode {
    let left = this.parseAnd()
    while (this.at('or')) {
      this.next()
      const right = this.parseAnd()
      left = { type: 'BinaryExpr', op: 'or', left, right, from: left.from, to: right.to }
    }
    return left
  }

  private parseAnd(): AstNode {
    let left = this.parseNot()
    while (this.at('and')) {
      this.next()
      const right = this.parseNot()
      left = { type: 'BinaryExpr', op: 'and', left, right, from: left.from, to: right.to }
    }
    return left
  }

  private parseNot(): AstNode {
    if (this.at('not')) {
      const token = this.next()
      const operand = this.parseNot()
      return { type: 'UnaryExpr', op: 'not', operand, from: token.from, to: operand.to }
    }
    return this.parseCompare()
  }

  private parseCompare(): AstNode {
    let left = this.parseAdd()
    while (['==', '!=', '<', '<=', '>', '>='].includes(this.peek().value)) {
      const op = this.next()
      const right = this.parseAdd()
      left = { type: 'BinaryExpr', op: op.value, left, right, from: left.from, to: right.to }
    }
    return left
  }

  private parseAdd(): AstNode {
    let left = this.parseMul()
    while (['+', '-'].includes(this.peek().value) || this.at('cat')) {
      if (this.at('cat')) this.checkVersionKeyword(this.peek())
      const op = this.next()
      const right = this.parseMul()
      left = { type: 'BinaryExpr', op: op.value, left, right, from: left.from, to: right.to }
    }
    return left
  }

  private parseMul(): AstNode {
    let left = this.parseUnary()
    while (['*', '/', '%'].includes(this.peek().value)) {
      const op = this.next()
      const right = this.parseUnary()
      left = { type: 'BinaryExpr', op: op.value, left, right, from: left.from, to: right.to }
    }
    return left
  }

  private parseUnary(): AstNode {
    if (this.at('-') || this.at('not')) {
      const op = this.next()
      const operand = this.parseUnary()
      return { type: 'UnaryExpr', op: op.value, operand, from: op.from, to: operand.to }
    }
    return this.parsePostfix()
  }

  private parsePostfix(): AstNode {
    let expr = this.parsePrimary()
    for (;;) {
      if (this.eat('(')) {
        const args: AstNode[] = []
        if (!this.at(')')) {
          do {
            args.push(this.parseExpr())
          } while (this.eat(','))
        }
        const close = this.expect(')', "Expected ')' after arguments")
        expr = { type: 'CallExpr', callee: expr, args, from: expr.from, to: close.to }
        continue
      }
      if (this.eat('[')) {
        const index = this.parseExpr()
        const close = this.expect(']', "Expected ']'")
        expr = { type: 'IndexExpr', object: expr, index, from: expr.from, to: close.to }
        continue
      }
      if (this.eat('.')) {
        const prop = this.expectIdent('Expected property name after .')
        expr = { type: 'MemberExpr', object: expr, property: prop.value, from: expr.from, to: prop.to }
        continue
      }
      break
    }
    return expr
  }

  private parsePrimary(): AstNode {
    const token = this.peek()
    this.checkVersionKeyword(token)

    if (token.type === 'number') {
      this.next()
      const isFloat = token.value.includes('.')
      return {
        type: 'NumberLit',
        raw: token.value,
        value: Number(token.value),
        isFloat,
        from: token.from,
        to: token.to,
      }
    }

    if (token.type === 'string') {
      this.next()
      return {
        type: 'StringLit',
        raw: token.value,
        value: token.value.slice(1, -1).replace(/\\(.)/g, '$1'),
        from: token.from,
        to: token.to,
      }
    }

    if (token.value === 'true' || token.value === 'false') {
      this.next()
      return { type: 'BoolLit', value: token.value === 'true', from: token.from, to: token.to }
    }

    if (token.type === 'ident') {
      this.next()
      return { type: 'Ident', name: token.value, from: token.from, to: token.to }
    }

    if (token.value === '(') {
      this.next()
      const expr = this.parseExpr()
      const close = this.expect(')', "Expected ')'")
      return { ...expr, from: token.from, to: close.to }
    }

    if (token.value === '[') {
      this.next()
      const items: AstNode[] = []
      if (!this.at(']')) {
        do {
          items.push(this.parseExpr())
        } while (this.eat(','))
      }
      const close = this.expect(']', "Expected ']' after array literal")
      return { type: 'ArrayLit', items, from: token.from, to: close.to }
    }

    this.report(`Unexpected token '${token.value || 'end of file'}'`, 'SYN001', token)
    throw new ParseError('unexpected token')
  }
}

export function parse(code: string, version: LangVersion): ParseResult {
  const { tokens, errors } = tokenize(code)
  const parser = new Parser(
    tokens.filter((token) => token.type !== 'comment'),
    code,
    version,
  )
  const ast = parser.parseProgram()
  const diagnostics = [...errors, ...parser.diagnostics]
  return { ast, diagnostics, tokens }
}
