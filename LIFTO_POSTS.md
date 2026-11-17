# Rampart × Lifto — X post drafts

**Status:** drafts only. Replace every bracketed field with verified information.
Do not start the countdown until Lifto confirms the fundraiser date and page.

This follows the Lifto plan: 10 numbered posts over seven days, plus a Day 6
leaderboard/rank update. The Day 7 “We're live” announcement is Post 10.

---

## Post 1 — Day 1: announcement

Rampart is preparing to raise on @LiftoWorld.

We're building an on-chain policy vault for AI trading agents on Solana.

An agent can request a transfer, but it shouldn't be the final authority over
where capital goes. The program enforces spending rules at execution.

Explore the Devnet demo: https://rampart.pxxl.click

Our Lifto page: [CONFIRMED LIFTO PAGE URL]

## Post 2 — Day 2: writer pool

**Publish only after Lifto confirms the current weekly writer pool and its terms.**

Builders: Lifto is running its weekly writer pool this week.

If you write about Rampart, share your own experience or technical take. Tag
@userampart and @LiftoWorld so the post can be found.

Good angles:
- Try the Devnet demo and inspect a refusal.
- Explain why agent spending limits should live outside the agent runtime.
- Compare an in-agent check with an on-chain enforcement boundary.

Pool details and eligibility: [CONFIRM WITH LIFTO]

No bought posts, fake engagement or vote incentives.

## Post 3 — Day 3: “Why Rampart, why now” X Article

**Working title:** Why AI agents need a spending boundary they cannot talk their way around

An AI agent can read market data, call tools and sign transactions. That makes
the signing path a security boundary.

The problem is not limited to a model producing a bad answer. A malicious input,
compromised tool, poisoned memory or ordinary agent error can reach a wallet if
the agent has broad authority.

Guardian's November 2026 threat-model overview documents these attack paths and
argues that authorization belongs in downstream systems, not in the model:
https://guardian.security/blog/ai-trading-agent-security/

[ADD: the real observation or incident that caused Rampart to be started. Do not
claim this external incident was the founder's motivation unless it was.]

### How Rampart works
1. Capital is deposited into a program-owned vault.
2. An authorized agent requests a transfer.
3. The Solana program checks configured policy in the instruction that moves funds.

The agent does not get to override a refusal by changing its prompt.

### What is actually live
The existing immutable Devnet deployment demonstrates the destination allowlist,
per-transaction cap, per-epoch cap, owner freeze and timelocked policy path.

Important limitation: the deployed Pyth decoder has a known field-offset defect.
Corrected decoding, feed pinning, staleness validation and reference refresh are
source-only until a new program ID is deployed. The Meteora DBC guard is also
source/CI only. Rampart does not execute swaps.

### What comes next
Correct and deploy a new Devnet program, verify it with transaction evidence,
complete one agent integration, and scope an independent security review.

Demo: https://rampart.pxxl.click
GitHub: https://github.com/hqBrimax/rampart
Whitepaper: https://rampart.pxxl.click/whitepaper
Lifto: [CONFIRMED LIFTO PAGE URL]

## Post 4 — Day 3: proof and status

A transparent Rampart update:

- Devnet only. No mainnet deployment.
- Public live demo: https://rampart.pxxl.click
- The deployed program enforces destination allowlisting, per-transaction and
  per-epoch caps, owner freeze and timelocked policy changes.
- The immutable deployment has a known Pyth decoder field-offset defect. We are
  not presenting its price-band or halted-feed checks as reliable protections.
- The Meteora DBC guard is source/CI only. No swaps are executed.
- No external audit or customer traction is being claimed.

Inspect the demo and its transaction links yourself.

[ADD: transaction list / confirmed explorer link and exact behavior it demonstrates]

If you build agents on Solana, we'd value a technical review.

## Post 5 — Day 4: product video

**Attach the edited Lifto product video. Do not claim an exact action/refusal count
unless the current run log and signatures prove it.**

What happens when an AI trading agent requests a spend?

Rampart checks the request against policy in the Solana program before funds move.

This is a live Devnet demonstration. You can inspect the transaction links yourself.

Try it: https://rampart.pxxl.click

Fundraising on @LiftoWorld: [CONFIRMED LIFTO PAGE URL]

## Post 6 — Day 4: comparison card

**Card headline: Where does the spending rule live?**

**In-agent policy**
- Check runs inside the agent's own runtime.
- The agent may be able to bypass or skip the check if it controls that runtime
  and signing path.

**Off-chain policy service**
- Check runs in a service the agent calls.
- Enforcement depends on the agent being unable to bypass the service and on
  how signing authority is configured.

**On-chain policy vault (Rampart)**
- Capital sits in a program-owned account.
- The check runs in the instruction that moves the funds.
- A rejected instruction reverts atomically.

Rampart is not a replacement for key management. It focuses on where the spending
policy is enforced.

[TECHNICAL REVIEW REQUIRED before publishing comparisons to named providers.]

## Post 7 — Day 5: founder introduction

I'm Nathan Oyewole, the founder building Rampart.

Rampart is focused on one question:

What happens when an autonomous agent has the ability to move capital, but the
request it makes should not be allowed?

We're building the enforcement boundary outside the agent, directly into a
Solana program.

[ADD: one truthful paragraph about your background and why you chose this problem.]

You can inspect what exists today: https://rampart.pxxl.click

## Post 8 — Day 5: why Lifto

**Publish after the AMA and after confirming which Lifto support has actually
been provided.**

Why we're choosing @LiftoWorld for this fundraise:

We're early. We need more than a launch announcement — we need builders who will
inspect the work, challenge the assumptions and help us find the first real
integration.

[ADD: specific parts of the Lifto experience that have actually happened:
assessment feedback, founder support, product video, posters, office hours or AMA.]

Our next milestones are public in the roadmap: a corrected Devnet deployment,
verifiable guard evidence, one agent integration and an independent
security-review scope.

[CONFIRMED LIFTO PAGE URL]

## Post 9 — Day 6: founder video script (60–90 seconds)

**Do not record until the bracketed story is supplied.**

“I'm Nathan, founder of Rampart.

[ADD: the real incident or observation that made you start building it.]

The issue I kept coming back to is this: an AI agent can be useful and still
make a dangerous request. If the same agent controls the wallet and the policy
check, the boundary can be weaker than it looks.

Rampart puts the spending rule in a Solana program. Capital sits in a
program-owned vault. The agent requests a transfer. The program checks the
policy before funds move.

We have a public Devnet demo you can run and inspect today. It is early, it is
not mainnet, and our current immutable deployment has known Pyth limitations
that we're addressing with a new program deployment.

Over the next four weeks, we're focused on [ADD: founder-approved milestones].

We're preparing to raise on Lifto to fund that work. You can try Rampart and
follow the build at [CONFIRMED LIFTO PAGE URL].”

## Day 6 — unnumbered leaderboard update

**Publish only with a current screenshot and verified rank.**

We're currently #[VERIFIED RANK] on @LiftoWorld.

Thank you to [VERIFIED COUNT] people who have voted and supported the project.

If you haven't voted yet, one wallet can vote once. Follow the official Lifto
page here: [CONFIRMED LIFTO PAGE URL]

[ATTACH: current leaderboard screenshot]

## Post 10 — Day 7: fundraise live

Publish only after the Lifto page is actually open.

Rampart is live on @LiftoWorld.

We're raising to [FOUNDER-APPROVED PURPOSE / MILESTONES].

Rampart is building on-chain spending controls for autonomous trading agents
on Solana.

Read the plan, inspect the Devnet demo and support the next stage:

[OFFICIAL LIFTO FUNDRAISE URL]

Only trust links from the official Rampart and Lifto accounts. We will never DM
you first.

---

## Day 5 AMA run-of-show (30–45 minutes)

1. **0–5 min:** founder introduction and what Rampart does.
2. **5–15 min:** run the public Devnet demo and open a real refusal transaction.
3. **15–25 min:** why this problem matters, where Rampart fits, what is live vs roadmap.
4. **25–40 min:** open Q&A. Be direct about the Pyth limitation, immutability,
   no mainnet and no external audit.
5. **Final 5 min:** explain the Lifto page and let interested listeners vote/follow.

After the AMA, publish the recording or three key takeaways. Do not imply
endorsement by Lifto or any attendee.

## Final approval checklist

- [ ] Every placeholder replaced.
- [ ] Every factual and technical claim checked against the current deployment.
- [ ] Fundraise date, amount, instrument and use of funds approved.
- [ ] Lifto page URL verified.
- [ ] Writer pool and any separate giveaway confirmed.
- [ ] Founder story supplied and approved.
- [ ] Builder quotes and names permissioned.
- [ ] Product video shows the actual live demo, not a mockup.
- [ ] Transaction signatures checked on Devnet.
- [ ] No countdown until Day 1 is genuinely scheduled.
