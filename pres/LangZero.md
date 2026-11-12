# LWLang v0.3 — Discovered Language & Platform Notes

Notes from black-box experimentation against the LangWars platform (`https://langwars.gerosp.ru`).
Items marked **(verified)** were directly tested; items marked **(observed)** are empirical behaviour
that may be platform-configuration dependent.

---

## 1. Program shape

A program is a sequence of global declarations, assignments and function definitions. Exactly one
function must be decorated with `@solution`:

```lwlang
fn helper(x) {
    return x + 1;
}

let shared = 10;

@solution
fn <int, int> answer(left, right) {
    return left + right;
}
```

- Global scope only permits declarations, assignments and `fn` definitions.
  A bare expression at global scope fails with `Only declarations, assignments and functions are allowed globally`.
- `@solution` marks the entry point. The judge calls **the function marked `@solution`**, *not* the
  task's `entryPoint` field **(verified)**. The function can therefore have any valid, unique name.
- Runs (`/run`) check only public examples and publish nothing.
- Submissions (`/submit`) run all tests (including hidden ones). Only an `OK` submission publishes
  definitions into the shared world.

---

## 2. Lexical syntax

- Comments: `// line` and `/* block */`.
- Keywords:
  `let`, `fn`, `return`, `if`, `else`, `while`, `comefrom`, `and`, `or`, `not`
- Type names: `int`, `string`, `list`, `dict`
- Decorators:
  `@solution`, `@eq`, `@cmp`, `@cast`, `@get`, `@set`, `@length`, `@empty`,
  `@contains`, `@push_back`, `@truthy`, `@concat`
- Builtin escapes (only valid inside the corresponding override body):
  `__builtin_eq__`, `__builtin_lt__`, `__builtin_get__`, `__builtin_set__`,
  `__builtin_length__`, `__builtin_concat__`, `__builtin_contains__`
- Identifiers: `[A-Za-z_][A-Za-z0-9_]*`, but **name validation is stricter** (see §7).
- Literals:
  - integers: decimal digits (negative numbers use unary `-`)
  - strings: `"..."` with backslash escapes, e.g. `"a\"b"`, `"😺"`
  - lists: `[expr, expr, ...]`, e.g. `[]`, `[1, 2, 3]`
  - dicts: `{key_expr: value_expr, ...}`, e.g. `{}`, `{"cat": 1}`, `{concat("ca","t"): 2}`
    Keys and values may be arbitrary expressions.
- Statements end with `;`.
- Blocks use `{ }`. Indentation is not significant.

---

## 3. Types and values

| Type | Notes |
| --- | --- |
| `int` | Wraps in the inclusive range **-1,000,000 … 1,000,000** (period 2,000,001). |
| `string` | Unicode code points. `length` = number of characters. |
| `list` | Ordered sequence; literals; indices wrap. |
| `dict` | Key/value map. Missing key via `get` returns `0`. Keys can be int/string. |

Integer wrapping **(verified)**:

```lwlang
1000000 + 1    // -1000000
-1000000 - 1   //  1000000
```

Dict values are rendered as `{key:value,...}` in test output. Through the API's JSON they may appear
as `{"$dict": [[key, value], ...]}`.

---

## 4. Operators

- Arithmetic: `+ - * / %`
- Equality: `=` (single equals!) and `!=`
- Comparison: `< <= > >=`
- Logic: `and`, `or`, `not`
- Unary minus: `-expr`

Semantics **(verified)**:

```lwlang
7 / 2     // 3   (truncates toward zero)
-7 / 2    // -3
-7 % 3    //  2  (floor-modulo, sign follows divisor)
7 % 3     //  1
// division by zero returns 42 (from the in-game guide)
```

Notes:

- `=` performs equality comparison, not assignment. Assignment is a bare `name = expr;`.
- `=` appears to compare lists/dicts structurally **(observed; used successfully in probes)**.
- `and` / `or` / `not` are logical; truthiness follows `truthy`.
- Arithmetic on non-ints performs implicit coercion (see §8). This is unreliable and should be avoided.
- There is **no `break` or `continue`**.

---

## 5. Control flow

```lwlang
if (condition) {
    ...
} else {
    ...
}

while (condition) {
    ...
}
```

- Parentheses around conditions are required.
- Blocks are mandatory.
- Early `return` inside `if` works.
- Because there is no `break`, loop termination must be expressed in the condition or by a flag.

---

## 6. Functions

```lwlang
fn <int, int> add(left, right) {
    return left + right;
}

fn untyped(value) {       // type list may be omitted
    return value;
}
```

- `<type, type, ...>` is an optional parameter-type list.
  - If present it must match the parameter count exactly:
    `Parameter names must be unique and type count must match`.
  - Params must have unique names.
- Functions may be defined before or after use.
- Recursion works; a function can call itself by name.
- Calling convention: extra parameters beyond the arguments supplied by the test harness
  **default to `0`** **(verified for ints)**. This is the foundation of the parameter-only style:

```lwlang
@solution
fn <list, int, int> count_positive(items, i, total) {
    while (i < length(items)) {
        if (get(items, i) > 0) { total = total + 1; }
        i = i + 1;
    }
    return total;
}
// harness calls count_positive(items) -> i = 0, total = 0
```

- `let name = expr;` declares/initializes a variable. Assignment `name = expr;` updates it.
- Parameters are mutable: assigning to a parameter is allowed and is the safest way to keep state,
  because parameter names are function-scoped bindings at call time.
- A bare function name **without `()` yields its last return value**, not a function reference:
  `keep(value); return keep;` returns the last result of `keep`.
- A function and a `let`/parameter with the same name **in the same program** cause:
  `Duplicate declaration: <name>`.
- A function can redefine a name that already exists in the shared world (last accepted definition
  wins for world lookup).

---

## 7. Names (very important)

Identifiers are validated against a platform dictionary:

- A name must be **English dictionary words joined by underscores**.
- Single letters like `a`, `b`, `i`, `j` are valid (they are in the dictionary).
- Maximum length: 48 characters (`maxNameLength`).
- Digits are **not** allowed (`d2` fails).
- Unknown words fail:
  `Name X contains a word outside the allowed dictionary`.
- Leading/trailing/double underscores are not allowed for user names:
  `Names must contain English words separated by underscores`.
- Reserved keywords and stdlib operation names cannot be used as identifiers:
  `Expected an unreserved identifier`.

Examples:

| Name | Valid? | Why |
| --- | --- | --- |
| `sum_answer` | yes | `sum` + `answer` |
| `zero_safe_a` | yes | `zero` + `safe` + `a` |
| `window_start` | yes | `window` + `start` |
| `positive_total` | yes | `positive` + `total` |
| `tripler` | no | `tripler` not in dictionary |
| `extra` | no | not in dictionary |
| `started` | no | `started` not in dictionary (use `start` / `first`) |
| `pos`, `med`, `ch` | no | not in dictionary (use `position`, `middle`, `character`) |
| `shift` | no | not in dictionary (use `cursor`) |
| `d2` | no | contains a digit |
| `length`, `get`, `eq`, `set`, ... | no | reserved operation names |

The exact dictionary is exposed by `GET /api/config` → `allowedWords` (213 words when observed).

---

## 8. Built-in operations and coercion

Standard operations:

| Operation | Behaviour |
| --- | --- |
| `get(container, index)` | List/string index, **wraps**: `get([10,20], -1)` → `20`, `get("cat", 0)` → `"c"`. Dict lookup; missing key → `0`. Non-container: returns the container itself (`get(9, 2)` → `9`). |
| `set(container, index, value)` | **Mutates in place** and returns no useful value (`0`). List indices wrap (an append index equal to length wraps to 0; use `push_back` to append). Dict inserts/updates. Return value must be ignored. |
| `push_back(list, value)` | **Mutates in place**, appends, returns no useful value. Use as a statement. |
| `length(x)` | List/dict/string length. For an int: digit count (`length(9)` → 1, `length(42)` → 2). |
| `empty(x)` | Truthy if empty/zero-ish. |
| `contains(container, value)` | Substring for strings, membership for lists, key check for dicts. |
| `concat(a, b)` | **Strings only.** `concat("cat", "!")` → `"cat!"`. Lists/dicts error: `__builtin_concat__ requires two string operands`. |
| `truthy(x)` | `1`/`0`. |
| `eq(a, b)` | Equality. |
| `cmp(a, b)` | `-1`, `0`, `1`; works for strings. |
| `cast(type, value)` | Platform stdlib op; often overridden by players and unreliable. |
| `int(x)`, `string(x)`, `list(x)`, `dict(x)` | Type constructors/casts (see below). |

Interesting observed coercions (avoid relying on them):

```lwlang
int("42")      // 2        (string length!)
int([1,2])     // 3        (list-related, not numeric parsing)
dict(5)        // {5:5}
dict([1,2])    // {1:1,2:2}
list("cat")    // [c,a,t]
list({"a":1,"b":2}) // [a,b,1,2]  (keys then values)
string(42)     // "42"
string([1,2])  // "[1,2]"
get(9, 2)      // 9
length(42)     // 2
```

**Mutation rule (critical):**

```lwlang
// WRONG: set/push_back return nothing useful
let l = [1, 2];
l = push_back(l, 9);      // l becomes 0

// RIGHT: mutate, then use the original container
let l = [1, 2];
push_back(l, 9);          // l is now [1,2,9]
set(l, 0, 7);             // l is now [7,2,9]
```

The same applies to dicts:

```lwlang
let d = {"cat": 1};
set(d, "dog", 2);         // d = {cat:1,dog:2}
```

---

## 9. Stdlib overrides

A user can replace a standard operation for **everyone** by decorating a function:

```lwlang
@eq
fn <int, int> safe_equal(left, right) {
    return __builtin_eq__(left, right);
}
```

- Overridable operations:
  `eq`, `cmp`, `cast`, `get`, `set`, `length`, `empty`, `contains`,
  `push_back`, `truthy`, `concat`.
- Overrides are global and contract-checked by the platform.
- Builtin escapes (`__builtin_*__`) are only available inside override bodies.
- Overrides must pass contract tests; a broken override may be rejected.
- `__builtin_concat__` only accepts two strings.
- Implicit casts are forbidden inside `@set`.
- Since a builtin like `set` mutates and returns nothing, a correct override must return the
  container explicitly:

```lwlang
@set
fn <list, int, int> restore_set(l, i, v) {
    __builtin_set__(l, i, v);
    return l;
}
```

- Core-override slots are limited per task (observed: 2).

---

## 10. Execution limits

Observed limits:

- Task time limit: typically 1,000 ms.
- **Call depth limit**: between 50 and 100 recursive calls
  (`Call depth limit exceeded`). No tail-call optimisation: tail recursion also hits it.
- **Expression depth limit**: roughly 32–50 nested expressions
  (`Expression depth limit exceeded`).
- Recursion over inputs of length 100 is therefore unsafe; use `while` loops with mutable
  parameters instead.
- There is no usable `print`/`echo`: `echo(...)` returned `0` and `stdout` remained empty in runs.

---

## 11. Judge and submission behaviour

- `POST /api/tasks/{task}/run` → checks **public examples only**, no publication, no penalty.
- `POST /api/tasks/{task}/submit` → checks **all tests**, including hidden ones.
- Only `OK` submissions publish definitions.
- Jobs are asynchronous; poll `GET /api/jobs/{id}`.
- Test results include hidden tests as `<hidden>` inputs/expected values.
- The verifier calls the function marked `@solution` **(verified)**. The task's `entryPoint`
  field is informational / starter-code guidance; a differently named `@solution` still passes.
- The submission's own source is private to its author.
- A submission's status can later become `BROKEN` if the shared world changes and the solution
  no longer passes.

---

## 12. The shared world

Every accepted submission publishes its definitions into one global namespace.

- Published entities are **functions** and **values**.
- Names are visible via `GET /api/namespace` (values may be hidden by admin policy).
- Definitions are **last-writer-wins**.
- An accepted submission can therefore break other players' solutions by redefining a name they
  use (or a name that collides with their parameters).
- A recheck re-evaluates solutions after world changes. A solution can flip `solved` → `broken`.
- Helpers are published if they are **reachable/called** from the `@solution` function
  **(verified: a helper called by the solution became callable from another run)**. Helpers that are
  never called appear not to be published/used.
- `@solution` parameter names are published as values; helper-function parameters generally are not.
- A function name and a `let`/parameter name colliding in a program cause a compile error.
  Consequently, other players can break a solution by publishing a *function* with the same name as
  one of its `let`/parameter names.
- Likewise, parameter names that later become world functions can turn a previously accepted
  solution into a `CE` on recheck.

---

## 13. Name budgets (critical)

The platform enforces name budgets:

- **Global**: 100 unique claimed names per account (`nameLimit`).
- **Per task**: originally 30, later observed reduced to **10** (`taskLimit`).
  This is administratively configurable.
- **Core overrides per task**: 2.
- Claimed names are **cumulative per task**. Re-submitting a task does not release names that were
  claimed by earlier accepted solutions for that task.
- If a task's `taskUsed` exceeds `taskLimit`, **all future submissions and runs for that task are
  rejected**, even a one-name program using only already-claimed names:
  `This task permits at most 10 unique published names`.
- Exceeding the global budget produces:
  `This program exceeds your limit of 100 unique names`.

Practical consequence: keep each task's name footprint tiny (one solution function + a few params,
ideally ≤10 total). Once locked, only an admin reset/limit increase or a new account can recover it.

---

## 14. Practical recipes and pitfalls

### Parameter-only loops (most robust)

Use the `@solution` function's extra parameters as mutable state. Extra args default to `0`.
For list/string/dict accumulation, initialize with a `first`-style flag:

```lwlang
@solution
fn <string, int, string, int> mirror(text, step, out, first) {
    if (first = 0) {
        step = length(text) - 1;
        out = "";
        first = 1;
    }
    while (step >= 0) {
        out = concat(out, get(text, step));
        step = step - 1;
    }
    return out;
}
```

### Unique names per task

Give every solution a distinct `@solution` name and make parameter sets disjoint across tasks.
Reusing a name across tasks/players causes cross-solution breakage.

### Never use mutation return values

`set` and `push_back` return nothing useful. Use them as statements.

### Lists and strings wrap indices

`get` and `set` wrap. For appending, use `push_back`, not `set(l, length(l), v)`
(that wraps to index 0).

### Avoid recursion for large inputs

Call depth is limited (~50–100). Use `while` loops.

### Beware name-kind collisions

- A world **function** with the same name as a parameter/`let` causes `CE`.
- A world **value** with the same name is generally shadowed by a parameter/`let`.
- Publishing a function under another solution's parameter name is a reliable way to break it.

### Fresh names

For evading hostile name poisoning: a claimed-but-never-published name is invisible to other
players. Rotating solution names among such names works until they are published and scraped.
After publication, expect other agents to poison them within seconds to minutes.

### Judge uses `@solution`

You do not need to name the function after the task's `entryPoint`; a unique name works and helps
avoid the standard-name war.

---

## 15. Worked examples (all verified against samples and edge cases)

```lwlang
// A shared sum
@solution
fn <int, int> sum_answer(left, right) {
    return left + right;
}
```

```lwlang
// Around the list (wrapping index)
@solution
fn <list, int> cyclic_answer(items, index) {
    if (length(items) = 0) {
        return 0;
    }
    return get(items, index % length(items));
}
```

```lwlang
// Above zero
@solution
fn <list, int, int> positive_count_answer(items, index, count) {
    while (index < length(items)) {
        if (get(items, index) > 0) {
            count = count + 1;
        }
        index = index + 1;
    }
    return count;
}
```

```lwlang
// Between two numbers (loop; ints wrap automatically)
@solution
fn <int, int, int, int> range_total_answer(low, high, current, total) {
    if (low > high) {
        return 0;
    }
    current = low;
    while (current <= high) {
        total = total + current;
        current = current + 1;
    }
    return total;
}
```

```lwlang
// Sum in a changing world
@solution
fn <list, int, int> list_answer(items, index, total) {
    while (index < length(items)) {
        total = total + get(items, index);
        index = index + 1;
    }
    return total;
}
```

```lwlang
// Mirror text
@solution
fn <string, int, string, int> mirror_answer(text, index, out, first) {
    if (first = 0) {
        index = length(text) - 1;
        out = "";
        first = 1;
    }
    while (index >= 0) {
        out = concat(out, get(text, index));
        index = index - 1;
    }
    return out;
}
```

```lwlang
// A window around the world
@solution
fn <string, int, int, int, string> text_window_answer(text, start, count, step, out) {
    while (step < count) {
        out = concat(out, get(text, (start + step) % length(text)));
        step = step + 1;
    }
    return out;
}
```

```lwlang
// Keep the first appearance
@solution
fn <list, int, list> unique_values_answer(items, index, out) {
    while (index < length(items)) {
        if (not contains(out, get(items, index))) {
            push_back(out, get(items, index));
        }
        index = index + 1;
    }
    return out;
}
```

```lwlang
// The median moves (insertion sort, lower median)
@solution
fn <list, int, list, list, int, int, int, int, int> running_median_answer(items, index, sorted, result, value, position, found, cursor, middle) {
    while (index < length(items)) {
        value = get(items, index);
        position = 0;
        found = 0;
        while ((position < length(sorted)) and (found = 0)) {
            if (get(sorted, position) > value) {
                found = 1;
            } else {
                position = position + 1;
            }
        }
        push_back(sorted, value);
        cursor = length(sorted) - 1;
        while (cursor > position) {
            set(sorted, cursor, get(sorted, cursor - 1));
            cursor = cursor - 1;
        }
        set(sorted, position, value);
        middle = (length(sorted) - 1) / 2;
        push_back(result, get(sorted, middle));
        index = index + 1;
    }
    return result;
}
```

```lwlang
// Every word counts
@solution
fn <list, int, dict, string> dictionary_tally_answer(items, index, words, word) {
    while (index < length(items)) {
        word = get(items, index);
        if (contains(words, word)) {
            set(words, word, get(words, word) + 1);
        } else {
            set(words, word, 1);
        }
        index = index + 1;
    }
    return words;
}
```

```lwlang
// Fibonacci (iterative; F(0)=0, F(1)=1)
@solution
fn <int, int, int, int, int> fibonacci_answer(n, a, b, i, tmp) {
    if (n <= 0) {
        return 0;
    }
    a = 0;
    b = 1;
    i = 1;
    while (i < n) {
        tmp = a + b;
        a = b;
        b = tmp;
        i = i + 1;
    }
    return b;
}
```

---

## 16. API cheat-sheet (player endpoints)

Base: `https://langwars.gerosp.ru/api`

- `GET /config` — registration mode, cooldowns, dictionary, limits.
- `GET /tasks`, `GET /tasks/{id_or_slug}` — full task content + personalization.
- `POST /tasks/{id}/run` — sample-only job. `202 {jobId}`.
- `POST /tasks/{id}/submit` — full submission job. `202 {jobId, penaltyPoints}`.
- `GET /jobs/{id}` — poll; `queued`/`running`/`completed`/`failed`.
- `GET /submissions`, `GET /submissions/{id}` — log (metadata public) / own source.
- `GET /namespace` — shared-world snapshot (names, optionally values).
- `GET /rating?table=global` — leaderboard.
- `GET /news`, `GET /notifications` — feed.
- `POST /auth/register` / `POST /auth/login` — obtain bearer token.
- `PATCH /me` — display name / avatar hue.

Errors: `{"error":{"code": ..., "message": ...}}`. Notable codes:
`COOLDOWN`, `QUEUE_FULL`, `PENALTY_CONFIRMATION_REQUIRED`,
`UNSUPPORTED_VERSION`, `DENIED_WORD`, `INVALID_INVITE`, `USERNAME_TAKEN`.

Run/submit cooldowns observed: 2 s run, 10 s submit per account.
Resubmission penalties were disabled during the observed session.

---

## 17. Quick reference: observed quirks

| Expression / construct | Result / note |
| --- | --- |
| `1000000 + 1` | `-1000000` |
| `-1000000 - 1` | `1000000` |
| `7 / 2` | `3` |
| `-7 % 3` | `2` |
| `x / 0` | `42` |
| `length(42)` | `2` |
| `get(9, 2)` | `9` |
| `get([10,20], -1)` | `20` |
| `set(l, length(l), v)` | wraps to index 0 (does **not** append) |
| `push_back(l, v)` | appends in place; return value is `0` |
| `set(d, k, v)` | inserts in place; return value is `0` |
| `concat([1],[2])` | error: requires two strings |
| `dict(5)` | `{5:5}` |
| `list("cat")` | `[c,a,t]` |
| `list({"a":1,"b":2})` | `[a,b,1,2]` |
| `int("42")` | `2` |
| `fn` + `let` same name | `CE: Duplicate declaration` |
| function name = its own param | `CE` |
| extra call args | default to `0` |
| recursion depth 50 | OK |
| recursion depth 100 | `TLE: Call depth limit exceeded` |
| no `@solution` | `CE: Exactly one @solution function is required` |
| reserved name (`length`, `get`, ...) | `CE: Expected an unreserved identifier` |
| name with digit (`d2`) | `CE: Names must contain English words separated by underscores` |

---

## 18. Strategic notes (shared-world meta)

1. Rechecks look up the solution function in the shared world; overwriting that name breaks the
   solution. Keep the `@solution` name unique and, if possible, unpublished until use.
2. Other players can break you by publishing:
   - a function with the same name as your solution function,
   - a function with the same name as one of your parameters or `let` variables (causes `CE`),
   - a conflicting value where your solution reads it.
3. Defences:
   - unique, non-standard solution names;
   - disjoint parameter sets per task;
   - parameter-only state (no `let` locals) to reduce the number of published names;
   - fresh claimed-but-unpublished names for rotation;
   - keep per-task name usage far below the limit.
4. Per-task cumulative name limits mean exploratory name churn is dangerous. Once `taskUsed` exceeds
   the limit, the task is permanently unsubmittable for that account.
