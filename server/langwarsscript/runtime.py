from __future__ import annotations
import copy
import hashlib
import json
import re
import random
import time
import unicodedata
from dataclasses import dataclass

TYPES = ("int", "string", "list", "dict")
OPERATIONS = ("eq", "cmp", "get", "set", "length", "contains", "empty", "push_back", "truthy", "concat", "cast")
BUILTINS = {f"__builtin_{n}__" for n in ("eq", "lt", "get", "set", "length", "concat", "contains")}
KEYWORDS = {"fn", "let", "return", "if", "else", "while", "comefrom", "and", "or", "not", "solution", "float", "function"}
RESTRICTABLE_KEYWORDS = {"let", "return", "if", "else", "while", "comefrom", "and", "or", "not"}
RESERVED = set(OPERATIONS) | set(TYPES) | BUILTINS | KEYWORDS
LIMIT = 1_000_000

class Rejected(Exception):
    def __init__(self, message, code="INVALID_PROGRAM", pos=0):
        super().__init__(message)
        self.message, self.code, self.pos = message, code, pos

class Exhausted(Rejected):
    def __init__(self, message="Execution budget exhausted"):
        super().__init__(message, "RESOURCE_LIMIT")

def diagnostic(error):
    return {"severity": "error", "message": error.message, "code": error.code, "addonId": "core", "from": error.pos, "to": error.pos + 1}

def wrap(number):
    return (number + LIMIT) % (2 * LIMIT + 1) - LIMIT

@dataclass
class Token:
    kind: str
    value: object
    pos: int
    line: int

def tokenize(source):
    if not isinstance(source, str) or len(source.encode("utf-8", errors="replace")) > 65536:
        raise Rejected("Source exceeds 64 KiB", "SOURCE_LIMIT")
    result, i, line = [], 0, 1
    while i < len(source):
        ch = source[i]
        if ch.isspace():
            line += ch == "\n"
            i += 1
            continue
        if source.startswith("//", i):
            end = source.find("\n", i)
            i = len(source) if end < 0 else end
            continue
        if source.startswith("/*", i):
            end = source.find("*/", i + 2)
            if end < 0:
                raise Rejected("Unterminated comment", pos=i)
            line += source[i:end + 2].count("\n")
            i = end + 2
            continue
        start, start_line = i, line
        if ch == '"':
            i += 1
            escaped = False
            while i < len(source):
                if source[i] == '"' and not escaped:
                    i += 1
                    break
                if source[i] in "\r\n":
                    raise Rejected("Newlines in strings must be escaped", pos=start)
                escaped = source[i] == "\\" and not escaped
                i += 1
            else:
                raise Rejected("Unterminated string", pos=start)
            try:
                value = json.loads(source[start:i])
                value.encode("utf-8")
            except (ValueError, UnicodeError):
                raise Rejected("Invalid string escape", pos=start)
            result.append(Token("string", value, start, start_line))
        elif "0" <= ch <= "9":
            value = 0
            while i < len(source) and "0" <= source[i] <= "9":
                value = (value * 10 + ord(source[i]) - 48) % (2 * LIMIT + 1)
                i += 1
            if i < len(source) and source[i] in ".eE":
                raise Rejected("float is not supported on this platform", "UNSUPPORTED_TYPE", start)
            result.append(Token("int", wrap(value), start, start_line))
        elif ch.isascii() and (ch.isalpha() or ch == "_"):
            while i < len(source) and source[i].isascii() and (source[i].isalnum() or source[i] == "_"):
                i += 1
            value = source[start:i]
            if value not in BUILTINS and not re.fullmatch(r"[A-Za-z]+(?:_[A-Za-z]+)*", value):
                raise Rejected("Names must contain English words separated by underscores", "INVALID_NAME", start)
            result.append(Token("id", value, start, start_line))
        else:
            pair = source[i:i + 2]
            if pair == "==":
                raise Rejected("Use = for equality; == is forbidden", pos=i)
            if pair in ("!=", "<=", ">="):
                i += 2
                result.append(Token(pair, pair, start, start_line))
            elif ch in "{}[](),;:@=+-*/%<>":
                i += 1
                result.append(Token(ch, ch, start, start_line))
            else:
                raise Rejected("Unexpected character", pos=i)
        if len(result) > 16384:
            raise Rejected("Too many tokens", "SOURCE_LIMIT", i)
    result.append(Token("eof", "eof", len(source), line))
    return result

class Parser:
    def __init__(self, source, options):
        self.tokens, self.index, self.depth = tokenize(source), 0, 0
        self.source = source
        deny = [unicodedata.normalize("NFKC", word).casefold() for word in options.get("deny_words", []) if word]
        moderation_texts = [source] + [token.value for token in self.tokens if token.kind == "string"]
        if any(word in unicodedata.normalize("NFKC", text).casefold() for text in moderation_texts for word in deny):
            raise Rejected("Code contains a word blocked by the platform", "DENIED_WORD")
        self.options = options
        allowed_keywords = options.get("allowed_keywords")
        if allowed_keywords is not None:
            for token in self.tokens:
                if token.kind == "id" and token.value in RESTRICTABLE_KEYWORDS and token.value not in allowed_keywords:
                    raise Rejected(f"Keyword {token.value} is disabled for this task", "KEYWORD_DISABLED", token.pos)
        self.names, self.declared, self.labels = set(), set(), set()
        raw_words = options.get("allowed_words")
        self.words = None if raw_words is None else {str(word).lower() for word in raw_words}
        self.source_id = hashlib.sha256(source.encode("utf-8", errors="replace")).hexdigest()[:24]

    @property
    def current(self):
        return self.tokens[self.index]

    def accept(self, value):
        if self.current.kind not in ("string", "int") and self.current.value == value:
            token = self.current
            self.index += 1
            return token
        return None

    def expect(self, value):
        token = self.accept(value)
        if not token:
            raise Rejected(f"Expected {value}", pos=self.current.pos)
        return token

    def identifier(self, declare=False):
        token = self.current
        if token.kind != "id" or token.value in RESERVED:
            raise Rejected("Expected an unreserved identifier", "RESERVED_NAME", token.pos)
        self.index += 1
        maximum = self.options.get("max_name_length")
        if maximum is not None and len(token.value) > maximum:
            raise Rejected(f"Names may contain at most {maximum} characters", "NAME_LENGTH", token.pos)
        if self.words is not None and any(word.lower() not in self.words for word in token.value.split("_")):
            raise Rejected(f"Name {token.value} contains a word outside the allowed dictionary", "INVALID_NAME", token.pos)
        self.names.add(token.value)
        if declare:
            if token.value in self.declared:
                raise Rejected(f"Duplicate declaration: {token.value}", "DUPLICATE_NAME", token.pos)
            self.declared.add(token.value)
        return token.value

    def type_name(self):
        token = self.current
        if token.kind != "id" or token.value not in TYPES:
            raise Rejected("Only int, string, list and dict types are supported", "UNSUPPORTED_TYPE", token.pos)
        self.index += 1
        return token.value

    def parse(self):
        functions, top = {}, []
        while self.current.kind != "eof":
            if self.current.value in ("@", "fn"):
                source_start = self.current.pos
                token_start = self.index
                annotation, cast_to = None, None
                if self.accept("@"):
                    annotation = self.current.value
                    if self.current.kind != "id" or annotation not in OPERATIONS + ("solution",):
                        raise Rejected("Unknown annotation", pos=self.current.pos)
                    self.index += 1
                    if self.accept("("):
                        if annotation != "cast":
                            raise Rejected("Only @cast accepts a return type", pos=self.current.pos)
                        cast_to = self.type_name()
                        self.expect(")")
                    if annotation == "cast" and cast_to is None:
                        raise Rejected("@cast requires a target type", pos=self.current.pos)
                self.expect("fn")
                types = []
                if self.accept("<"):
                    types.append(self.type_name())
                    while self.accept(","):
                        types.append(self.type_name())
                    self.expect(">")
                name = self.identifier(True)
                self.expect("(")
                params = []
                if not self.accept(")"):
                    params.append(self.identifier())
                    while self.accept(","):
                        params.append(self.identifier())
                    self.expect(")")
                if len(params) != len(set(params)) or (types and len(types) != len(params)):
                    raise Rejected("Parameter names must be unique and type count must match", pos=self.current.pos)
                functions[name] = {"name": name, "params": params, "types": types, "annotation": annotation, "cast_to": cast_to, "body": self.block(), "source_id": self.source_id, "source_order": len(functions)}
                functions[name]["source"] = self.source[source_start:self.tokens[self.index - 1].pos + 1]
                functions[name]["keywords"] = sorted({token.value for token in self.tokens[token_start:self.index] if token.kind == "id" and token.value in RESTRICTABLE_KEYWORDS})
            else:
                statement = self.statement()
                if statement["op"] not in ("let", "assign"):
                    raise Rejected("Only declarations, assignments and functions are allowed globally", pos=statement["pos"])
                top.append(statement)
        solutions = sum(f["annotation"] == "solution" for f in functions.values())
        if solutions > 1 or (self.options.get("require_solution", True) and solutions != 1):
            raise Rejected("Exactly one @solution function is required", "SOLUTION_COUNT")
        permitted = self.options.get("permitted_overrides", OPERATIONS)
        overrides = [f for f in functions.values() if f["annotation"] in OPERATIONS]
        if any(f["annotation"] not in permitted for f in overrides):
            raise Rejected("This operation cannot currently be overridden", "OVERRIDE_DISABLED")
        if len(overrides) > self.options.get("max_overrides", 16):
            raise Rejected("Too many core overrides for this task", "OVERRIDE_LIMIT")
        return {"functions": functions, "top": top, "names": sorted(self.names), "source_id": self.source_id}

    def block(self):
        self.depth += 1
        if self.depth > 64:
            raise Rejected("Syntax nesting limit exceeded", "SOURCE_LIMIT", self.current.pos)
        self.expect("{")
        body = []
        while not self.accept("}"):
            if self.current.kind == "eof":
                raise Rejected("Unclosed block", pos=self.current.pos)
            body.append(self.statement())
        self.depth -= 1
        return body

    def statement(self):
        token = self.current
        base = {"pos": token.pos, "line": token.line}
        if self.accept("if") or self.accept("while"):
            op = token.value
            self.expect("(")
            condition = self.expression()
            self.expect(")")
            body, other = self.block(), []
            if op == "if" and self.accept("else"):
                other = [self.statement()] if self.current.value == "if" else self.block()
            return dict(base, op=op, expr=condition, body=body, other=other)
        if self.accept("return"):
            expr = self.expression()
            self.expect(";")
            return dict(base, op="return", expr=expr)
        if self.accept("comefrom"):
            target = self.current
            if target.kind == "int":
                self.index += 1
                value = target.value
                if value < 1:
                    raise Rejected("comefrom requires a positive executable line", pos=target.pos)
            else:
                value = self.identifier()
            self.expect(";")
            return dict(base, op="comefrom", target=value)
        declaration = bool(self.accept("let"))
        if declaration or (self.current.kind == "id" and self.tokens[self.index + 1].value in ("=", ":")):
            name = self.identifier(declaration)
            if self.accept(":"):
                if declaration or name in self.labels:
                    raise Rejected("Duplicate or invalid label", pos=token.pos)
                self.labels.add(name)
                return dict(base, op="label", name=name)
            self.expect("=")
            expr = self.expression()
            self.expect(";")
            return dict(base, op="let" if declaration else "assign", name=name, expr=expr)
        expr = self.expression()
        if expr[0] != "call":
            raise Rejected("Only calls may be expression statements", pos=token.pos)
        self.expect(";")
        return dict(base, op="call", expr=expr)

    def expression(self, precedence=0):
        self.depth += 1
        if self.depth > 64:
            raise Rejected("Expression nesting limit exceeded", "SOURCE_LIMIT", self.current.pos)
        token = self.current
        if token.kind != "string" and token.value in ("-", "not"):
            self.index += 1
            result = ["unary", token.value, self.expression(7)]
        elif token.kind in ("int", "string"):
            self.index += 1
            result = [token.kind, token.value]
        elif self.accept("("):
            result = self.expression()
            self.expect(")")
        elif self.accept("["):
            items = []
            if not self.accept("]"):
                items.append(self.expression())
                while self.accept(","):
                    items.append(self.expression())
                self.expect("]")
            result = ["list", items]
        elif self.accept("{"):
            items = []
            if not self.accept("}"):
                while True:
                    key = self.expression()
                    self.expect(":")
                    items.append([key, self.expression()])
                    if not self.accept(","):
                        break
                self.expect("}")
            result = ["dict", items]
        elif token.kind == "id" and token.value not in KEYWORDS:
            self.index += 1
            name = token.value
            if name not in RESERVED:
                self.index -= 1
                self.identifier()
            result = ["name", name]
            if self.accept("("):
                args = []
                if not self.accept(")"):
                    args.append(self.expression())
                    while self.accept(","):
                        args.append(self.expression())
                    self.expect(")")
                result = ["call", name, args]
        else:
            raise Rejected("Expected an expression", pos=token.pos)
        levels = {"or": 1, "and": 2, "=": 3, "!=": 3, "<": 4, ">": 4, "<=": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6}
        while self.current.kind not in ("string", "int") and levels.get(self.current.value, 0) > precedence:
            operator = self.current.value
            self.index += 1
            result = ["binary", operator, result, self.expression(levels[operator])]
        self.depth -= 1
        return result

def compile_program(code, options=None):
    try:
        program = Parser(code, options or {}).parse()
        check_builtin_scope(program["top"])
        for function in program["functions"].values():
            check_builtin_scope(function["body"], function.get("annotation"))
        return program
    except RecursionError:
        raise Rejected("Syntax nesting limit exceeded", "SOURCE_LIMIT")

class Dictionary:
    def __init__(self, pairs=None):
        self.pairs = pairs or []

def kind(value):
    if isinstance(value, int): return "int"
    if isinstance(value, str): return "string"
    if isinstance(value, list): return "list"
    if isinstance(value, Dictionary): return "dict"
    raise Rejected("Invalid value in snapshot", "INVALID_SNAPSHOT")

def decode(value, depth=0):
    if depth > 64: raise Exhausted("Value nesting limit exceeded")
    if isinstance(value, bool): return int(value)
    if isinstance(value, int): return wrap(value)
    if isinstance(value, str): return value[:LIMIT]
    if isinstance(value, list): return [decode(v, depth + 1) for v in value]
    if isinstance(value, dict):
        pairs = value.get("$dict")
        if pairs is not None:
            return Dictionary([[decode(k, depth + 1), decode(v, depth + 1)] for k, v in pairs])
        return Dictionary([[decode(k, depth + 1), decode(v, depth + 1)] for k, v in value.items()])
    if value is None: return 0
    raise Rejected("Unsupported input value", "INVALID_INPUT")

def encode(value, seen=None, depth=0, budget=None):
    budget = [100_000] if budget is None else budget
    budget[0] -= 1
    if budget[0] < 0 or depth > 64: raise Exhausted("Value size limit exceeded")
    if isinstance(value, (int, str)): return value
    seen = set() if seen is None else seen
    if id(value) in seen: raise Exhausted("Cyclic values cannot be published")
    seen.add(id(value))
    if isinstance(value, list):
        result = [encode(v, seen, depth + 1, budget) for v in value]
    else:
        result = {"$dict": [[encode(k, seen, depth + 1, budget), encode(v, seen, depth + 1, budget)] for k, v in value.pairs]}
    seen.remove(id(value))
    return result

def builtin_equal(a, b, seen=None, depth=0, budget=None):
    budget = [100_000] if budget is None else budget
    budget[0] -= 1
    if budget[0] < 0 or depth > 64: raise Exhausted("Comparison budget exhausted")
    if kind(a) != kind(b): return False
    if isinstance(a, (str, int)): return a == b
    seen = set() if seen is None else seen
    if (id(a), id(b)) in seen: return True
    seen.add((id(a), id(b)))
    if isinstance(a, list):
        return len(a) == len(b) and all(builtin_equal(x, y, seen, depth + 1, budget) for x, y in zip(a, b))
    if len(a.pairs) != len(b.pairs): return False
    unmatched = list(b.pairs)
    for key, value in a.pairs:
        match = next((i for i, (other, val) in enumerate(unmatched) if builtin_equal(key, other, set(seen), depth + 1, budget) and builtin_equal(value, val, set(seen), depth + 1, budget)), None)
        if match is None: return False
        unmatched.pop(match)
    return True

def flatten(body):
    code = []
    def emit(statements):
        for stmt in statements:
            op = stmt["op"]
            if op in ("if", "while"):
                head = len(code)
                code.append(dict(stmt, op="branch", target=0))
                emit(stmt["body"])
                if op == "while":
                    code.append({"op": "jump", "target": head, "line": 0, "pos": stmt["pos"]})
                    code[head]["target"] = len(code)
                else:
                    end = len(code)
                    code.append({"op": "jump", "target": 0, "line": 0, "pos": stmt["pos"]})
                    code[head]["target"] = len(code)
                    emit(stmt["other"])
                    code[end]["target"] = len(code)
            else:
                code.append(stmt)
    emit(body)
    return code

def expression_walk(expr):
    stack, count = [expr], 0
    while stack:
        item = stack.pop()
        count += 1
        if count > 16384: raise Exhausted("AST limit exceeded")
        yield item
        if item[0] == "call": stack.extend(item[2])
        elif item[0] == "binary": stack.extend(item[2:4])
        elif item[0] == "unary": stack.append(item[2])
        elif item[0] == "list": stack.extend(item[1])
        elif item[0] == "dict":
            for pair in item[1]: stack.extend(pair)

def function_dependencies(function):
    names = set(function["params"])
    for stmt in flatten(function["body"]):
        if stmt["op"] in ("let", "assign"): names.add(stmt["name"])
        for expr in expression_walk(stmt.get("expr", ["int", 0])):
            if expr[0] in ("name", "call") and expr[1] not in RESERVED: names.add(expr[1])
    return names

def check_builtin_scope(body, annotation=None):
    if annotation in OPERATIONS:
        return
    for stmt in flatten(body):
        for expr in expression_walk(stmt.get("expr", ["int", 0])):
            if expr[0] == "call" and expr[1] in BUILTINS:
                raise Rejected("Builtin functions may only be called inside stdlib override definitions", "BUILTIN_SCOPE", stmt.get("pos", 0))


def function_keywords(function):
    """Support both new functions and snapshots authored before keyword policies."""
    found = set(function.get("keywords", []))
    pending, count = list(function["body"]), 0
    while pending:
        stmt = pending.pop()
        count += 1
        if count > 16384: raise Exhausted("AST limit exceeded")
        if stmt["op"] in RESTRICTABLE_KEYWORDS: found.add(stmt["op"])
        if stmt.get("other"): found.add("else")
        pending.extend(stmt.get("body", []))
        pending.extend(stmt.get("other", []))
        for expr in expression_walk(stmt.get("expr", ["int", 0])):
            if expr[0] in ("unary", "binary") and expr[1] in RESTRICTABLE_KEYWORDS:
                found.add(expr[1])
    return found


def check_contract_syntax(function):
    annotation = function.get("annotation")
    if annotation not in OPERATIONS: return
    for stmt in flatten(function["body"]):
        if stmt["op"] == "comefrom": raise Rejected(f"comefrom is forbidden in @{annotation}", "CONTRACT")
        for expr in expression_walk(stmt.get("expr", ["int", 0])):
            if expr[0] == "call" and expr[1] not in BUILTINS:
                raise Rejected(f"Only __builtin_* calls are allowed in @{annotation}", "CONTRACT")

class Runtime:
    def __init__(self, program, snapshot=None, options=None):
        self.options = options or {}
        snapshot = snapshot or {}
        self.original = snapshot
        self.vars = {n: decode(v) for n, v in snapshot.get("variables", {}).items()}
        self.last = {n: decode(v) for n, v in snapshot.get("last", {}).items()}
        self.functions = copy.deepcopy(snapshot.get("functions", {}))
        self.frozen = set(self.options.get("overlay_names", []))
        self.frozen_objects = set()
        pending = [v for n, v in self.vars.items() if n in self.frozen]
        while pending:
            value = pending.pop()
            if isinstance(value, (list, Dictionary)) and id(value) not in self.frozen_objects:
                self.frozen_objects.add(id(value))
                if len(self.frozen_objects) > 100_000: raise Exhausted("Snapshot size limit exceeded")
                pending.extend(value if isinstance(value, list) else [item for pair in value.pairs for item in pair])
        self.written, self.dependencies = set(), set()
        self.last_written = set()
        self.parameter_only = set()
        self.published_functions = {}
        self.steps, self.allocated, self.calls, self.expr_depth = 0, 0, 0, 0
        self.max_steps = min(1_000_000, max(100, self.options.get("max_steps", 100_000)))
        self.deadline = time.monotonic() + min(10, max(.01, self.options.get("timeout_ms", 2000) / 1000))
        self.max_cells = min(1_000_000, max(1000, self.options.get("max_cells", 100_000)))
        self.contract = None
        self.keyword_checked = set()
        next_priority = max((f.get("publication_priority", 0) for f in self.functions.values()), default=0) + 1
        for name, function in program["functions"].items():
            old = self.functions.get(name)
            if old and old.get("annotation") in OPERATIONS and old.get("annotation") != function.get("annotation"):
                raise Rejected(f"Replacement must retain @{old['annotation']}", "CONTRACT")
            if name not in self.frozen:
                if self.options.get("read_only") and function.get("annotation") in OPERATIONS and old is None:
                    continue
                function = dict(function)
                function["publication_priority"] = old.get("publication_priority", 0) if self.options.get("read_only") and old else next_priority
                self.functions[name] = function
                self.vars.pop(name, None)
                self.published_functions[name] = function
        self.program = program
        self.function_order = sorted(self.functions, key=lambda n: (-self.functions[n].get("publication_priority", 0), self.functions[n].get("source_order", 0), self.functions[n].get("source_id", ""), n))
        for function in self.functions.values(): check_contract_syntax(function)
        self.bytecode = {n: flatten(f["body"]) for n, f in self.functions.items()}
        self.bytecode_functions = dict(self.functions)
        self.bytecode["<global>"] = flatten(program["top"])
        self.redirects = self.build_redirects()
        if self.redirects:
            # Redirect topology can change when an inherited function disappears.
            self.dependencies.add("@control")

    def check_keyword(self, keyword, pos=0):
        allowed = self.options.get("allowed_keywords")
        if allowed is not None and keyword not in allowed:
            raise Rejected(f"Keyword {keyword} is disabled for this task", "KEYWORD_DISABLED", pos)

    def check_function_keywords(self, name):
        if name in self.keyword_checked or name == "<global>": return
        function = self.bytecode_functions.get(name)
        if function:
            for keyword in sorted(function_keywords(function)):
                self.check_keyword(keyword)
        self.keyword_checked.add(name)

    def tick(self, cost=1):
        self.steps += cost
        if self.steps > self.max_steps or time.monotonic() > self.deadline: raise Exhausted()

    def allocate(self, count):
        self.allocated += count
        self.tick(max(1, count // 16))
        if self.allocated > self.max_cells: raise Exhausted("Allocation budget exhausted")

    def build_redirects(self):
        labels, lines, sources = {}, {}, []
        for name, code in self.bytecode.items():
            source = self.functions.get(name, {}).get("source_id", self.program.get("source_id", "legacy"))
            for index, stmt in enumerate(code):
                if stmt.get("line"): lines.setdefault((source, stmt["line"]), []).append((name, index))
                if stmt["op"] == "label":
                    if (source, stmt["name"]) in labels: raise Rejected("Duplicate label", "DUPLICATE_NAME", stmt["pos"])
                    labels[source, stmt["name"]] = (name, index)
                if stmt["op"] == "comefrom": sources.append((name, index, stmt, source))
        redirects = {}
        for name, index, stmt, source in sources:
            target = stmt["target"]
            candidates = lines.get((source, target), []) if isinstance(target, int) else [labels[source, target]] if (source, target) in labels else []
            if not candidates:
                if source != self.program.get("source_id", "legacy"):
                    continue
                raise Rejected("comefrom target must contain executable code", pos=stmt["pos"])
            dest = min(candidates, key=lambda p: self.bytecode[p[0]][p[1]]["pos"])
            if self.functions.get(name, {}).get("annotation") in OPERATIONS or self.functions.get(dest[0], {}).get("annotation") in OPERATIONS:
                raise Rejected("comefrom cannot enter or leave a core override", "CONTRACT", stmt["pos"])
            distance = abs(self.bytecode[dest[0]][dest[1]]["pos"] - stmt["pos"])
            previous = redirects.get(dest)
            if previous is None or (distance, stmt["pos"]) < (previous[2], previous[3]):
                redirects[dest] = (name, index + 1, distance, stmt["pos"])
        return redirects

    def read(self, name):
        self.tick()
        self.dependencies.add(name)
        return self.last.get(name, 0) if name in self.functions else self.vars.get(name, 0)

    def write(self, name, value, parameter=False):
        self.tick()
        if name in self.frozen: return
        if name in self.functions:
            old = self.functions[name]
            if old.get("annotation") in OPERATIONS: raise Rejected(f"Variable {name} violates @{old['annotation']}", "CONTRACT")
            del self.functions[name]
            self.published_functions.pop(name, None)
        self.vars[name] = value
        if not parameter:
            self.written.add(name)
            self.parameter_only.discard(name)
        elif name not in self.written:
            self.parameter_only.add(name)

    def cast(self, value, target, bypass=False, depth=0):
        self.tick()
        if depth > 64: raise Exhausted("Cast depth limit exceeded")
        source = kind(value)
        if source == target: return value
        if not bypass: self.dependencies.add("@cast")
        if self.contract: raise Rejected(f"Implicit casts are forbidden inside @{self.contract}", "CONTRACT")
        if not bypass:
            overrides = [self.functions[n] for n in self.function_order if n in self.functions and self.functions[n].get("annotation") == "cast" and self.functions[n].get("cast_to") == target and (not self.functions[n]["types"] or self.functions[n]["types"][0] == source)]
            if overrides:
                result = self.invoke(overrides[0], [value])
                if kind(result) != target: raise Rejected("@cast returned the wrong type", "CONTRACT")
                return result
        if target == "int":
            if source == "string": return wrap(len(value))
            if source == "list": return wrap(sum(self.cast(v, "int", depth=depth + 1) for v in value))
            return wrap(sum(self.cast(k, "int", depth=depth + 1) * self.cast(v, "int", depth=depth + 1) for k, v in value.pairs))
        if target == "string": return self.render(value)
        if target == "list":
            if source == "string":
                self.allocate(len(value))
                return list(value)
            if source == "dict":
                self.allocate(len(value.pairs) * 2)
                return [k for k, _ in value.pairs] + [v for _, v in value.pairs]
            self.allocate(1)
            return [value]
        if target == "dict":
            result = Dictionary()
            for item in value if source == "list" else [value]: self.store(result, item, item)
            return result
        raise Rejected("Unsupported cast target", "UNSUPPORTED_TYPE")

    def render(self, value, depth=0, seen=None):
        self.tick()
        if depth > 64: raise Exhausted("Value nesting limit exceeded")
        if isinstance(value, str): return value[:LIMIT]
        if isinstance(value, int): return str(value)
        seen = set() if seen is None else seen
        if id(value) in seen: return "[]" if isinstance(value, list) else "{}"
        seen.add(id(value))
        parts, length = [], 2
        for item in value if isinstance(value, list) else value.pairs:
            self.tick()
            text = self.render(item, depth + 1, seen) if isinstance(value, list) else self.render(item[0], depth + 1, seen) + ":" + self.render(item[1], depth + 1, seen)
            parts.append(text[:max(0, LIMIT - length)])
            length += len(text) + 1
            if length >= LIMIT: break
        seen.remove(id(value))
        self.allocate(min(length, LIMIT) // 8)
        return (("[" if isinstance(value, list) else "{") + ",".join(parts) + ("]" if isinstance(value, list) else "}"))[:LIMIT]

    def choose(self, candidates, args):
        same = [f for f in candidates if len(f["params"]) == len(args)]
        group = same or candidates
        typed = [f for f in group if f["types"]]
        if not typed: return group[0] if group else None
        if not args: return typed[0]
        source = TYPES.index(kind(args[0]))
        return min(typed, key=lambda f: abs(TYPES.index(f["types"][0]) - source))

    def equal(self, left, right):
        remaining = max(1, self.max_steps - self.steps)
        budget = [remaining]
        result = builtin_equal(left, right, budget=budget)
        self.tick(remaining - budget[0] + ((len(left) + len(right)) // 32 if isinstance(left, str) and isinstance(right, str) else 0))
        return result

    def order_key(self, value, depth=0, seen=None):
        self.tick()
        if depth > 64: raise Exhausted("Comparison depth limit exceeded")
        rank = TYPES.index(kind(value))
        if isinstance(value, int): return (rank, value)
        if isinstance(value, str):
            self.tick(len(value) // 32)
            return (rank, value)
        seen = set() if seen is None else seen
        if id(value) in seen: raise Exhausted("Cyclic values have no finite ordering")
        seen.add(id(value))
        if isinstance(value, list):
            self.allocate(len(value))
            result = tuple(self.order_key(item, depth + 1, seen) for item in value)
        else:
            self.allocate(len(value.pairs) * 2)
            self.tick(len(value.pairs) * max(1, len(value.pairs).bit_length()))
            result = tuple(sorted((self.order_key(k, depth + 1, seen), self.order_key(v, depth + 1, seen)) for k, v in value.pairs))
        seen.remove(id(value))
        return (rank, result)

    def operation(self, name, args):
        self.tick()
        self.dependencies.add("@" + name)
        candidates = [self.functions[n] for n in self.function_order if n in self.functions and self.functions[n].get("annotation") == name]
        arity = {"eq": 2, "cmp": 2, "get": 2, "set": 3, "length": 1, "contains": 2, "empty": 1, "push_back": 2, "truthy": 1, "concat": 2}.get(name, 0)
        domains = {"get": ("string", "list", "dict"), "set": ("list", "dict"), "length": ("string", "list", "dict"), "contains": ("string", "list", "dict"), "empty": ("string", "list", "dict"), "push_back": ("list",), "concat": ("string",)}.get(name, TYPES)
        replaced = {f["types"][0] for f in candidates if f["types"] and len(f["params"]) == arity}
        candidates.extend({"name": name, "builtin": True, "params": [None] * arity, "types": [domain]} for domain in domains if domain not in replaced)
        chosen = self.choose(candidates, args)
        if chosen:
            if chosen.get("builtin"):
                adapted = list(args)
                if adapted and kind(adapted[0]) != chosen["types"][0]: adapted[0] = self.cast(adapted[0], chosen["types"][0])
                if name == "concat":
                    adapted = [self.cast(value, "string") for value in (adapted + [0, 0])[:2]]
                result = self.builtin(name, adapted)
                return self.checked_operation(name, adapted, result) if name in ("empty", "concat") else result
            converted = [] if name == "concat" else None
            result = self.invoke(chosen, args, converted_args=converted)
            return self.checked_operation(name, converted if converted is not None else args, result)
        result = self.builtin(name, args)
        return self.checked_operation(name, args, result) if name in ("empty", "concat") else result

    def checked_operation(self, name, args, result):
        if name in ("eq", "truthy", "contains", "empty") and (kind(result) != "int" or result not in (0, 1)):
            raise Rejected(f"@{name} must return 0 or 1", "CONTRACT")
        if name == "cmp" and (kind(result) != "int" or result not in (-1, 0, 1)):
            raise Rejected("@cmp must return -1, 0 or 1", "CONTRACT")
        if name == "length" and (kind(result) != "int" or result < 0): raise Rejected("@length must return a nonnegative int", "CONTRACT")
        if name == "empty" and result == 1 and self.operation("length", args[:1]) != 0:
            raise Rejected("@empty violates the shared @length contract", "CONTRACT")
        if name == "concat":
            if kind(result) != "string": raise Rejected("@concat must return a string", "CONTRACT")
            if len(args) >= 2 and all(isinstance(value, str) for value in args[:2]):
                length = self.operation("length", [result])
                if any(length < self.operation("length", [value]) for value in args[:2]):
                    raise Rejected("@concat violates the shared @length contract", "CONTRACT")
        if name == "eq" and len(args) >= 2 and self.equal(args[0], args[1]) and result != 1:
            raise Rejected("@eq violates reflexivity", "CONTRACT")
        if name == "cmp" and len(args) >= 2 and self.equal(args[0], args[1]) and result != 0:
            raise Rejected("@cmp violates reflexivity", "CONTRACT")
        return result

    def store(self, container, key, value):
        self.tick()
        if id(container) in self.frozen_objects: return
        if isinstance(container, list):
            if value is container:
                self.allocate(len(container))
                value = list(container)
            if not container:
                self.allocate(1)
                container.append(value)
            else: container[self.cast(key, "int") % len(container)] = value
        elif isinstance(container, Dictionary):
            if key is container:
                self.allocate(len(container.pairs) * 2)
                key = Dictionary([list(pair) for pair in container.pairs])
            if value is container:
                self.allocate(len(container.pairs) * 2)
                value = Dictionary([list(pair) for pair in container.pairs])
            for pair in container.pairs:
                if self.operation("eq", [pair[0], key]):
                    pair[1] = value
                    return
            self.allocate(2)
            container.pairs.append([key, value])

    def entries(self, container):
        unique = []
        for pair in container.pairs:
            self.tick()
            if not any(self.operation("eq", [old[0], pair[0]]) for old in unique): unique.append(pair)
        return unique

    def builtin(self, name, args, depth=0):
        self.tick()
        if depth > 64: raise Exhausted("Builtin depth limit exceeded")
        args = list(args) + [0, 0, 0]
        a, b, c = args[:3]
        if name == "eq":
            if kind(a) != kind(b): b = self.cast(b, kind(a))
            return int(self.equal(a, b))
        if name in ("lt", "cmp"):
            if kind(a) != kind(b): b = self.cast(b, kind(a))
            if self.equal(a, b): return 0
            less = self.order_key(a) < self.order_key(b)
            return int(less) if name == "lt" else -1 if less else 1
        if name == "truthy": return int(bool(a.pairs if isinstance(a, Dictionary) else a))
        if name in ("get", "set", "length", "empty", "contains"):
            if kind(a) == "int": a = self.cast(a, "string")
            if name == "length": return wrap(len(self.entries(a) if isinstance(a, Dictionary) else a))
            if name == "empty": return int(not (a.pairs if isinstance(a, Dictionary) else a))
            if name == "contains":
                if isinstance(a, str): return int(self.cast(b, "string") in a)
                return int(any(self.operation("eq", [v, b]) for v in (a if isinstance(a, list) else [k for k, _ in a.pairs])))
            if name == "set":
                self.store(a, b, c)
                return 0
            if isinstance(a, (str, list)): return a[self.cast(b, "int") % len(a)] if a else "" if isinstance(a, str) else 0
            for key, value in a.pairs:
                if self.operation("eq", [key, b]): return value
            self.store(a, b, 0)
            return 0
        if name == "push_back":
            if not isinstance(a, list): a = self.cast(a, "list")
            if id(a) in self.frozen_objects: return 0
            self.allocate(1)
            if b is a:
                self.allocate(len(a))
                b = list(a)
            a.append(b)
            return 0
        if name == "concat":
            left, right = self.cast(a, "string"), self.cast(b, "string")
            self.allocate(min(LIMIT, len(left) + len(right)) // 8)
            return (left + right)[:LIMIT]
        return 0

    def call(self, name, args):
        self.tick()
        if name in BUILTINS:
            if self.contract not in OPERATIONS:
                raise Rejected("Builtin functions may only be called inside stdlib override definitions", "BUILTIN_SCOPE")
            op = name[len("__builtin_"):-2]
            if op == "contains":
                if len(args) != 2 or kind(args[0]) not in ("string", "list", "dict"):
                    raise Rejected("__builtin_contains__ requires a container and a value", "CONTRACT")
                container, value = args
                if isinstance(container, str):
                    if not isinstance(value, str): raise Rejected("__builtin_contains__ requires a string needle for a string container", "CONTRACT")
                    self.tick((len(container) + len(value)) // 32)
                    return int(value in container)
                entries = container if isinstance(container, list) else (key for key, _ in container.pairs)
                return int(any(self.equal(item, value) for item in entries))
            if op == "eq" and len(args) >= 2 and kind(args[0]) != kind(args[1]): raise Rejected("__builtin_eq__ requires identical argument types", "CONTRACT")
            if op == "concat" and (len(args) < 2 or not all(isinstance(value, str) for value in args[:2])):
                raise Rejected("__builtin_concat__ requires two string operands", "CONTRACT")
            return self.builtin(op, args)
        if self.contract: raise Rejected(f"Only builtin calls are allowed in @{self.contract}", "CONTRACT")
        if name in TYPES: return self.cast(args[0] if args else 0, name)
        if name in OPERATIONS: return self.operation(name, args)
        self.dependencies.add(name)
        return self.invoke(self.functions[name], args) if name in self.functions else self.read(name)

    def invoke(self, function, args, converted_args=None):
        self.tick()
        self.calls += 1
        if self.calls > 64: raise Exhausted("Call depth limit exceeded")
        previous = self.contract
        name = function["name"]
        self.dependencies.add(name)
        try:
            for index, param in enumerate(function["params"]):
                value = args[index] if index < len(args) else 0
                if function["types"]: value = self.cast(value, function["types"][index])
                if converted_args is not None: converted_args.append(value)
                self.write(param, value, parameter=True)
            self.contract = function.get("annotation") if function.get("annotation") in OPERATIONS else None
            result, destination = self.execute(name)
            self.last[destination] = result
            self.last_written.add(destination)
            return result
        finally:
            self.contract = previous
            self.calls -= 1

    def execute(self, name):
        self.check_function_keywords(name)
        index, code = 0, self.bytecode[name]
        while index < len(code):
            self.tick()
            stmt = code[index]
            redirect = self.redirects.get((name, index))
            if redirect:
                self.check_keyword("comefrom", redirect[3])
                name, index = redirect[:2]
                self.check_function_keywords(name)
                if name != "<global>": self.dependencies.add(name)
                code = self.bytecode[name]
                continue
            op = stmt["op"]
            index += 1
            if op in ("let", "assign"):
                value = self.expr(stmt["expr"])
                if op == "let" or stmt["name"] in self.vars or stmt["name"] in self.functions:
                    self.write(stmt["name"], value)
            elif op == "return": return self.expr(stmt["expr"]), name
            elif op == "call": self.expr(stmt["expr"])
            elif op == "branch":
                if not self.operation("truthy", [self.argument(stmt["expr"], True)]): index = stmt["target"]
            elif op == "jump": index = stmt["target"]
        return 0, name

    def expr(self, expr):
        self.tick()
        self.expr_depth += 1
        if self.expr_depth > 96: raise Exhausted("Expression depth limit exceeded")
        try: return self._expr(expr)
        finally: self.expr_depth -= 1

    def argument(self, expr, adl=False):
        value = self.expr(expr)
        if adl and expr[0] == "name" and expr[1] in self.functions:
            return self.cast(value, "int")
        return value

    def _expr(self, expr):
        tag = expr[0]
        if tag in ("int", "string"): return expr[1]
        if tag == "name": return self.read(expr[1])
        if tag == "list":
            self.allocate(len(expr[1]))
            return [self.expr(v) for v in expr[1]]
        if tag == "dict":
            result = Dictionary()
            for key, value in expr[1]: self.store(result, self.expr(key), self.expr(value))
            return result
        if tag == "call": return self.call(expr[1], [self.argument(v, expr[1] in OPERATIONS) for v in expr[2]])
        if tag == "unary":
            value = self.argument(expr[2], expr[1] == "not")
            return int(not self.operation("truthy", [value])) if expr[1] == "not" else wrap(-self.cast(value, "int"))
        operator, left = expr[1], self.argument(expr[2], True)
        if operator == "and": return int(bool(self.operation("truthy", [left])) and bool(self.operation("truthy", [self.argument(expr[3], True)])))
        if operator == "or": return int(bool(self.operation("truthy", [left])) or bool(self.operation("truthy", [self.argument(expr[3], True)])))
        right = self.argument(expr[3], True)
        if operator in ("=", "!="):
            value = self.operation("eq", [left, right])
            return value if operator == "=" else int(not value)
        if operator in ("<", ">", "<=", ">="):
            result = self.operation("cmp", [left, right])
            return int({"<": result < 0, ">": result > 0, "<=": result <= 0, ">=": result >= 0}[operator])
        a, b = self.cast(left, "int"), self.cast(right, "int")
        if operator == "+": return wrap(a + b)
        if operator == "-": return wrap(a - b)
        if operator == "*": return wrap(a * b)
        if not b: return 42
        return wrap(a // b) if operator == "/" else wrap(a % abs(b))

    def changes(self):
        budget = [100_000]
        variables = {n: encode(self.vars[n], budget=budget) for n in sorted(self.written)}
        for name, old in self.original.get("variables", {}).items():
            if name in self.vars and name not in self.parameter_only and name not in self.frozen and name not in variables:
                current = encode(self.vars[name], budget=budget)
                if current != old: variables[name] = current
        result = {"variables": variables, "functions": self.published_functions,
                  "last": {n: encode(self.last[n], budget=budget) for n in sorted(self.last_written)}}
        maximum = self.options.get("max_names")
        if maximum is not None and len(publication_names(result)) > maximum:
            raise Rejected(f"This task permits at most {maximum} unique published names per submission", "TASK_NAME_LIMIT")
        if len(json.dumps(result)) > 2_000_000: raise Exhausted("Publication size limit exceeded")
        return result

def publication_names(changes):
    return set().union(*(set(changes.get(section, {})) for section in ("variables", "functions", "last")))

def merge_snapshot(snapshot, changes):
    merged = copy.deepcopy(snapshot or {})
    for part in ("variables", "functions", "last"):
        merged.setdefault(part, {}).update(copy.deepcopy(changes.get(part, {})))
    for name in changes.get("variables", {}):
        merged["functions"].pop(name, None)
        merged["last"].pop(name, None)
    for name in changes.get("functions", {}): merged["variables"].pop(name, None)
    return merged

def validate_publication(snapshot, changes, options=None):
    """Validate the exact candidate snapshot; the caller must CAS that version."""
    try:
        _validate_publication(snapshot or {}, changes or {}, options or {})
        return []
    except Rejected as error:
        return [diagnostic(error)]
    except (RecursionError, MemoryError):
        return [diagnostic(Exhausted())]


def contract_samples(cheap=False):
    """Use the full fresh corpus unless an administrator opts into reduced coverage."""
    if cheap:
        return {
            "int": [0, 1, -1, LIMIT],
            "string": ["", "a", "ab"],
            "list": [[], [0], [0, 1]],
            "dict": [{"$dict": []}, {"$dict": [[0, 1]]}],
        }
    rng = random.SystemRandom()
    samples = {
        "int": [0, 1, -1, 42, -42, LIMIT, -LIMIT, 2, 7, 193, -971, 800009],
        "string": ["", "a", "b", "ab", "ba", "word", "\u2603"],
        "list": [[], [0], [1], [0, 1], [1, 0], ["a"], [[0]]],
        "dict": [{"$dict": []}, {"$dict": [[0, 1]]}, {"$dict": [[1, 0]]}],
    }
    integers = rng.sample(range(-LIMIT, LIMIT + 1), 4)
    samples["int"].extend(integers)
    for index in range(2):
        text = "".join(rng.choice("abcdefghijklmnopqrstuvwxyz\u2603") for _ in range(rng.randrange(13)))
        samples["string"].append(text)
        samples["list"].append([integers[index], text, [integers[index + 2]]])
        samples["dict"].append({"$dict": [[integers[index], text], [integers[index + 2], integers[index + 1]]]})
    return samples


def _validate_publication(snapshot, changes, options):
    for function in changes.get("functions", {}).values():
        check_builtin_scope(function["body"], function.get("annotation"))
        allowed = options.get("allowed_keywords")
        if allowed is not None:
            for keyword in sorted(function_keywords(function)):
                if keyword not in allowed:
                    raise Rejected(f"Keyword {keyword} is disabled for this task", "KEYWORD_DISABLED")
    for name, old in snapshot.get("functions", {}).items():
        annotation = old.get("annotation")
        if annotation in OPERATIONS:
            if name in changes.get("variables", {}): raise Rejected(f"Variable {name} violates @{annotation}", "CONTRACT")
            replacement = changes.get("functions", {}).get(name)
            if replacement and replacement.get("annotation") != annotation: raise Rejected(f"Replacement must retain @{annotation}", "CONTRACT")
    merged = merge_snapshot(snapshot, changes)
    for function in merged["functions"].values(): check_contract_syntax(function)
    cheap = options.get("cheap_invariants", False)
    samples = contract_samples(cheap=True) if cheap else contract_samples()
    # Published values and constants in the submitted functions are adversarial
    # probes too, so a simple hidden magic constant cannot evade the base suite.
    if not cheap:
        for value in list(changes.get("variables", {}).values())[:16]:
            domain = kind(decode(value))
            if len(samples[domain]) < 20: samples[domain].append(value)
        for function in merged["functions"].values():
            for stmt in flatten(function["body"]):
                for expr in expression_walk(stmt.get("expr", ["int", 0])):
                    if expr[0] in ("int", "string") and len(samples[expr[0]]) < 20 and expr[1] not in samples[expr[0]]:
                        samples[expr[0]].append(expr[1])
    # Contract probes validate shared invariants, independently of a challenge's
    # execution restrictions. Dormant shared definitions must not block an
    # otherwise valid challenge publication.
    settings = dict(options, overlay_names=list(merged["variables"]), allowed_keywords=None,
                    max_names=None)
    runtime = Runtime({"functions": {}, "top": [], "names": []}, merged, settings)
    runtime.max_steps = min(2_000_000, max(100_000, options.get("contract_steps", 1_000_000)))
    runtime.deadline = time.monotonic() + min(10, options.get("contract_timeout_ms", 5000) / 1000)
    base_vars, base_last = dict(runtime.vars), dict(runtime.last)

    def call(function, args, operation=None):
        runtime.vars = dict(base_vars)
        runtime.last = dict(base_last)
        decoded = [decode(a) for a in args]
        converted = [] if operation == "concat" else None
        try:
            result = runtime.invoke(function, decoded, converted_args=converted)
            return runtime.checked_operation(operation, converted if converted is not None else decoded, result) if operation else result
        except Rejected as error:
            explain_composition(error)

    def fail(annotation, function):
        changed = set(changes.get("variables", {})) & function_dependencies(function)
        subject = f"Variable {sorted(changed)[0]} violates" if changed else "Override violates"
        raise Rejected(f"{subject} @{annotation} contract", "CONTRACT")

    def explain_composition(error):
        if error.code == "CONTRACT":
            related = set(re.findall(r"@(empty|length|concat)\b", error.message))
            for function in merged["functions"].values():
                annotation = function.get("annotation")
                if annotation in related and set(changes.get("variables", {})) & function_dependencies(function):
                    fail(annotation, function)
        raise error

    def operation(name, args):
        try:
            return runtime.operation(name, args)
        except Rejected as error:
            explain_composition(error)

    for function in merged["functions"].values():
        annotation = function.get("annotation")
        if annotation not in OPERATIONS: continue
        domains = [function["types"][0]] if function["types"] else list(TYPES)
        for domain in domains:
            values = samples[domain]
            truthy_witnesses = set()
            if annotation == "cast":
                for a in values:
                    if kind(call(function, [a])) != function["cast_to"]: fail(annotation, function)
            elif annotation in ("eq", "cmp"):
                results = {}
                for i, a in enumerate(values):
                    for j, b in enumerate(values):
                        result = call(function, [a, b])
                        if kind(result) != "int" or result not in ((0, 1) if annotation == "eq" else (-1, 0, 1)): fail(annotation, function)
                        results[i, j] = result
                        if i == j and result != (1 if annotation == "eq" else 0): fail(annotation, function)
                for i in range(len(values)):
                    for j in range(len(values)):
                        if annotation == "cmp":
                            runtime.vars = dict(base_vars)
                            equality = runtime.operation("eq", [decode(values[i]), decode(values[j])])
                            if (results[i, j] <= 0 and results[j, i] <= 0) != bool(equality): fail(annotation, function)
                        for k in range(len(values)):
                            runtime.tick()
                            if annotation == "eq":
                                if results[i, j] and results[j, k] and not results[i, k]: fail(annotation, function)
                            elif (results[i, j] <= 0 and results[j, k] <= 0 and results[i, k] > 0) or (results[i, j] < 0 and results[j, k] < 0 and results[i, k] >= 0):
                                fail(annotation, function)
            else:
                for sample_index, a in enumerate(values):
                    if annotation == "concat":
                        # Cover each definition, including candidates currently
                        # shadowed by another override. A ring of unequal pairs
                        # bounds the per-definition work; selected dispatch also
                        # receives the full bounded string-pair corpus below.
                        b = values[(sample_index + 1) % len(values)]
                        if kind(call(function, [a, b], operation="concat")) != "string": fail(annotation, function)
                    elif annotation in ("truthy", "empty", "contains"):
                        result = call(function, [a, 0] if annotation == "contains" else [a], operation="empty" if annotation == "empty" else None)
                        if kind(result) != "int" or result not in (0, 1): fail(annotation, function)
                        if annotation == "truthy": truthy_witnesses.add(result)
                    elif annotation == "length":
                        result = call(function, [a])
                        if kind(result) != "int" or result < 0: fail(annotation, function)
                    elif annotation == "get" and domain in ("list", "string", "dict"):
                        container = decode(a)
                        indices = [encode(k) for k, _ in container.pairs] if isinstance(container, Dictionary) else list(range(len(container)))
                        expected = [v for _, v in container.pairs] if isinstance(container, Dictionary) else list(container)
                        actual = [call(function, [a, index]) for index in indices]
                        if len(actual) != len(expected) or any(not any(builtin_equal(v, w) for w in actual) for v in expected): fail(annotation, function)
                    elif annotation in ("set", "push_back") and domain in ("list", "dict"):
                        runtime.vars = dict(base_vars)
                        container = decode(a)
                        before = len(container if isinstance(container, list) else container.pairs)
                        if annotation == "set" and not before:
                            continue  # Only existing keys/valid positions have a select/store invariant.
                        key = container.pairs[0][0] if isinstance(container, Dictionary) else 0
                        runtime.invoke(function, [container, key, 42] if annotation == "set" else [container, 42])
                        if annotation == "set":
                            if not builtin_equal(runtime.builtin("get", [container, key]), 42): fail(annotation, function)
                        elif not isinstance(container, list) or len(container) != before + 1 or not any(builtin_equal(v, 42) for v in container): fail(annotation, function)
            if annotation == "truthy" and truthy_witnesses != {0, 1}:
                fail(annotation, function)
    # These constraints compose shared operations. Check defaults as well as
    # user definitions: a changed length can break an untouched empty/concat.
    annotations = {f.get("annotation") for f in merged["functions"].values()}
    if annotations & {"length", "empty"}:
        for domain in ("string", "list", "dict"):
            for encoded in samples[domain]:
                runtime.vars, runtime.last = dict(base_vars), dict(base_last)
                container = decode(encoded)
                length = operation("length", [container])
                empty = operation("empty", [container])
                if kind(length) != "int" or length < 0 or empty == 1 and length != 0:
                    raise Rejected("Overrides violate the @empty/@length contract", "CONTRACT")
    if annotations & {"length", "concat"}:
        for left in samples["string"]:
            for right in samples["string"]:
                runtime.vars, runtime.last = dict(base_vars), dict(base_last)
                # checked_operation performs the shared length comparisons.
                operation("concat", [left, right])
    # Select/store must compose across separately overridden operations, not only
    # pass tests of each definition in isolation. Probe only valid existing keys.
    collection_annotations = {f.get("annotation") for f in merged["functions"].values()} & {"get", "set", "push_back"}
    if collection_annotations:
        for encoded in ([0, 1, 2], ["a", 0], {"$dict": [[0, 1], [1, 2]]}):
            for index in (0, 1):
                runtime.vars = dict(base_vars)
                runtime.last = dict(base_last)
                container = decode(encoded)
                runtime.operation("set", [container, index, 42])
                actual = runtime.operation("get", [container, index])
                if not builtin_equal(actual, 42):
                    raise Rejected("Overrides violate the @get/@set select-store contract", "CONTRACT")

def judge(code, tests, snapshot=None, options=None):
    options = options or {}
    results, dependencies, changes, names = [], set(), {"variables": {}, "functions": {}, "last": {}}, []
    published_names = []
    try:
        program = compile_program(code, options)
        names = program["names"]
        if not isinstance(tests, list) or not tests or len(tests) > 128: raise Rejected("A task must have 1 to 128 test cases", "INVALID_TESTS")
        solution = next(f for f in program["functions"].values() if f["annotation"] == "solution")
        for index, test in enumerate(tests):
            runtime = Runtime(program, snapshot, options)
            runtime.execute("<global>")
            args = test.get("args", test.get("input", []))
            if not isinstance(args, list): args = [args]
            start = time.monotonic()
            result = runtime.call(solution["name"], [decode(v) for v in args])
            expected = decode(test.get("expected", 0))
            passed = builtin_equal(result, expected)
            results.append({"name": test.get("name", f"Test {index + 1}"), "input": json.dumps(args, ensure_ascii=False), "expected": runtime.render(expected), "actual": runtime.render(result), "passed": passed, "durationMs": round((time.monotonic() - start) * 1000, 2)})
            dependencies.update(runtime.dependencies)
            test_changes = runtime.changes()
            if index == 0:
                changes = test_changes
                published_names = sorted(publication_names(changes))
        if not all(test["passed"] for test in results):
            return {"status": "WRONG_ANSWER", "tests": results, "stdout": "", "diagnostics": [], "changes": {}, "dependencies": sorted(dependencies), "names": names, "publishedNames": published_names}
        if not options.get("read_only"):
            errors = validate_publication(snapshot or {}, changes, options)
            if errors: return {"status": "CE", "tests": results, "stdout": "", "diagnostics": errors, "changes": {}, "dependencies": sorted(dependencies), "names": names, "publishedNames": published_names}
        return {"status": "OK", "tests": results, "stdout": "", "diagnostics": [], "changes": {} if options.get("read_only") else changes, "dependencies": sorted(dependencies), "names": names, "publishedNames": published_names}
    except Rejected as error:
        return {"status": "TLE" if isinstance(error, Exhausted) else "CE", "tests": results, "stdout": "", "diagnostics": [diagnostic(error)], "changes": {}, "dependencies": sorted(dependencies), "names": names, "publishedNames": published_names}
    except (RecursionError, MemoryError):
        return {"status": "TLE", "tests": results, "stdout": "", "diagnostics": [diagnostic(Exhausted())], "changes": {}, "dependencies": sorted(dependencies), "names": names, "publishedNames": published_names}
