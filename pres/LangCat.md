# LWLang v0.3 — language and execution notes

Observed by exercising the LangWars platform at `https://langwars.gerosp.ru`
through its public API. Everything below is either directly confirmed by
experiments or explicitly marked as unconfirmed. LWLang has unusual
**globally shared names**, so the runtime model is part of the language spec.

---

## 1. Program shape

A program is a sequence of top-level declarations and function definitions.
It must contain **exactly one** `@solution` function. The judge calls that
function with the test arguments and compares its return value.

```lwlang
@solution
fn <int, int> sum_answer(left, right) {
  return left + right;
}
```

Other annotations exist for overriding shared standard operations:

```lwlang
@eq
fn <int, int> equal(left, right) {
  return __builtin_eq__(left, right);
}
```

Known annotations:

```
@solution  @eq  @cmp  @cast  @get  @set  @length
@empty     @contains  @push_back  @truthy  @concat
```

Known keywords:

```
let  fn  return  if  else  while  comefrom  and  or  not
```

`comefrom` is reserved by the lexer; its semantics were not explored.

---

## 2. Lexical rules

### 2.1 Comments

- Line comments: `// ...`
- Block comments: `/* ... */`

### 2.2 Literals

- Integers: decimal digits, e.g. `0`, `42`, `-7` (unary minus is an operator).
- Strings: double quoted, with escapes, e.g. `"cat"`, `""`, `"a\nb"`.
- Lists: `[]`, `[1, 2, 3]`, nested lists allowed.
- Dictionaries: `{}` and `{ "cat": 2, "dog": 1 }` are accepted in the
  interpreter. When a dictionary is returned by the API it may be rendered as
  `{"$dict": [[key, value], ...]}`; the `$dict` form is the published API
  representation, not source syntax.
- Booleans are not a separate type: truthy operations produce integer `1`/`0`.

### 2.3 Identifiers / names

This is stricter than in most languages:

- A name must be **English words from the platform dictionary, joined by
  underscores**.
- No digits are allowed inside a name.
- Maximum name length is 48 characters.
- A task may inherit or override the dictionary via `allowedWords`.
- Every declared name is budgeted:
  - function names,
  - parameter names,
  - every `let` variable name.
- Per-task limit: 30 distinct names.
- Per-account global limit: 100 distinct names.

Examples that were rejected with `INVALID_NAME`:

```
dt           helper_dict     mid        p1        l2        counts
```

Examples that are valid (assuming the words are in the dictionary):

```
sum_answer   helper_dictionary   positive_index   before_jump_set_false
```

---

## 3. Types

Declared types in function signatures:

```
int   string   list   dict
```

Type annotations are optional for ordinary functions; both of these forms
appeared in platform examples:

```lwlang
fn <int> fibonacci(value) { return 0; }
fn keep(number) { return number + 1; }
```

Stdlib **override** functions are stricter: the platform may require explicit
parameter types so the contract can type-check. An untyped `@length` override
was rejected with `CONTRACT: Implicit casts are forbidden inside @length`.

Observed value behaviour:

| Type | Notes |
|---|---|
| `int` | Wraps in the closed range `-1000000 .. 1000000`. `1000000 + 1` evaluates to `-1000000`. Division by zero returns `42`. |
| `string` | Sequence of Unicode code points. `get` returns a one-character string. `length` counts code points. |
| `list` | Heterogeneous; can contain ints, strings, lists, dicts. |
| `dict` | Key/value mapping. Observed with string keys, including the empty string. API publication uses `{"$dict": [[k, v], ...]}`. |
| “unit” | Mutating operations such as `set` and `push_back` returned `0` when their result was captured. |

There is no separate boolean type in observable data: `eq`, `contains`,
`truthy`, etc. return `1` or `0`.

---

## 4. Expressions and operators

Supported expression operators:

```
=   !=   <   <=   >   >=   +   -   *   /   %
and   or   not
```

Parentheses group expressions.

### 4.1 Equality

`=` is equality inside expressions:

```lwlang
if (n = 0) { return 0; }
```

Assignment is also written with `=` in statement position:

```lwlang
let total = 0;
total = total + 1;
i = i + 1;
```

The parser distinguishes assignment statements from equality expressions by
context. `let` declares/binds; a bare `name = expr;` assigns.

### 4.2 Integer arithmetic

Confirmed semantics:

| Expression | Result |
|---|---:|
| `7 / 2` | `3` |
| `6 / 2` | `3` |
| `-7 / 2` | `-4` (floor division, not truncation) |
| `7 % 3` | `1` |
| `-7 % 3` | `2` (sign follows the divisor, Python-like) |
| `1000000 + 1` | `-1000000` |
| `2 - 5` | `-3` |
| `3 * 4` | `12` |
| `7 / 0` | `42` |

All integer arithmetic wraps in `[-1000000, 1000000]`.

### 4.3 Logic and truthiness

- `truthy(0)` returned `0`.
- `truthy(1)` returned `1`.
- `eq(a, b)` returned `1`/`0`.
- `cmp(a, b)` returned `-1`, `0`, `1`.
- Conditions accept truthiness; `and`/`or`/`not` are available.

We used `and` in conditions successfully. Whether `and`/`or` short-circuit was
not separately proven; code was written to avoid depending on it where
possible.

### 4.4 String building

Use `concat` rather than `+` for strings:

```lwlang
result = concat(result, get(text, i));
```

`+` may or may not concatenate strings; this was not tested. `concat` is the
documented and confirmed operation.

---

## 5. Statements and control flow

```lwlang
let x = 0;                 // declaration + initialisation

x = x + 1;                 // assignment

if (condition) {
  ...
} else {
  ...
}

while (condition) {
  ...
}

return value;
```

- There is no confirmed `break` keyword. Loops were written with state
  parameters/conditions instead.
- There is no explicit `for`.
- Function bodies and top-level blocks use `{ ... }`.
- A function name used **without `()`** evaluates to that function’s **last
  return value**, not a function reference:

```lwlang
fn keep(number) { return number + 1; }

@solution
fn answer(value) {
  keep(value);
  return keep;       // returns the last value returned by keep(...)
}
```

This is a deliberate language quirk.

---

## 6. Functions and the global environment

### 6.1 Call syntax

```lwlang
name(arg1, arg2)
```

`@solution` is the entry point; its own name is arbitrary. Task metadata
contains an `entryPoint` such as `sum_answer`, but a different function name
works as long as exactly one function is annotated `@solution`.

### 6.2 Names are global

This is the most important runtime rule:

- All names are global, **including parameters and local `let` variables**.
- An accepted submission publishes:
  - its function definitions into the shared function namespace,
  - every `let` binding (top-level or inside a function) into the shared
    variable namespace.
- Parameters are **claimed names** but are **not published as world values**.
  They still consume name budget and can be clobbered if another publication
  introduces a variable with the same name.
- The latest publication for a name wins. Rechecks of active solutions run
  against the current world, so a previously accepted solution can become
  `BROKEN` when someone else publishes a conflicting name.

Observed collision rules:

| Existing world entry | New conflicting publication | Effect on old solution |
|---|---|---|
| parameter name | variable | old parameter binding breaks |
| local variable name | function | old local use breaks |
| function name | variable | old function call breaks |
| function name | function | latest function wins; old callers now run the new body |
| core operation | `@op` override | all users of that operation change |

Submitting the same code again republishes its names and can repair
function-/variable-name clobbers.

### 6.3 Consequences for defensive code

- Avoid mutable local `let` variables in solutions that must survive attacks.
- Put mutable state into **helper-function parameters**; parameters are not
  published and are therefore not visible to attackers.
- Use long, random, dictionary-word parameter names.
- Helper/wrapper function names are published and visible, but a
  function-name clobber can be repaired by resubmitting the same code.
- A parameter name that has ever been published as a world variable is unsafe:
  the world variable can shadow the parameter. Keep parameters unpublished.

Example of a local-free implementation:

```lwlang
fn <list, int, int> helper_list(items, index, total) {
  while (index < length(items)) {
    total = total + get(items, index);
    index = index + 1;
  }
  return total;
}

@solution
fn <list> list_answer(items) {
  return helper_list(items, 0, 0);
}
```

All loop state lives in `index` and `total`, which are helper parameters and
are not published.

---

## 7. Built-in shared operations

The standard operations are themselves part of the shared world and can be
overridden globally.

### 7.1 Ordinary callable operations

| Operation | Observed behaviour |
|---|---|
| `get(collection, index)` | List/string element access. Indices wrap cyclically: `get([10, 20, 30], -1)` returned `30`. For a dict, looks up a key. |
| `set(collection, index, value)` | Mutates lists/dicts in place; for lists/strings the index wraps. Return value observed as `0`; rely on mutation, not the return value. |
| `length(x)` | List/string length. Dict support was not explicitly exercised but is likely. |
| `contains(collection, value)` | Membership test; returned `1`/`0`. Worked for both lists and dict keys. |
| `push_back(list, value)` | Mutates the list in place. Return value observed as `0`; rely on mutation. |
| `concat(a, b)` | String concatenation: `concat("cat", "!")` → `"cat!"`. |
| `eq(a, b)` | Equality, returns `1`/`0`. |
| `cmp(a, b)` | Ordering, returns `-1`, `0`, or `1`. |
| `truthy(x)` | Truthiness, returns `0`/`1`. Observed `truthy(0) = 0`, `truthy(1) = 1`. |
| `empty(x)` | Not separately probed; name suggests an emptiness test. |
| `cast(x)` / `cast(type, x)` | Not separately probed; argument order/format is unconfirmed. |

### 7.2 Core regression probe

A useful probe program that exercises the common operations:

```lwlang
@solution
fn <int, int> sum_answer(a, b) {
  let first = [10, 20, 30];
  let second = [1, 2];
  let third = [1];
  set(second, 0, 9);
  push_back(third, 7);
  return [
    get(first, -1), length(first), contains(first, 20),
    concat("cat", "!"), get(second, 0), get(third, 1),
    truthy(0), truthy(1), eq(2, 2), cmp(2, 3),
    1000000 + 1, 7 / 2, 7 % 3
  ];
}
```

Observed canonical result:

```text
[30,3,1,cat!,9,7,0,1,1,-1,-1000000,3,1]
```

If this output changes, a shared core operation has been overridden.

### 7.3 Builtin escape calls

Only available **inside stdlib override functions**:

```
__builtin_eq__      __builtin_lt__
__builtin_get__     __builtin_set__
__builtin_length__  __builtin_concat__
__builtin_contains__
```

Ordinary functions must call the shared operations (`eq`, `get`, …), not the
`__builtin_*__` forms.

---

## 8. Standard-library overrides

Allowed override operations:

```
eq  cmp  cast  get  set  length  empty  contains  push_back  truthy  concat
```

Syntax: annotate a function with `@<operation>`:

```lwlang
@eq
fn <int, int> equal(left, right) {
  return __builtin_eq__(left, right);
}
```

Rules:

- Overrides are global: every solution using that operation is affected.
- Explicit parameter types are required in practice. An untyped `@length`
  override was rejected with `CONTRACT: Implicit casts are forbidden inside
  @length`.
- Contracts are not a semantic-correctness guarantee. A `<list>` `@length`
  override that simply returned `0` was accepted and broke every list-based
  solution. The checks appear to be type/structural, not behavioural.
- Overrides can resolve per type. A `<list>` `@length` override changed list
  length while string length remained correct in our tests. The exact overload
  model is not fully confirmed.
- Override function names are sticky/reserved. Once a name has been published
  under `@length` (or another operation), a later submission that tries to
  define a normal function with that same name is rejected with
  `CONTRACT: Replacement must retain @length`.
- Publishing a new override under a different function name makes it the
  latest active override, but the old name stays tagged/reserved.
- A task allows at most **2** core overrides (`nameBudget.coreLimit`).
- Builtin escapes are only legal inside override functions.
- A user cannot delete an override directly; publishing another override
  replaces the previous one. Administrators have a “restore defaults” action.

A correct list-length override, using a fresh function name:

```lwlang
@length
fn <list> safe_list_length(value) {
  return __builtin_length__(value);
}
```

---

## 9. Name budgets and publication limits

| Limit | Value |
|---|---:|
| Max identifier length | 48 |
| Distinct names per task (claimed, cumulative) | 30 |
| Distinct names per account, globally | 100 |
| Core overrides per task | 2 |
| Max source length | 65,536 characters |
| Request body | 512 KiB (API), 1 MiB proxy |

Important details:

- Every function name, parameter name, and `let` name counts.
- The per-task budget is **cumulative across submissions for that task**, not
  per program. Once a task has claimed 30 names, later submissions that
  introduce new names are rejected with `TASK_NAME_LIMIT`.
- Using an already-claimed name again costs no additional global budget, but
  still counts against that task’s distinct-name budget once.
- Reusing a parameter name across different tasks costs one global name but is
  otherwise safe as long as that name is never published as a variable.
- Extra helper functions can be added to an accepted submission to publish
  (and thereby clobber) arbitrary names, within the budgets above.

Relevant diagnostics:

```
INVALID_NAME        name contains non-dictionary words or digits
TASK_NAME_LIMIT     task's cumulative 30-name budget exceeded
NAME_LIMIT          account's global 100-name budget exceeded
CONTRACT            override contract/type violation
CE                  compile/contract error (includes the above)
TLE                 time/resource limit
```

Observed `CONTRACT` messages:

```
Implicit casts are forbidden inside @length
Replacement must retain @length
```

---

## 10. Execution model: run vs submission

- `run` tests only the task’s **public examples**. It publishes nothing and
  creates no submission.
- `submit` tests all tests, including hidden tests. Only an `OK` result
  publishes the program’s names into the shared world and makes it an active
  solution.
- Each test starts from the same shared-world snapshot; state does not leak
  between test cases.
- After any accepted publication that changes the world, active solutions are
  rechecked. A solution can change from `OK`/`solved` to `BROKEN` without its
  author doing anything.
- Rechecks and rating updates are asynchronous. The leaderboard and task status
  can lag behind a world change by seconds, so an immediately fetched rating is
  not necessarily final.
- A task’s `status` for a user is one of:

```
new        no submission
attempted  submissions exist, none currently passing
solved     current active solution passes
broken     previously accepted active solution now fails
```

- `solvedBy` counts distinct non-banned users whose current solution passes.
- Scores are attached to unique tasks with a currently passing solution.

---

## 11. Minimal patterns

### 11.1 Sum two integers

```lwlang
@solution
fn <int, int> sum_answer(left, right) {
  return left + right;
}
```

### 11.2 Sum a list without locals

```lwlang
fn <list, int, int> helper_list(items, index, total) {
  while (index < length(items)) {
    total = total + get(items, index);
    index = index + 1;
  }
  return total;
}

@solution
fn <list> list_answer(items) {
  return helper_list(items, 0, 0);
}
```

### 11.3 Cyclic index without locals

```lwlang
@solution
fn <list, int> cyclic_answer(items, index) {
  if (length(items) = 0) { return 0; }
  return get(items, index % length(items));
}
```

### 11.4 Dictionary tally

```lwlang
fn <list, dict, int> helper_dictionary(items, count, index) {
  while (index < length(items)) {
    if (contains(count, get(items, index))) {
      set(count, get(items, index),
          get(count, get(items, index)) + 1);
    } else {
      set(count, get(items, index), 1);
    }
    index = index + 1;
  }
  return count;
}

@solution
fn <list> dictionary_tally_answer(items) {
  return helper_dictionary(items, {}, 0);
}
```

### 11.5 Running lower median without locals

```lwlang
fn <list, list, list, int, int, int, int, int>
helper_median(items, result, sorted, i, value, j, position, middle) {
  while (i < length(items)) {
    value = get(items, i);
    push_back(sorted, 0);
    j = length(sorted) - 1;
    position = j;
    while (j > 0) {
      if (get(sorted, j - 1) > value) {
        set(sorted, j, get(sorted, j - 1));
        j = j - 1;
        position = j;
      } else {
        j = 0;
      }
    }
    set(sorted, position, value);
    middle = i / 2;
    push_back(result, get(sorted, middle));
    i = i + 1;
  }
  return result;
}

@solution
fn <list> running_median_answer(items) {
  return helper_median(items, [], [], 0, 0, 0, 0, 0);
}
```

### 11.6 Fibonacci (iterative, no locals)

```lwlang
fn <int, int, int, int, int>
helper_fib(n, a, b, t, i) {
  if (n <= 0) { return 0; }
  if (n = 1) { return 1; }
  a = 0;
  b = 1;
  i = 2;
  while (i <= n) {
    t = a + b;
    a = b;
    b = t;
    i = i + 1;
  }
  return b;
}

@solution
fn <int> fibonacci(n) {
  return helper_fib(n, 0, 0, 0, 0);
}
```

---

## 12. Gotchas / adversarial notes

1. **Locals leak globally.** `let x = ...` inside a function is visible to
   everyone as a world variable.
2. **Parameters are secret but budgeted.** They are not in `/api/namespace`,
   but their names are claimed and count toward limits.
3. **Publishing a variable with a parameter’s name breaks that parameter.**
4. **Publishing a function with a local variable’s name breaks that local.**
5. **Publishing a variable or function with an existing function’s name can
   break calls to that function.**
6. **Latest publication wins.** A name is not protected by ownership across
   accounts; another account can reclaim it.
7. **Resubmitting the same code republishes its names** and is the normal
   repair path for name clobbers.
8. **Function-name clobbers are repairable; parameter-name clobbers are not
   visible/targetable if the parameter was never published.** Keep parameter
   names out of the published variable namespace.
9. **Core operations are global attack surface.** A malicious `@get`,
   `@length`, etc. affects every solution. Probe the canonical regression
   output periodically.
10. **Core contracts are not a semantic-correctness guarantee.** A `<list>`
    `@length` override that returned `0` was accepted and broke every
    list-based task. Keep a probe and a known-good override payload for repair.
11. **Override function names are sticky.** Once a name is used for `@length`,
    defining a normal function with that name is rejected with
    `Replacement must retain @length`. Choose fresh override names and update
    any repair code that references them.
12. **Name budgets are a finite resource.** Extra helper functions used to
    clobber other players consume the publishing account’s global/per-task
    budgets permanently.

---

## 13. Unconfirmed / not fully explored

- Exact semantics of `comefrom`.
- Whether `and`/`or` short-circuit.
- Whether recursion is supported and how it interacts with “function name
  without `()` gives last return value”.
- Exact argument order and type syntax for `cast`.
- `empty` on each container type.
- Dict key types other than strings.
- Whether `+` works on strings/lists (we used `concat`).
- Whether `get`/`set` wrap positive out-of-range indices as well as negative
  ones (the documentation says list/string indices wrap).
- The full contract tests for `@op` overrides. Observed checks enforce typing
  and structural rules, but not semantic correctness.
- Whether an override declared for one type leaves other types on builtin
  defaults (a `<list>` `@length` override did not break string length).
- Whether an old override function name is permanently reserved or only while
  that override is the active one; in practice it stayed reserved after a newer
  override was published under another name.
