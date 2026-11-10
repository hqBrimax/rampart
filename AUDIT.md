# Rampart - Security Audit

**Date:** 2026-11-10
**Auditor:** anvil (independent read of the whole repo)
**Scope:** `programs/rampart`, `programs/oracle-mock`, `client/`, CI, docs
**Deployed program:** `6Ea4SqpMwVE57cghBU4LqhZBSo573cQ8o8FXDitKUHEr` (devnet, immutable)
**Tests:** 35 (23 integration + 12 DBC snapshot)

---

## 1. What Rampart is

A Solana program that holds an agent's trading capital in program-owned PDAs and
enforces a risk policy inside the instruction that moves funds. The claim: the agent
signs, the program decides, and a compromised agent key cannot drain the vault.

## 2. Trust model

| Actor | Trusted? | Can do |
|---|---|---|
| **Owner** | Yes | init, deposit, withdraw, register/unregister agents, freeze, propose/apply policy, refresh reference |
| **Agent** | No | request a transfer to an allowlisted destination, within caps, while the price band holds |
| **Program** | - | enforce all of the above |

The owner is a trusted party by design. Withdraw bypasses freeze; that is the
recovery path. This is stated in the docs and in the code comments, and it is a
reasonable choice. It means "Rampart removes the agent as a risk, not the owner."

## 3. Findings

**Status, 10 November 2026 (post-fix):** Finding 0 fixed (suite compiles), Finding 1
fixed with a test, Finding 3 fixed (documented in source), Finding 4 fixed (documented
in source), Finding 5 fixed with a test, Finding 6 open (needs a deployment decision).
Finding 2 and Finding 7 are unchanged. See `CHANGELOG.md` for the full record.

| # | Severity | Component | Finding | Status |
|---|---|---|---|
| 0 | **High** | `tests/test_rampart.rs` | **The test suite does not compile. CI has been red since 18 Oct.** |
| 1 | Medium | `guarded_transfer` / `propose_policy` | `epoch_len_slots = 0` divides by zero |
| 2 | Medium | deployed binary | Feed not pinned in the binary that is live |
| 3 | Low | `constants.rs` | Timelock is ~24 seconds, not a meaningful timelock |
| 4 | Low | `constants.rs` | "Daily" cap is ~15 minutes |
| 5 | Low | `pyth.rs` | No staleness window |
| 6 | Info | `pyth.rs` | Hardcoded Pyth offsets, no program-id check |
| 7 | Info | architecture | Immutable binary means every fix needs a new program id |

---

### Finding 0 - High - the test suite does not compile

`cargo test -p rampart` fails to build. Two borrow-checker errors:

```
error[E0503]: cannot use `env.feed` because it was mutably borrowed
   --> programs/rampart/tests/test_rampart.rs:560:57
error[E0503]: cannot use `env.feed` because it was mutably borrowed
   --> programs/rampart/tests/test_rampart.rs:588:57
```

Both are the same shape:

```rust
assert_custom(
    guarded_transfer(&mut env, 5_000_000_000, dest, env.feed),
    E_DEV_TOO_HIGH,
);
```

`&mut env` and `env.feed` are evaluated in the same call, so the borrow checker
rejects it. The fix is one line in each test:

```rust
let feed = env.feed;
assert_custom(guarded_transfer(&mut env, 5_000_000_000, dest, feed), E_DEV_TOO_HIGH);
```

**This is not a local problem.** The GitHub Actions `build-sbf` workflow runs
`cargo test -p rampart` and it fails at the same lines. The last five runs on
`main` are all failures, going back to 18 October - **23 days of red CI**.

**Why it matters more than it looks.** A test suite that does not compile is a
test suite that does not run. Every claim in the README about "observed refusals"
and every `docs/gaps.md` statement about what the guards do rests on tests that
currently cannot execute. It also means a real regression could land unnoticed,
because the gate is already down.

**Fix:** the two-line change above, plus a check that CI is green. This should be
the first commit.

---

### Finding 1 - Medium - `epoch_len_slots = 0` divides by zero

`propose_policy` validates the caps and the allowlist length, but **not**
`epoch_len_slots`:

```rust
if daily_usd_cap_micro == 0 || per_tx_usd_cap_micro == 0 {
    return err!(ErrorCode::InvalidCap);
}
if allowlist.len() > MAX_ALLOWLIST { ... }
// epoch_len_slots is not checked
policy.pending_epoch_len_slots = epoch_len_slots;
```

`apply_policy` copies it through unchecked, and both spend paths then do:

```rust
let epoch = clock.slot / policy.epoch_len_slots;
```

With `epoch_len_slots == 0` this is a division by zero, which **aborts the
transaction**. The vault is not drained - nothing moves - but it is bricked: no
further spend can succeed until the owner applies a policy with a nonzero epoch.

**Impact:** denial of service on the vault. Owner-only, so it is either
self-inflicted or requires a compromised owner key. Either way it should not be
possible.

**Fix:** reject `epoch_len_slots == 0` in `propose_policy` (and defensively in
`apply_policy`). Add a test that proposes `0` and expects `InvalidCap`.

---

### Finding 2 - Medium - the live binary does not pin the price feed

The source is correct:

```rust
if ctx.accounts.price_feed.key() != ctx.accounts.vault.price_feed {
    return err!(ErrorCode::FeedMismatch);
}
```

The **deployed** program predates this check. `docs/gaps.md` says so plainly:
*"Source now pins the feed pubkey at init and refuses any other account on a spend.
Not in the deployed binary."*

That means the binary that judges can hit accepts any account that decodes as a
price. An agent can supply its own feed account.

**Impact:** the price band is computed against an agent-chosen price. The caps are
still enforced (they are USD-denominated and use the same feed), so this is not a
direct drain - but the deviation guard, which is the point of the Pyth check, is
bypassed.

**Fix:** deploy the current source under a new program id. This is already the
planned path; the audit confirms it is the highest-value deployment.

---

### Finding 3 - Low - the timelock is ~24 seconds

`DEFAULT_TIMELOCK_SLOTS = 60`. At Solana's ~400 ms slot time that is roughly
**24 seconds**. A timelock is supposed to give people time to react; 24 seconds
does not.

This is a defense-in-depth control for a trusted owner, so the severity is low.
But if the design intent is "policy changes cannot happen overnight," the constant
does not deliver that.

**Fix:** raise it (hours, not slots-per-second), or document that this is a
deliberately short default and that the owner is expected to choose their own.

---

### Finding 4 - Low - the "daily" cap is ~15 minutes

`DEFAULT_EPOCH_SLOTS = 2160`. That is about **15 minutes**, and the error code is
`DailyCapExceeded`.

Either the name or the constant is wrong. A 15-minute cap resets four times an
hour, which makes it a *rate limit*, not a daily cap - and a much weaker guard than
the name implies.

**Fix:** decide which one is intended. If it is a daily cap, the constant should be
near a day of slots. If it is a rate limit, rename the error and the docs.

---

### Finding 5 - Low - no staleness window

`decode_price` requires `status == TRADING`, but a feed can report trading and
simply not have published. A stale price passes the band check.

Documented in `gaps.md`. Real, and it matters more once the feed pin is deployed
(because the pin makes the feed identity trustworthy, not the data).

**Fix:** record the publish slot/offset from the Pyth account and reject anything
older than a threshold.

---

### Finding 6 - Info - Pyth decoding is layout-dependent

`pyth.rs` reads `expo @ 0x14`, `price @ 0x30`, `status @ 0x44` and does not check
the account's owner or the Pyth program id. That is fine for the mock (which writes
the same layout), but it means the decode is only as trustworthy as the account
handed in - which is exactly what Finding 2 is about.

**Fix:** once the feed is pinned (Finding 2), the layout assumption becomes
acceptable. A program-id check on the pinned feed would be belt-and-braces.

---

### Finding 7 - Info - immutability is a double edge

The devnet program was deployed with `--final`; the upgrade authority is the system
program and cannot be set again. That is a strong trust signal, and it is the right
call for a custody program.

It also means Findings 1-6 cannot be fixed in place. Every one of them requires a
new program id and a migration. That is the single most important operational fact
about Rampart: **source fixes do not reach the deployed program.**

---

## 4. What is done well

- **Honesty as a design input.** The README, `docs/gaps.md`, and the docs site
  separate *live* / *source-only* / *not-live* and publish the gaps. The
  "non-claims" page lists what the program does not do. This is rare and it is the
  most valuable thing in the repo.
- **The agent registry is validated properly.** `load_agent` checks the PDA
  derivation, deserializes, verifies the vault and key match, and checks `active`.
  A never-registered key gets a named error, not a generic failure.
- **The treasury is a derived PDA with an address constraint**, not a passed-in
  account. The destination cannot be the treasury.
- **Arithmetic is guarded.** `checked_add` on the spend, `checked_mul` in the price
  math, `u128` intermediates, and a saturating `pow10`.
- **Zero-copy deserialization is length-checked first.** `dbc.rs` explains exactly
  why: `try_deserialize` panics on a wrong-sized buffer, so the program would abort
  instead of returning an error. Checking the length first converts a malformed
  account into `NotADbcPool`.
- **Meteora dependency is pinned to an exact rev**, with a comment explaining that
  the DBC account layouts are a security boundary, not a build detail.
- **The DBC band is designed against a real attack.** `MAX_DBC_PROGRESS_BPS` is not
  a round number - it is placed below the graduation threshold specifically to stop
  a "finish this one, it's nearly there" graduation bot. The comment explains the
  reasoning.
- **The demo server is careful.** Timing-safe token compare, API-key redaction in
  every error path, and the spend endpoints gated behind `RAMPART_RUN_TOKEN`.
- **Every error has a stable, named code.** The README publishes the table.

## 5. Recommendations, in priority order

1. **Fix the two-line borrow error and get CI green.** The test gate is down; everything else is measured against a baseline that is not running.
2. **Deploy the current source under a new program id.** This is the only way
   Findings 2, 5 and 6 reach production. Nothing else matters as much.
3. **Reject `epoch_len_slots == 0`** in `propose_policy`, with a test. Small fix,
   prevents a self-inflicted brick.
4. **Resolve the "daily cap" mismatch** - rename it or change the constant.
5. **Add a staleness window** once the feed is pinned.
6. **Raise the timelock** or document the short default as deliberate.
7. **Add a Pyth program-id check** on the pinned feed.
8. **Keep the gaps document updated** with each deployment, and record which
   program id each statement applies to.

## 6. What this audit did not cover

- The Meteora DBC program itself (treated as a pinned external dependency).
- Economic/game-theoretic analysis of the policy parameters.
- The frontend beyond the server that drives it.
- A formal verification pass. The arithmetic is reviewed by reading, not by proof.

The DBC path is source and CI only; it was reviewed as source, not as a deployed
artifact.
