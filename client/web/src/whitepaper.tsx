import { useEffect, useState } from "react";

interface Check {
  name: string;
  ok: boolean;
  level: "ok" | "warn" | "down";
  detail: string;
}

interface StatusBody {
  ok: boolean;
  state: "operational" | "degraded" | "down";
  rpc?: string;
  program?: string;
  owner?: string;
  uptime?: number;
  checkedAt?: string;
  latencyMs?: number;
  checks?: Check[];
  error?: string;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <header>
        <div className="brand">
          <a className="logo" href="/">
            ▮ RAMPART
          </a>
          <span className="tag">policy vaults for trading agents</span>
        </div>
        <nav className="hdr-right">
          <a className="pill" href="/">home</a>
          <a className="pill" href="/docs">docs</a>
          <a className="pill" href="/changelog">changelog</a>
          <a className="pill" href="/status">status</a>
        </nav>
      </header>
      <main className="page">{children}</main>
    </div>
  );
}

const PAGES = [
  { href: "/whitepaper", label: "Whitepaper" },
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
  { href: "/status", label: "Status" },
];

function Nav({ current }: { current: string }) {
  return (
    <nav className="docs-nav">
      {PAGES.map((p) => (
        <a key={p.href} href={p.href} className={p.href === current ? "on" : ""}>
          {p.label}
        </a>
      ))}
    </nav>
  );
}

function Status() {
  return (
    <dl className="docs-status">
      <div>
        <dt>Version</dt>
        <dd>0.1</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>public draft</dd>
      </div>
      <div>
        <dt>Network</dt>
        <dd>Solana devnet</dd>
      </div>
      <div>
        <dt>Program</dt>
        <dd className="mono">6Ea4SqpMwVE57cghBU4LqhZBSs573cQ8o8FXDitKUHEr</dd>
      </div>
      <div>
        <dt>Live</dt>
        <dd>allowlist, caps, Pyth band, halt, freeze, timelock</dd>
      </div>
      <div>
        <dt>Source only</dt>
        <dd>curve guard, feed pin, reference refresh</dd>
      </div>
      <div>
        <dt>Mainnet</dt>
        <dd>not deployed</dd>
      </div>
    </dl>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card page-card">
      <h3 className="section-title">{title}</h3>
      <div className="docs-body">{children}</div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="mono">{children}</code>;
}

function Whitepaper() {
  return (
    <Shell>
      <section className="card page-card">
        <Status />
        <Nav current="/whitepaper" />
        <h1>Rampart Whitepaper</h1>
        <p className="subtitle">On-chain policy vaults for trading agents on Solana</p>
        <p className="subtitle">Devnet · Immutable program · Public draft · 16 November 2026</p>

        <Section title="What is Rampart">
          <p>
            Rampart is a Solana program that holds an agent's trading capital in a
            program-owned account. The agent signs a spend request. The program
            allows it or refuses it.
          </p>
          <p>
            A compromised agent key can request a drain. It cannot sign one. The
            check runs in the instruction that moves the lamports. A failed guard
            reverts. There is no partial execution and no review queue. The funds
            stay where they were.
          </p>
          <p>
            The spending key cannot unfreeze the vault. Freeze and policy changes
            are owner-only. Policy changes are timelocked. Withdraw requires the
            owner signature. An agent attempt never reaches the chain.
          </p>
        </Section>

        <Section title="Why it exists">
          <p>
            An AI trading agent can be talked into moving money it should not
            move. A token name, a scraped page, or an API response can change what
            the agent believes it is allowed to do. It signs a transfer. The owner
            finds out from the explorer.
          </p>
          <p>
            The limits people put on that agent live in the same process, or in a
            service the agent can skip, or in a config the agent can write. The
            control and the thing being controlled share a threat model. That is
            the bug.
          </p>
          <p>
            The key that can trade is the key that can drain. Rampart splits those.
            The agent holds a spending key with no authority over the capital. The
            capital sits in a program-owned account. No private key exists for
            that account.
          </p>
        </Section>

        <Section title="Architecture">
          <p>All program-derived accounts.</p>
          <table className="spec-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Seeds</th>
                <th>Holds</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Vault</td>
                <td>rampart_vault, owner</td>
                <td>owner, frozen, reference price, timelock</td>
              </tr>
              <tr>
                <td>Policy</td>
                <td>rampart_policy, vault</td>
                <td>caps, slippage, allowlist, pending policy</td>
              </tr>
              <tr>
                <td>SpendTracker</td>
                <td>rampart_spend, vault</td>
                <td>epoch spend</td>
              </tr>
              <tr>
                <td>Agent</td>
                <td>rampart_agent, vault, agent</td>
                <td>registry</td>
              </tr>
              <tr>
                <td>Treasury</td>
                <td>rampart_treasury, vault</td>
                <td>the capital</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="Live guards">
          <p>The instruction a judge can hit is <Code>guarded_transfer</Code> on the immutable devnet program.</p>
          <table className="spec-table">
            <thead>
              <tr>
                <th>Guard</th>
                <th>Refusal code</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Destination allowlist</td>
                <td className="mono">6004 · DestinationNotAllowed</td>
                <td>Recipient not on the allowlist</td>
              </tr>
              <tr>
                <td>Per-transaction USD cap</td>
                <td className="mono">6007 · PerTxCapExceeded</td>
                <td>Transaction exceeds the per-tx USD cap</td>
              </tr>
              <tr>
                <td>Per-epoch USD cap</td>
                <td className="mono">6008 · DailyCapExceeded</td>
                <td>Epoch spend exceeds the per-epoch USD cap</td>
              </tr>
              <tr>
                <td>Owner freeze</td>
                <td className="mono">6001 · VaultFrozen</td>
                <td>The owner has frozen the vault</td>
              </tr>
              <tr>
                <td>Timelocked policy</td>
                <td className="mono">6016 · PolicyNotEffective</td>
                <td>Policy change not yet effective</td>
              </tr>
            </tbody>
          </table>
          <p>
            Observed refusal codes from the devnet demo. <Code>PolicyNotEffective</Code> and <Code>OwnerSignatureRequired</Code> also appear on owner-signed withdraws.
          </p>
        </Section>

        <Section title="On-chain proof">
          <p>
            A documented <Code>guardedTransfer</Code> to an address not on the allowlist was
            finalized and failed with custom program error 6004. The rejection came
            from inside the program. The client did not catch it. The runtime did
            not catch it.
          </p>
          <p>
            Explorer:{" "}
            <a href="https://explorer.solana.com/tx/5fTWxABNmeveksHH3vhcfNbTMkfMez8fXR9eiUVRWSJzhZiG5n1VFse2xk5ZS75pP2HJd8ZLyEZWafwH7ZuHDhqg?cluster=devnet" target="_blank" rel="noopener noreferrer">
              <span className="mono">5fTWxABNmeveksHH3vhcfNbTMkfMez8fXR9eiUVRWSJzhZiG5n1VFse2xk5ZS75pP2HJd8ZLyEZWafwH7ZuHDhqg</span>
            </a>
          </p>
          <p>
            That transaction proves the allowlist refusal only. It does not prove the USD caps. The immutable deployed Pyth decoder was found to read incorrect fields; its price-band and halted-feed checks are therefore not claimed as reliable protections. The corrected decoder is source-only until a new program id is deployed.
          </p>
        </Section>

        <Section title="What is not live">
          <ul>
            <li>
              <Code>guarded_dbc_transfer</Code> and the 20–80% Meteora curve band are in source and CI. Not in the deployed binary. A DBC path needs a new program id.
            </li>
            <li>The feed pin and <Code>refresh_reference</Code> are in source. The deployed program still accepts any account that decodes as a price.</li>
            <li>The deployed Pyth decoder predates the corrected field offsets. Do not rely on its price-band or halted-feed checks as verified protections.</li>
            <li>No staleness window in the deployed program.</li>
            <li>No swap. The vault does not call Meteora. It does not co-sign a pool.</li>
            <li>No mainnet. No users. No revenue. No token.</li>
          </ul>
        </Section>

        <Section title="Threat model">
          <p>The registered agent is untrusted. It can request an outbound transfer. It supplies the destination and, on the deployed program, the price-feed account.</p>
          <p>
            It cannot move funds the program refuses. It cannot unfreeze the vault. It cannot change policy. It cannot withdraw. Withdraw is owner-signed, so the agent key has no path to it.
          </p>
          <p>
            The owner is trusted for init, freeze, policy, and withdraw. A compromised owner key can still withdraw. Freeze does not block the owner. That is the recovery path.
          </p>
          <p>
            The deployed feed check is a deviation band around a reference set at init. It is not a proof that the price is the market price.
          </p>
        </Section>

        <Section title="Comparison">
          <p>
            The difference is where the check runs, and who can skip it. Rampart does not win by being more features. It wins if the refusal has to live outside the agent.
          </p>
          <table className="spec-table">
            <thead>
              <tr>
                <th>Approach</th>
                <th>Where the check runs</th>
                <th>Who holds the key</th>
                <th>What a jailbreak can skip</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>In-agent module</td>
                <td>Same process as the agent</td>
                <td>The agent</td>
                <td>The module. Same memory, same key.</td>
              </tr>
              <tr>
                <td>Off-chain risk engine</td>
                <td>A service the agent calls</td>
                <td>The agent, or a third party</td>
                <td>The call. The agent does not have to make it.</td>
              </tr>
              <tr>
                <td>Privy / Turnkey</td>
                <td>A key-management service</td>
                <td>The service. The agent requests a signature.</td>
                <td>Not the key. The policy still lives outside the chain, and a new counterparty sits in the trust boundary.</td>
              </tr>
              <tr>
                <td>Squads</td>
                <td>A multisig on chain</td>
                <td>A set of signers</td>
                <td>Not a single key. A spending limit still needs a signer path. An agent that is a signer can still spend inside the limit.</td>
              </tr>
              <tr>
                <td><strong>Rampart</strong></td>
                <td><strong>The instruction that moves the lamports</strong></td>
                <td><strong>Nobody. Capital is in a program-owned account. The owner holds the recovery key. The agent holds a spending key with no authority.</strong></td>
                <td><strong>Not the refusal. A failed guard reverts. The agent cannot unfreeze and cannot withdraw.</strong></td>
              </tr>
            </tbody>
          </table>
          <p>
            Rampart does not replace a key manager. It replaces the place the limit lives.
          </p>
        </Section>

        <Section title="Non-claims">
          <ul>
            <li>No mainnet. No users. No TVL.</li>
            <li>No custody of user keys. The owner holds the owner key. The agent holds a spending key with no authority.</li>
            <li>No swap execution. Gate and release only.</li>
            <li>No staleness window in the deployed program.</li>
            <li>The curve guard is not in the binary a judge hits.</li>
            <li>Withdraw while frozen is allowed. Freeze stops the agent, not the owner.</li>
            <li>No token. The vault works without one.</li>
          </ul>
        </Section>

        <Section title="Try it">
          <p>
            Demo:{" "}
            <a href="https://rampart.pxxl.click">rampart.pxxl.click</a>
          </p>
          <p>
            Repo:{" "}
            <a href="https://github.com/hqBrimax/rampart">github.com/hqBrimax/rampart</a>
          </p>
          <p>
            Program:{" "}
            <Code>6Ea4SqpMwVE57cghBU4LqhZBSs573cQ8o8FXDitKUHEr</Code>
          </p>
          <p>
            Sponsor:{" "}
            <a href="https://explorer.solana.com/address/2QXPxqAR41JEDdPgdQp2MX3S4F26xNAX4uDn2sqtvS5h" target="_blank" rel="noopener noreferrer">
              <Code>2QXPxqAR41JEDdPgdQp2MX3S4F26xNAX4uDn2sqtvS5h</Code>
            </a>
          </p>
          <p>
            Oracle mock:{" "}
            <a href="https://explorer.solana.com/address/2xbNzbkEZ65hLzi9TgdMBcncup6a5CA1qi3QLVTrwQ2p" target="_blank" rel="noopener noreferrer">
              <Code>2xbNzbkEZ65hLzi9TgdMBcncup6a5CA1qi3QLVTrwQ2p</Code>
            </a>
          </p>
        </Section>

        <footer className="whitepaper-footer">
          <p>
            Public draft · 16 November 2026 · This paper describes what the deployed binary does, what is in
            source only, and what is not claimed. It is not a market document and it is not a token document.
          </p>
        </footer>
      </section>
    </Shell>
  );
}

export default Whitepaper;
