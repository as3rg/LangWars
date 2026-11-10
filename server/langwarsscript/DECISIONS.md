# LangWarsScript implementation decisions

The interpreter implements `docs/LangWarsScriptSpec.md`. The website calls the
language **LWLang**; Python modules, this document and execution metadata use
**LangWarsScript**. It does not translate source into Python or execute host code.
There are no filesystem, network, process, module, reflection or host-object APIs
available to a program.

The following choices resolve gaps or contradictions in the working specification.

- Integers wrap after literals, casts and arithmetic in the inclusive interval
  `[-1000000, 1000000]`. Literal digits are accumulated modulo `2000001`, avoiding
  unbounded host integer parsing. Division uses floor division. Remainder uses
  the absolute divisor so it remains nonnegative even for a negative divisor;
  the spec's floor-division and nonnegative-remainder requirements cannot jointly
  maintain `a = b*q+r` for negative divisors. `/ 0` and `% 0` return `42`.
- Binary operators associate to the left. Equality expressions use `=`; `==`
  is a syntax error, including where examples in the spec accidentally use it.
  Assignment is recognized only as a statement. Reading an unknown name yields
  `0`; assigning an unknown name establishes that name. Calling a nonfunction
  returns its value after evaluating its argument expressions.
- `float` literals/types and `function` as a declared parameter/cast type are
  rejected. Function names used as values resolve to their last result, initially
  `0`. A direct function-name argument to an ADL operation first converts that
  remembered result to `int`, as required by §5.7.2. Ordinary returns and assignments
  retain the remembered result's actual value type. Missing arguments are `0`,
  extra arguments are evaluated and discarded, and a missing return produces `0`.
- Names are case sensitive; dictionary membership of their underscore-separated
  English components is case insensitive. `allowed_words=None` means no dictionary
  policy (used for grandfathered rechecks); an explicit empty dictionary permits
  no user-defined names. Dictionary validation covers declarations, parameters,
  label names, references and user function calls. Builtin spellings are exempt.
  Names with digits, leading/trailing underscores, doubled underscores or non-ASCII
  letters are rejected. Names are never used for host attribute access.
- Strings use JSON escapes and Unicode code-point indexing, including astral
  characters. Raw newlines, invalid escapes and unpaired Unicode surrogates in
  source strings are syntax errors. `//` and nonnested `/* ... */` comments are
  supported. String `set` is a NOP. `concat` takes two arguments, casts both to
  strings, creates a new string and truncates at one million code points.
- Stringification follows the unquoted compact examples in the spec (`[1,2]`,
  `{1:2}`). This is a display conversion, not a source serialization format;
  strings nested inside collections are displayed without added quote marks.
- Default equality compares values recursively and requires matching types after
  the normal operation's argument conversion. `__builtin_eq__` instead rejects
  differing argument types. Dictionaries compare independently of insertion order.
  Dictionary keys use linear equality searches, so mutable and composite keys do
  not depend on host hashing. Reinsertion replaces the value of the first matching
  key. Mutating an existing key does not automatically reinsert it or merge earlier
  physical entries; this previously unspecified mutable-key corner is deterministic.
  Dictionary length counts distinct keys under the currently active equality even
  when mutation or a later equality override makes earlier physical entries equal.
- Default comparison orders primitive values normally, lists lexicographically by
  recursive typed value, and dictionaries by sorted recursive key/value pairs.
  Nested type order is `int`, `string`, `list`, `dict`. This makes default ordering
  consistent with by-value equality without relying on ambiguous display strings.
  Cyclic values without a finite comparison exhaust the execution budget.
- Lists and dictionaries preserve reference aliases inside one execution. Direct
  insertion into self makes a shallow copy, including a new dictionary entry table.
  Indirect cycles may be constructed, but a cycle in a value to be published is
  rejected with a resource diagnostic: global snapshots are finite values and
  cannot contain references. Snapshot encoding uses plain integers/strings/lists
  and `{"$dict": [[key, value], ...]}` for arbitrary dictionary keys. Each global
  name is decoded independently, so aliases do not cross snapshot boundaries.
- `set`, `push_back` and `swap` return `0`. Two-argument `swap` writes only to named
  arguments; writes toward anonymous expressions are NOP. Three-argument `swap`
  exchanges two elements in a list/dictionary. Cast-created temporary collections
  are mutated only temporarily. Mutating operations cannot alter a frozen recheck
  overlay, even through aliases or nested collection references.
- Default standard-library implementations participate as typed ADL candidates.
  A user override replaces the default candidate for its first-argument domain
  and standard arity; untouched domains retain their defaults. Therefore an integer
  equality override does not silently replace string/list equality. Arity wins
  before typedness, then nearest first-argument type wins with `float` omitted.
  A typed default has priority over an untyped user candidate of the same arity.
  Among user definitions, newer publication groups are searched first and source
  order breaks ties within a group. Explicit `publication_priority` and
  `source_order` metadata preserve this behavior through PostgreSQL JSON ordering.
  Rechecks retain published priorities, so rerunning an old source does not
  promote its old override above a later player's definition.
- `comefrom` is declarative, including in unreachable code. It intercepts a target
  before that statement executes; nearest absolute source offset wins, then the
  earlier source location breaks a tie. Numeric targets select the first executable
  statement on that physical, one-based line. Labels and line references resolve
  within a source compilation unit and may cross its functions; unrelated source
  files do not accidentally intercept identical physical line numbers. A cross-
  function transition replaces the active function frame, does not rebind parameters,
  returns to the existing caller, and updates the destination function's remembered
  result. Any interception entering/leaving a contracted function is rejected.
  A later replacement may remove an old interception target; that inherited dormant
  interception is ignored rather than blocking unrelated new submissions.

Publication and contract checks

- Each task test begins from the same independent snapshot; test order cannot
  mutate the next test's inputs. All tests must pass using builtin by-value result
  equality, so overriding language equality cannot fool the judge. Changes from
  the **first test** are selected for publication. This deterministic rule avoids
  merging incompatible values from multiple test runs. Hidden-test ordering is
  therefore not a channel for selecting the published state.
- Function parameters are global for execution and can be overwritten by other
  functions. The test harness's argument bindings themselves are not published;
  explicit program declarations/assignments, mutations of existing global values,
  function definitions and remembered results are published. This choice prevents
  hidden test inputs from leaking through ordinary parameter names. Global parameter
  shadowing by later explicitly published values still works during rechecks and
  contract validation. It also keeps test harness bindings from permanently turning
  every contract parameter into a constant.
- `read_only=True` suppresses publication; it does not prevent local execution.
  `overlay_names` ignores original declarations, assignments, parameter bindings
  and deep mutations of names owned by a later submission. Original definitions
  with those names are not reinstalled. Administrative restoration of a removed
  stdlib override is respected when the old submission is rechecked.
- All inherited and new annotated definitions receive static checks and a bounded
  deterministic probe suite, including seeded pseudorandom integers, boundary values,
  literals from published definitions, and newly published values. Equality probes
  check reflexivity, transitivity and result domain; comparison probes check result
  domain, reflexivity, equality compatibility and weak/strict transitivity.
  Collection probes check valid-key get coverage, physical set and push mutations,
  and composition of separately overridden get/set operations. The proposed
  nondegeneracy condition on equality is deliberately not implemented: constant-true
  equality can be legal, as the spec explicitly allows.
- Contract bodies permit free-form conditionals/loops/arithmetic but only explicit
  calls to the five specified builtin escapes. Explicit casts and implicit casts
  inside the body are rejected; entry argument conversion remains allowed. Invalid
  builtin equality argument types, contract annotation removal, and `comefrom`
  crossings are rejected. Runtime guards also check scalar result domains and
  equality/comparison reflexivity for the actual encountered values.
- Finite tests **cannot prove universal invariants of arbitrary free-form programs**.
  The spec permits test-based checking; this implementation combines static
  restrictions, deterministic/adversarial probes and runtime guards. A sufficiently
  specialized implementation may evade sampled transitivity checks. Resource budgets
  may also reject unusually expensive valid definitions. This is a practical limit,
  not a claim of formal verification. A future formal subset could offer stronger
  guarantees, but would restrict the free-form syntax the spec requests.
- Candidate publication validation runs against the exact merged snapshot, with
  globally published names protected from contract parameter/assignment shadowing.
  Contract diagnostics identify the conflicting variable and operation without
  exposing the override implementation's name. The backend must publish only if
  the validated world version is still current; it performs a CAS/retry transaction.

Resource and moderation boundary

- Source is capped at 64 KiB and 16,384 tokens; syntactic nesting is capped at 64.
  Execution uses step, wall-clock, call-depth, expression-depth, value-depth and
  allocation budgets. Recursive comparisons, casts, serialization, repeated aliases,
  shallow copies and generated strings are bounded as well. The default allocation
  budget is 100,000 cells; resource-limited cases receive `TLE`, not host exceptions.
  The language's promise of no ordinary runtime errors does not disable the
  platform's finite resource limits or contract rejection.
- Encoded publication output is capped at 2 MB and 100,000 traversed value nodes.
  The backend additionally bounds total world size and executes the interpreter in
  a disposable process with OS resource limits and an external wall-clock deadline.
  Interpreter exhaustion does not publish partial state.
- Moderation normalizes with Unicode NFKC plus case folding and checks source and
  decoded string tokens, closing ordinary Unicode-escape bypasses. The backend
  separately checks resulting published string values, covering concatenation of
  blocked terms. This is configurable substring filtering, not semantic moderation
  or a promise to detect every evasion.
