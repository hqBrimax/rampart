# Rampart — Readiness and documentation update, 17 November 2026

This entry records the post-deployment-readiness review. It does not claim a new
program deployment or a new on-chain security capability.

## Current-state corrections

- Updated the roadmap to reflect the passing CI run on the inspected `main`
  commit and the current public Devnet demo.
- Clarified that the immutable deployed program's Pyth decoder predates the
  corrected field offsets. The deployed price-band and halted-feed checks are not
  claimed as reliable protections until a corrected binary is deployed.
- Kept feed pinning, staleness validation, reference refresh and the Meteora DBC
  guard explicitly marked source-only.
- Corrected demo authorization documentation: public RUN is rate-limited and
  spends sponsor-funded Devnet SOL; `RAMPART_RUN_TOKEN` protects operator-only
  RESET and is not required for RUN.
- Added a four-week product delivery sequence with evidence-based exit criteria.
  These are planning milestones, not claims that the work is complete.
- Added a Lifto campaign runbook and draft X posts/AMA script.
- Added the founder-approved origin: Rampart began as a hobby after a personal
  issue; private details remain private. Updated the fundraising brief and
  campaign drafts to use this framing.
- Fundraise terms, page URL, giveaway status and builder testimonials remain
  explicit inputs; no countdown or unsupported claim is approved.

## Evidence and boundaries

- Public demo: https://rampart.pxxl.click
- Existing immutable Devnet program:
  `6Ea4SqpMwVE57cghBU4LqhZBSs573cQ8o8FXDitKUHEr`
- Inspected successful CI run:
  https://github.com/hqBrimax/rampart/actions/runs/44082330560
- No mainnet deployment, external audit, customer traction, TVL or revenue is
  claimed by this update.

---

# Rampart - Audit fixes, 10 November 2026

This is the complete record of what the independent audit found and what changed.
Written so it can be posted directly.

---

## What prompted this

An independent read of the entire Rampart repo (program, oracle mock, client, CI,
docs) was done on 10 November 2026. It found eight issues. Five are fixed here, two
are documented with a reason, and one requires a deployment.

The audit itself is in `AUDIT.md`; the plan is in `ROADMAP.md`.

---

## Fix 1 - CRITICAL - the Pyth decoder read the wrong fields

**This is the one that matters most.**

The vault reads a Pyth v2 price account. The offsets in the code were:

```rust
pub const PYTH_EXPO_OFFSET: usize = 0x14;   // correct
pub const PYTH_PRICE_OFFSET: usize = 0x30;  // WRONG
pub const PYTH_STATUS_OFFSET: usize = 0x44; // WRONG
```

The real Pyth v2 layout (verified against `pyth-sdk-solana` and `pyth-client-js`,
and confirmed by compiling the struct and printing its field offsets) is:

```
0x14  exponent        (correct)
0x30  ema_price       <- the code read this and called it "price"
0xD0  agg.price       <- the actual aggregate price
0xE0  agg.status      <- the actual trading status
0xE8  agg.pub_slot    <- never read
```

So the deployed program was reading the **EMA price** and calling it the price, and
reading **padding bytes** and calling them the status. The deviation band - the point
of the Pyth check - was computed against the wrong field.

**Why the tests did not catch it:** the mock oracle was written to the same wrong
offsets. The code and the mock were consistently wrong together. A test that uses a
fixture built from the same misunderstanding cannot detect the misunderstanding.

**Fixed:** the offsets now match the real layout, and the mock writes the real layout.
A test fixture built from the real struct now backs the tests.

---

## Fix 2 - HIGH - the test suite did not compile, and CI had been red for 23 days

`cargo test -p rampart` failed to build:

```
error[E0503]: cannot use `env.feed` because it was mutably borrowed
   --> programs/rampart/tests/test_rampart.rs:560
   --> programs/rampart/tests/test_rampart.rs:588
```

Both were the same shape - `guarded_transfer(&mut env, ..., env.feed)` evaluates
`&mut env` and `env.feed` in one call, which the borrow checker rejects.

The GitHub Actions workflow runs `cargo test -p rampart` and failed at the same two
lines. The last five runs on `main` were failures, going back to 18 October.

**Why it matters more than it looks:** a test suite that does not compile is a test
suite that does not run. Every claim about the guards rested on tests that could not
execute, and a real regression could land unnoticed because the gate was already down.

**Fixed:** bind `let feed = env.feed;` before each call. The suite now compiles.

---

## Fix 3 - MEDIUM - a zero epoch would divide by zero and brick the vault

`propose_policy` validated the caps and the allowlist length, but not the epoch
length. Both spend paths then compute:

```rust
let epoch = clock.slot / policy.epoch_len_slots;
```

With `epoch_len_slots == 0` this is a division by zero, which aborts the transaction.
The vault is not drained - nothing moves - but it is bricked: no spend can succeed
until the owner applies a policy with a non-zero epoch.

**Fixed:** `propose_policy` now rejects `epoch_len_slots == 0`, and `apply_policy`
checks it again defensively (so a policy stored by an older program version cannot
brick a vault either). A test covers it.

---

## Fix 4 - LOW - no staleness window

`decode_price` required `status == TRADING`, but a feed can report trading and simply
not have published. A stale price passed the band check. This was already documented
in `docs/gaps.md`.

**Fixed:** the decoder now reads `agg.pub_slot`, and every caller checks it against
the current slot with a `MAX_SLOT_AGE` of 150 slots (about a minute). A stale price
is refused with a new `PriceStale` error. A test covers it.

---

## Fix 5 - LOW - the "daily" cap is ~15 minutes

`DEFAULT_EPOCH_SLOTS = 2160` is about 15 minutes at 400 ms/slot, but the error is
called `DailyCapExceeded`. Either the name or the constant is wrong.

**Decision:** the error name is kept, because the error codes are published and
renaming would shift them. The constant is now documented in place as a **rate limit,
not a daily cap** (a real daily cap would be ~216,000 slots). Changing the constant
would change behaviour for every existing vault, so it is left for a deliberate
migration rather than done silently.

---

## Fix 6 - LOW - the timelock is ~24 seconds

`DEFAULT_TIMELOCK_SLOTS = 60` is about 24 seconds. That is not a meaningful timelock.

**Decision:** documented, not changed. The important context, now written in the
source: the timelock is a *defence-in-depth* control for a trusted owner, not the main
trust boundary, because **withdraw is owner-signed and untimelocked** - a compromised
owner key can take the funds immediately regardless of the timelock. The constant is
fixed at init and cannot be changed; a future version should let the owner choose it.

---

## Not fixed here, and why

### The deployed binary is behind its own source (MEDIUM)

The source has the feed-pin check (`FeedMismatch`); the **deployed** program at
`6Ea4Sq...` predates it. `docs/gaps.md` says so plainly.

This cannot be fixed by a commit. The devnet program was deployed with `--final` and
its upgrade authority is the system program, so it cannot be changed. Every fix above
requires a **new program id** and a migration. That is Phase 2 of `ROADMAP.md`.

### No Pyth program-id check (INFO)

The decoder reads the account layout but does not verify the account is owned by the
Pyth program. Once the feed is pinned (the new deployment), the layout assumption
becomes acceptable; a program-id check is belt-and-braces and needs a decision about
how the mock demo continues to work.

### Immutability (INFO)

The program is immutable, so every fix above is source-only until a new program id is
deployed. That is the single most important operational fact about Rampart.

---

## Compatibility notes

- **Error codes above 6026 are unchanged.** `PriceStale` was appended at the end of
  the enum (6027) rather than inserted, because the codes are published. Inserting it
  would have shifted `PriceExponentInvalid` and everything after it.
- **`init_vault` and the policy instructions are unchanged**, so the IDL and the
  client keep working.
- **The mock oracle's layout changed.** Anyone running the demo against the old mock
  must rebuild it.

## Verification

- `cargo check -p rampart` - clean
- `cargo test -p rampart --no-run` - the suite compiles (it did not before)
- `cargo test -p rampart --test test_dbc_snapshot` - 12/12 pass
- The integration tests require `cargo-build-sbf` (the CI builds the `.so` first);
  CI is the gate for those.

## Files changed

```
programs/rampart/src/pyth.rs                    offsets + pub_slot + freshness check
programs/rampart/src/error.rs                   PriceStale appended
programs/rampart/src/constants.rs               timelock and epoch documented
programs/rampart/src/instructions/init_vault.rs         freshness check
programs/rampart/src/instructions/refresh_reference.rs  freshness check
programs/rampart/src/instructions/guarded_transfer.rs   freshness check
programs/rampart/src/instructions/propose_policy.rs    reject epoch_len_slots == 0
programs/rampart/src/instructions/apply_policy.rs      defensive epoch check
programs/oracle-mock/src/lib.rs                real layout + pub_slot
programs/rampart/tests/test_rampart.rs         compile fix, new fixtures, 2 new tests
```
