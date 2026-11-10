# Rampart roadmap

Companion to `AUDIT.md`. That document says what is wrong; this one says what
happens next, in order.

## Where it is

A Solana program that holds an agent's capital in program-owned PDAs and enforces a
risk policy inside the instruction that moves funds.

- **Live:** devnet, program `6Ea4SqpM...UHEr`, immutable (`--final`)
- **Guards live:** allowlist, per-tx cap, per-epoch cap, Pyth band, halt, freeze, timelock
- **In source only:** feed pin, reference refresh, staleness window, the DBC path
- **Tests:** written, but **not compiling** (see Audit Finding 0)
- **CI:** red since 18 Oct
- **Mainnet:** not deployed, and the README says not to move funds yet

The honest one-line status: **a well-built, well-documented devnet proof with a
broken test gate and a deployed binary that is behind its own source.**

---

## Phase 0 - Stop the bleeding (days, not weeks)

The goal is a green gate and nothing else.

1. **Fix the borrow errors** in `tests/test_rampart.rs:560` and `:588` (bind
   `env.feed` to a local before the call). Confirm `cargo test -p rampart` is green.
2. **Confirm CI is green** on `main`.
3. **Add a test for `epoch_len_slots = 0`** - propose it, expect `InvalidCap`
   (after the fix in Phase 1).
4. **Record which program id every claim applies to.** The README currently mixes
   what the source does with what the deployed binary does.

Exit criteria: CI green, tests running, one commit that says so.

## Phase 1 - Harden the program (source only, new program id required)

These are fixes to source. Because the live program is immutable, **none of them
reach any deployment until Phase 2.**

1. **Reject `epoch_len_slots == 0`** in `propose_policy`, defensively again in
   `apply_policy`. (Audit Finding 1 - a zero epoch bricks the vault.)
2. **Add the staleness window** to `decode_price`: read the publish slot/offset and
   reject anything older than a threshold. (Finding 5)
3. **Add a Pyth program-id check** on the pinned feed. (Finding 6)
4. **Resolve the "daily cap" mismatch** - either change `DEFAULT_EPOCH_SLOTS` to
   something like a day, or rename the error and the docs to "rate limit".
   (Finding 4)
5. **Decide the timelock** - raise `DEFAULT_TIMELOCK_SLOTS` to hours, or document
   the ~24-second default as deliberate. (Finding 3)
6. **Add tests for each of the above.** The tests are the deliverable, not the code.

Exit criteria: every audit finding either fixed with a test, or explicitly
documented as accepted.

## Phase 2 - Deploy a new program id

The current binary cannot be changed. So:

1. **Pick the new program id** and document the migration path.
2. **Deploy the Phase 1 source** to devnet.
3. **Re-run the demo against the new id** and confirm every guard fires.
4. **Update the README, docs site, and gaps.md** to describe the new binary.
5. **Publish the old program as deprecated**, pointing at the new one.

Exit criteria: the deployed binary matches the source, and the docs say which is
which.

## Phase 3 - Distribution (can run in parallel with Phase 1-2)

The plugin PR is the wedge. Rampart does not need more features; it needs users.

1. **Land the Hermes plugin PR** (`sendaifun/solana-agent-kit#636`) - the round-2
   fixes are in and the catalog review is pending.
2. **One narrow integration** - pick a single agent framework or a single fund
   type and make it work end to end.
3. **Publish the audit and this roadmap** - the honesty is the differentiator, and
   it is also the fastest way to get a real reviewer.
4. **A written migration guide** for anyone moving from the old program id.

Exit criteria: one external team or fund using it, or one real integration PR from
someone else.

## Phase 4 - Mainnet (only after Phase 1-3)

The README's own gate: *"Do not move mainnet SOL until the feed pin, the refresh,
and a staleness window are in the binary that would hold the funds."*

1. **External audit** of the final source (not the current source).
2. **Bug bounty** on the exact binary that would hold funds.
3. **A capped deployment** - a small amount, a low cap, a short epoch.
4. **The DBC path** - deploy `guarded_dbc_transfer` or explicitly keep it out and
   say so.
5. **Then scale**, with the caps raised by a timelocked owner action.

Exit criteria: a versioned, audited, bounty-covered program id that the docs
describe accurately.

---

## The business track (parallel, not sequential)

The program is a primitive. A company needs a reason for someone to pay.

- **Answer the monetization question.** Protocol fee, subscription, or token? Right
  now there is no answer, and investors will ask.
- **Get the entity right** before any money: a proper company, IP assigned to it, a
  clean cap table. Lawyer first.
- **The Vanneck conversation** - the inbound is warm; the token question is the one
  to settle before the call.
- **One integration beats ten features.** Distribution is the moat.

---

## Explicitly not planned

- **A token before product-market fit.** The vaults work without one; the docs say
  so, and that should stay true until there is a job only a token can do.
- **A mainnet deployment of the current binary.** It is behind its own source.
- **Anything that would make the gaps document less honest.** The honesty is the
  asset. Do not trade it for a launch date.
- **Chasing every guard at once.** The order above is the order for a reason: a
  green gate, then the source, then the deployment, then the distribution.

---

## The one-sentence version

**Fix the tests, fix the source, deploy a new program id, then go find one user.**
Everything else is a detail.
