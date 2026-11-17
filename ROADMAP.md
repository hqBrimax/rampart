# Rampart roadmap

Companion to `AUDIT.md`. This roadmap separates the deployed product, source-only
work, and the next delivery milestones. Dates are planning targets, not promises.

## Current state — 17 November 2026

Rampart is a Solana program that holds an agent's capital in program-owned PDAs and
enforces policy inside the instruction that moves funds.

- **Live:** public product site and sponsor-funded Devnet demo at https://rampart.pxxl.click
- **Deployed program:** `6Ea4SqpMwVE57cghBU4LqhZBSs573cQ8o8FXDitKUHEr`, immutable (`--final`)
- **Verified deployed controls:** destination allowlist, per-transaction USD cap, per-epoch USD cap, owner freeze, timelocked policy changes, owner-authorized withdrawal
- **Pyth limitation:** the audit found the deployed decoder reads incorrect fields. The corrected offsets, feed pin, staleness window and reference refresh are source-only. Do not represent the deployed Pyth checks as reliable until a corrected binary is deployed and tested.
- **Source-only:** feed pin, reference refresh, 150-slot staleness check, Meteora DBC guard
- **CI:** green on the inspected `main` commit `64fb85a`; 37 tests reported by the repository README
- **Mainnet:** not deployed; no mainnet funds should be used

The public demo has been reported as tested successfully by the founder. Its public
RUN endpoint is rate-limited; the operator token protects RESET, not RUN. The
sponsor wallet is server-side and must remain funded and protected.

## Product delivery — next four weeks

These are proposed milestones for fundraising communication. They must be updated
if implementation, review, or external dependencies change.

### Week 1 — Correct the deployed security boundary

- Finalize the Pyth decoder correction and account validation in source.
- Review feed identity pinning, publish-slot staleness, and reference refresh.
- Add or confirm regression tests for each security invariant.
- Define the new program ID and migration plan; do not overwrite the immutable deployment.
- Publish a deployment checklist that ties every claim to a program ID and test.

**Exit evidence:** passing CI, reviewed source diff, tests for each guard, and a
written Devnet deployment/migration plan. No claim that the corrected guards are
live until the new binary is deployed and independently exercised.

### Week 2 — Deploy and verify the corrected Devnet program

- Deploy the reviewed source under a new program ID.
- Run positive and negative scenarios against that exact ID.
- Capture transaction signatures and explorer links for each demonstrated guard.
- Update the demo configuration, docs, README and old-program deprecation notice.
- Publish a migration guide for vault owners and integrators.

**Exit evidence:** new program ID, reproducible test results, transaction evidence,
and documentation that distinguishes old and new deployments.

### Week 3 — External integration and review

- Choose one agent framework or integration partner; avoid spreading effort across
  multiple integrations.
- Complete one end-to-end integration example and a developer quickstart.
- Invite independent builders to run the demo and record their feedback with
  permission.
- Scope an external security review against the exact candidate source and binary.

**Exit evidence:** merged integration or reproducible example, named and
permissioned feedback, and a written external-review scope. Do not imply an audit
has happened until a report exists.

### Week 4 — Release candidate and distribution

- Publish the technical paper, architecture, threat model, limitations and
  migration guide.
- Resolve review findings or document accepted risks.
- Publish a versioned Devnet release candidate and reproducible demo evidence.
- Decide the next gated path: further Devnet iteration, testnet-style validation,
  or mainnet preparation. Mainnet is not an automatic Week 4 outcome.

**Exit evidence:** versioned release candidate, evidence bundle, and an explicit
go/no-go decision for the next network stage.

## Mainnet gate

Do not move mainnet SOL until all of the following are true:

1. The exact program binary has the corrected Pyth decoder, feed identity check,
   staleness validation and reference-refresh behavior that the docs describe.
2. Tests exercise the deployed binary's relevant invariants.
3. An external audit reviews the exact release candidate.
4. A bug bounty or equivalent disclosure process is established.
5. A capped rollout and incident/recovery procedure are documented.

The Meteora DBC path must either be deployed and verified under the release
candidate or remain explicitly out of scope. Rampart does not execute swaps.

## Business and fundraising track

The protocol is a product primitive; fundraising needs a credible customer and
commercial thesis. These are unresolved founder decisions, not facts to invent:

- **Initial customer:** identify the first buyer/user profile and the specific
  workflow Rampart protects.
- **Distribution:** prioritize one agent framework integration and direct builder
  pilots over a broad feature list.
- **Monetization:** decide whether revenue comes from protocol usage, a hosted
  service, enterprise integration/support, or another model. Do not imply a token
  is required; the product currently works without one.
- **Entity and ownership:** confirm company formation, IP assignment and cap-table
  position before accepting investment.
- **Fundraise:** state the target amount, instrument, runway objective and use of
  funds before opening the campaign.

## Explicitly not planned

- A token before a demonstrated product need and product-market fit.
- Mainnet deployment of the current immutable binary.
- Claims of users, TVL, revenue, integrations, reviewers or partners without
  verifiable evidence and permission to name them.
- A launch date that outruns the security and deployment gates.

## One-sentence version

**Correct the deployed security boundary, prove it on a new Devnet program, integrate
with one agent workflow, and earn the right to prepare for mainnet.**
