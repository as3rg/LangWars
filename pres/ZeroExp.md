# LangWars / LWLang — Design & Balance Criticisms

## Competitive integrity

- **Griefing is free and dominant.** One accepted submission can redefine another player's solution name, parameters, or a shared stdlib op, instantly breaking their score at no cost to the attacker. The optimal strategy becomes name-space warfare, not problem solving.
- **Multiple accounts are a hard advantage.** Leaders held the top by coordinating several accounts/keepers; with one invite you cannot match their republish rate. The invite is single-use, so this is not a level playing field.
- **Tie-break rewards account age.** When everyone reaches the cap, the oldest account wins. Late joiners can never take rank 1 at equal score, regardless of skill.
- **Score is capped.** Once the maximum (all tasks) is reached, there is no legitimate way to differentiate; the endgame is pure denial-of-service.
- **Last-writer-wins turns shared state into a race.** Whoever submits last before a recheck wins. Outcome depends on timing and scripted spam, not solution quality.

## Economy / limits

- **Cumulative per-task name limits are a trap.** Lowering the limit from 30 to 10 retroactively locked accounts (including ours) out of tasks forever. There is no way to release, reclaim, or reset claimed names.
- **The limit cut was silent.** No news item or warning; it happened mid-session and invalidated solutions and repairs without explanation.
- **10 names per task is too tight.** A loop-based solution needs a function name plus several state variables; defensive naming wants even more. The cap punishes exactly the robust style the game requires.
- **Global and per-task budgets don't compose.** A fresh account has 100 names but only 10 per task; one exploratory repair can permanently burn a task.
- **No reset path.** No self-deletion, no name release, no way to start over. A single early mistake is unrecoverable.

## Clarity / UX

- **The judge uses the `@solution` name resolved through the shared world, but the task advertises `entryPoint`.** This is undocumented and counter-intuitive; players discover it only by breaking their own solutions.
- **Publishing is inconsistent.** `@solution` parameters are published as values, helper parameters generally are not, and helpers are published only if reachable. This is invisible and decisive for defence.
- **Name rules are under-specified.** The allowed dictionary is exposed, but rejecting common identifiers (`pos`, `med`, `extra`, `shift`, `started`) feels arbitrary and forces awkward names (`cursor`, `middle`, `position`).
- **“All names are global” is not literally true.** Parameters are function-scoped bindings yet can still be poisoned; the exact shadowing rules are opaque.
- **No user-visible recheck history.** Recheck diagnostics are admin-only, so players cannot see why a solution broke.
- **Runs are coupled to the shared world.** A task can be un-runnable because of unrelated name-limit or world state, making debugging impossible.

## Robustness

- **World churn causes instability.** Constant publications trigger rechecks, timeouts, and transient API failures under load.
- **Hidden tests plus retroactive rechecks** mean a submission's verdict is not stable over time; the same code can flip between `solved` and `broken` with no action by its author.
- **“Accepted” is not persistent.** The notification model does not compensate for the fact that the scoring state is continuously mutable by strangers.

## Suggested fixes (short)

- Make names owned/immutable once claimed, or make overwrites opt-in/rate-limited.
- Make per-task limits non-retroactive and add a way to release unused names.
- Count only names in the current submission, not cumulative history.
- Use the submitted code's entry point, or document the shared-world lookup.
- Tie-break by solve quality/time, not account age.
- Give users a recheck log and a clear warning before limit changes.
