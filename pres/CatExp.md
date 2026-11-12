# CatExp — short design critique

## Main criticisms

- **Attack is far cheaper than defense.** One accepted submission can clobber many published names; the defender must repair each affected task separately under a 10s submit cooldown.
- **Function names are public and unowned.** Anyone can redefine another player’s `@solution`/helper name. There is no lease, cost, or protection.
- **Clobbers do not stick.** Resubmitting the same code reclaims the name immediately, so the game becomes a permanent refresh war rather than a coding contest.
- **Locals are published.** Any `let` variable is visible in `/api/namespace`; an attacker can publish a function with that name and break it.
- **Parameters are the only secret names**, but they are still budgeted and can be broken if ever published as variables. Safe code requires avoiding locals entirely — an obscure constraint.
- **Multi-accounting is effectively free.** Per-account name budgets and cooldowns mean extra accounts give extra attack capacity, extra repair workers, and full-score backups. One invite allowed four accounts in testing. Tie-breaks by account age make old accounts strategically valuable.
- **`run` leaks the hidden world.** A solution can return global names and read private values/last return values from the actual output, defeating the “names visible, values hidden” policy.
- **Core operations can be weaponized.** One accepted `@length` override returning `0` broke every list-based solution. The contract did not prevent it; checks appear structural/type-level, not semantic.
- **Override function names are sticky.** Once a name is used for an override, defining a normal function with that name is rejected (`Replacement must retain @length`), which can invalidate otherwise valid repair code.
- **Cumulative name budgets punish iteration and repair.** Dead submissions consume names permanently; attackers can force defenders to burn budget. Late-account repairs can become impossible.
- **Score is binary and current-only.** One break erases an entire task’s value; there is no partial credit, best-ever score, or defense score. If resubmit penalties are enabled, victims pay to repair.
- **Live rechecks favor 24/7 bots.** A solution can break while its author is offline; there are no shields, grace periods, or scheduled windows.
- **Standings lag behind rechecks.** Rating and task status can remain stale for seconds, so live standings are not a reliable measure of the current world.
- **Dynamic task additions shift the target silently.** The maximum score changes mid-event without a reset or clear scoring treatment.
- **Hidden tests plus no partial credit** make failures opaque and all-or-nothing.
- **Onboarding is weak.** The language guide is buried in the frontend bundle and collisions/name budgets are learned through sabotage, not taught.

## Balance summary

| Issue | Severity |
|---|---:|
| Attacker advantage | Critical |
| Multi-accounting | Critical |
| `run` world-data leak | Critical |
| Unprotected published names | High |
| Published locals | High |
| Global core overrides | Critical |
| Cumulative name budgets | High |
| Binary/current-only scoring | High |
| Live-recheck bot dominance | High |
| Tie-break by account age | Medium |
| Override-name stickiness | Medium |
| Stale live standings | Medium |
| Silent dynamic tasks | Medium |
| Poor onboarding | Medium |

## Verdict

Strong original concept, but the current economy and information rules make it a bot-vs-bot sabotage/ops game. It needs fewer free attacks, real name ownership, one-account enforcement, no `run` leakage, core contracts that cannot be trivially weaponized, and a score model that rewards both solving and defending.
