# Rampart fundraising brief

**Status:** working draft — founder inputs required before publication.

## 1. What Rampart does

Rampart is an on-chain policy vault for trading agents on Solana. Capital sits in
program-owned accounts. An agent can request a spend, but the program enforces
configured policy in the instruction that moves the funds.

The core thesis is narrow: do not rely on an agent to obey its prompt or an
off-chain policy service to be called. Put the spending boundary at the point of
execution.

## 2. Current product facts

- Public product and live Devnet demo: https://rampart.pxxl.click
- Repository: https://github.com/hqBrimax/rampart
- Existing Devnet program:
  `6Ea4SqpMwVE57cghBU4LqhZBSs573cQ8o8FXDitKUHEr`
- The founder reports that the production API and public live demo have been
  tested successfully.
- Founder-provided demo transaction:
  https://explorer.solana.com/tx/5m4AwxoMbioSWHKVvpuEhQfRy6Ch9QpLoyrEuEL3Rx63bfCx2zJ8dqc2L5uNia4uKyq9Bf9JEuhCtueq6zAdr9MR?cluster=devnet
- CI passed on inspected commit `64fb85a`: web typecheck/build and SBF build/tests.
- The current deployment is Devnet only and immutable.
- The audit found a Pyth decoder field-offset defect in the deployed binary.
  Corrected decoder, feed pinning, staleness validation and reference refresh are
  source-only until a new program ID is deployed.
- Meteora DBC guard is source/CI only. Rampart does not execute swaps.
- No mainnet, external audit, customers, TVL, revenue or token are claimed.

Do not turn demo activity into customer traction. Do not describe source-only
controls as deployed.

## 3. Why now — research framing

AI agents are gaining access to wallets, tools and financial infrastructure. The
security issue is not only whether a model can be manipulated; it is whether a
mistake, malicious input or compromised tool can reach an irreversible signing
path.

Useful external context:
- Guardian's 12 November 2026 threat-model overview describes prompt injection,
  poisoned memory, compromised operator access, agent errors and malicious tools,
  and recommends enforcing authorization in downstream systems:
  https://guardian.security/blog/ai-trading-agent-security/
- CoinDesk Research's 28 September 2026 GoPlus report discusses the shift toward
  execution security for autonomous systems:
  https://www.coindesk.com/research/goplus-security-h1-2026
- Helius published a Solana agent-wallet security explainer in February 2025:
  https://www.helius.dev/blog/how-to-build-a-secure-ai-agent-on-solana

These sources establish a problem context; they do not establish Rampart's market
size, demand, traction or competitive superiority. Any market-size claim needs
separate primary research.

## 4. Four-week delivery plan

### Week 1 — Correct and prepare the security boundary
- Complete source review of the Pyth decoder correction, feed pin, staleness
  validation and reference refresh.
- Add/confirm regression tests for each guard.
- Finalize new program ID and migration plan.
- Keep the old immutable deployment clearly labelled.

### Week 2 — New Devnet deployment and proof
- Deploy the reviewed source under a new program ID.
- Run positive and negative scenarios against that exact binary.
- Publish a transaction evidence table: guard, expected outcome, actual outcome,
  signature, program ID.
- Update demo, technical paper and migration guide.

### Week 3 — Integration and external review
- Select one agent framework for an end-to-end integration.
- Produce a developer quickstart and reproducible example.
- Invite external builders to test; publish only feedback they consent to share.
- Scope an independent security review of the exact candidate.

### Week 4 — Release candidate and distribution
- Publish versioned Devnet release candidate and evidence bundle.
- Resolve or explicitly document review findings.
- Publish technical paper, threat model and migration guide.
- Make a written go/no-go decision for mainnet preparation. Mainnet is not promised
  as a four-week deliverable.

## 5. Fundraise details — founder must complete

- **Target amount:** [FOUNDER INPUT REQUIRED]
- **Currency:** [FOUNDER INPUT REQUIRED]
- **Instrument:** [equity / SAFE / grant / other — confirm]
- **Runway target:** [FOUNDER INPUT REQUIRED]
- **Minimum viable raise:** [FOUNDER INPUT REQUIRED]
- **Use of funds:** [FOUNDER INPUT REQUIRED]
- **Entity / jurisdiction / IP ownership:** [FOUNDER INPUT REQUIRED]
- **Token:** no token is required for the current product; do not imply token launch
  or token allocation unless the strategy changes and is legally reviewed.

Suggested use-of-funds categories to price, not pre-filled percentages:
1. Program engineering and Devnet release hardening.
2. Independent security review and remediation.
3. Agent-framework integration and developer tooling.
4. Infrastructure, monitoring and demo reliability.
5. Legal, entity and IP work.
6. Founder runway / operating costs.

## 6. Founder story — founder must complete

Rampart began as a hobby project after the founder experienced a personal issue
that made the weakness of agent-controlled spending limits feel concrete. The
founder has chosen not to disclose the private details publicly at this stage.

The project grew from that personal starting point into a tool focused on AI
trading-agent security.

**Founder-approved origin framing:**

“I started building Rampart because of a personal issue I experienced. It began
as a hobby project, but as I explored the problem, I saw how useful it could be
for AI trading agents. An agent can be talked into moving money it should not
move. If the limits live in the same process as the agent, a jailbreak can get
around them. Rampart takes a different approach: capital sits in a Solana
program-owned account. The agent signs a request, and the program allows it or
refuses it.”

- **Trigger:** personal experience; private details intentionally undisclosed.
- **What failed in the existing approach:** spending limits colocated with the
  agent process can be bypassed if that process is manipulated.
- **Why an on-chain policy boundary:** enforce the decision in the Solana program
  that controls the program-owned capital, rather than trusting the agent to
  police itself.
- **Why you are the person to build it:** founder-built project that started as
  a hobby and developed through hands-on engineering.
- **What changed since the first commit:** [Add evidence-backed milestones.]

## 7. Traction and trust

Current status: no customer, design partner, external reviewer or paid usage is
documented in the repository. Add names only with permission and evidence.

For each prospective builder pilot, record:
- project / person and permission to name them;
- framework and use case;
- demo or integration date;
- what they tested;
- feedback or quote approved for publication;
- follow-up commitment, if any.

## 8. Investor-facing positioning

**Short description:** On-chain spending controls for autonomous trading agents on
Solana.

**Core distinction:** Rampart places the policy check in the program instruction
that moves funds, rather than relying solely on the agent's own runtime to decide
whether a spend is allowed.

**Current stage:** early Devnet product; public demo; no mainnet deployment and no
external audit.

**Ask:** [FOUNDER INPUT REQUIRED — amount, instrument, use of funds, and what the
fundraise unlocks.]
