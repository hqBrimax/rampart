function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <header>
        <div className="brand">
          <a className="logo" href="/">▮ RAMPART</a>
          <span className="tag">policy vaults for trading agents</span>
        </div>
        <nav className="hdr-right">
          <a className="pill" href="/">home</a>\n          <a className="pill" href="/whitepaper">whitepaper</a>
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
        <dd>curve guard, feed pin, 150-slot staleness check, reference refresh</dd>
      </div>
      <div>
        <dt>Mainnet</dt>
        <dd>not deployed</dd>
      </div>
    </dl>
  );
}

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

function Frame({ path, title, children }: { path: string; title: string; children: React.ReactNode }) {
  return (
    <Shell>
      <section className="card page-card docs">
        <Status />
        <Nav current={path} />
        <h3>{title}</h3>
        <div className="docs-body">{children}</div>
      </section>
    </Shell>
  );
}

function Start() {
  return (
    <Frame path="/docs" title="Docs">
      <p>Rampart is a Solana program that holds an agent's trading capital in a program-owned account. The agent signs a spend request. The program allows it or refuses it.</p>
      <p>This is a public draft of the spec. It describes what the deployed binary does, what is in source only, and what is not claimed. It is not a market document and it is not a token document.</p>
      <p>Program <span className="mono">6Ea4SqpMwVE57cghBU4LqhZBSs573cQ8o8FXDitKUHEr</span>. Deployed with <span className="mono">--final</span>. Upgrade authority is the system program and cannot be set again.</p>
      <p>For a local client build: run <span className="mono">cd client</span>, <span className="mono">pnpm install</span>, then <span className="mono">pnpm run build:web</span>. The hosted demo is a long-running Express service; its sponsor wallet and RPC configuration remain server-side.</p>
    </Frame>
  );
}

function What() {
  return (
    <Frame path="/docs/what" title="What it is">
      <p>The agent signs. The program decides. Funds sit in a program-owned PDA. A compromised agent key can request a drain. It cannot sign one.</p>
      <p>The check runs in the instruction that moves the lamports. A failed guard reverts. There is no partial execution and no review queue. The funds stay where they were.</p>
      <p>The spending key cannot unfreeze the vault. Freeze and policy changes are owner-only. Policy changes are timelocked.</p>
    </Frame>
  );
}

function Live() {
  return (
    <Frame path="/docs/live" title="What is live">
      <p>The instruction a judge can hit is <span className="mono">guarded_transfer</span> on the immutable devnet program.</p>
      <ul>
        <li>Destination allowlist</li>
        <li>Per-transaction USD cap</li>
        <li>Per-epoch USD cap</li>
        <li>Pyth price band against the vault reference</li>
        <li>Halted-feed rejection. Status must be trading; no deployed staleness window.</li>
        <li>Owner freeze</li>
        <li>Timelocked policy change</li>
      </ul>
      <p>Withdraw requires the owner signature. An agent attempt never reaches the chain. The demo names that refusal <span className="mono">OwnerSignatureRequired</span>.</p>
      <p>A recorded demo run completed 11 accepted and 7 refused spends. That is a demo, not usage.</p>
    </Frame>
  );
}

function NotLive() {
  return (
    <Frame path="/docs/not-live" title="What is not live">
      <p><span className="mono">guarded_dbc_transfer</span> and the 20–80% Meteora curve band are in source and CI. They are not in the deployed binary. A DBC path needs a new program id.</p>
      <p>The feed pin, 150-slot staleness check and <span className="mono">refresh_reference</span> are in source only. The deployed program still accepts any account that decodes as a price, and the reference is snapshotted at init.</p>
      <p>There is no staleness window. A feed that still says trading and has not published is not refused.</p>
      <p>There is no swap. The vault does not call Meteora. It does not co-sign a pool.</p>
    </Frame>
  );
}

function Threat() {
  return (
    <Frame path="/docs/threat-model" title="Threat model">
      <p>The registered agent is untrusted. It can request an outbound transfer. It supplies the destination and, on the deployed program, the price-feed account.</p>
      <p>It cannot move funds the program refuses. It cannot unfreeze the vault. It cannot change policy. It cannot withdraw. Withdraw is owner-signed, so the agent key has no path to it.</p>
      <p>The owner is trusted for init, freeze, policy, and withdraw. A compromised owner key can still withdraw. Freeze does not block the owner. That is the recovery path.</p>
      <p>The deployed feed check is a deviation band around a reference set at init. It is not a proof that the price is the market price.</p>
    </Frame>
  );
}

function NonClaims() {
  return (
    <Frame path="/docs/non-claims" title="Non-claims">
      <ul>
        <li>No mainnet. No users. No TVL.</li>
        <li>No custody of user keys. The owner holds the owner key. The agent holds a spending key with no authority.</li>
        <li>No swap execution. Gate and release only.</li>
        <li>No staleness window in the deployed program.</li>
        <li>The curve guard is not in the binary a judge hits.</li>
        <li>Withdraw while frozen is allowed. Freeze stops the agent, not the owner.</li>
        <li>No token. The vault works without one.</li>
      </ul>
    </Frame>
  );
}

function Try() {
  return (
    <Frame path="/docs/try" title="Try it">
      <p>Demo: <a href="https://rampart.pxxl.click">rampart.pxxl.click</a></p>
      <p>Repo: <a href="https://github.com/hqBrimax/rampart">github.com/hqBrimax/rampart</a></p>
      <p>The demo spends a sponsor wallet of devnet SOL. A run needs the host token. The page shows the named refusals. The program id on the page is the immutable one.</p>
    </Frame>
  );
}


function Accounts() {
  return <Frame path="/docs/accounts" title="Program accounts">
    <p>Rampart stores vault state and spending authority in program-derived accounts. These accounts are owned by the program, not by an agent key.</p>
    <ul>
      <li><strong>Vault</strong> — derived from <code className="mono">rampart_vault</code> and the owner. Stores owner, frozen state, reference price and timelock configuration.</li>
      <li><strong>Policy</strong> — derived from <code className="mono">rampart_policy</code> and the vault. Stores spending caps, slippage, destination allowlist and pending policy.</li>
      <li><strong>SpendTracker</strong> — derived from <code className="mono">rampart_spend</code> and the vault. Tracks spend within the current epoch.</li>
      <li><strong>Agent</strong> — derived from <code className="mono">rampart_agent</code>, vault and agent key. Records whether an agent is registered and active.</li>
      <li><strong>Treasury</strong> — derived from <code className="mono">rampart_treasury</code> and the vault. Holds the vault capital.</li>
    </ul>
    <p>The owner remains trusted. Withdraw requires the owner signature and is the recovery path, including when the vault is frozen.</p>
  </Frame>;
}
function Policies() {
  return <Frame path="/docs/policies" title="Policies and permissions">
    <p>The owner configures the policy and registers agents. An agent can request a guarded transfer but cannot edit policy, unfreeze the vault or withdraw.</p>
    <ul>
      <li><strong>Destination allowlist:</strong> only configured recipient addresses are eligible.</li>
      <li><strong>Per-transaction cap:</strong> each request is checked against the USD-denominated transaction ceiling.</li>
      <li><strong>Epoch cap:</strong> aggregate spend is checked against the configured epoch ceiling. The legacy error name <code className="mono">DailyCapExceeded</code> does not mean a calendar day; the default epoch is approximately 15 minutes.</li>
      <li><strong>Price band:</strong> the deployed transfer checks Pyth price against the reference snapshot created at vault initialization.</li>
      <li><strong>Freeze:</strong> the owner can stop agent spending. Owner withdrawal remains available as a recovery path.</li>
      <li><strong>Timelock:</strong> policy updates are proposed and become effective after the configured slot delay.</li>
    </ul>
    <p>Feed identity pinning, staleness validation and reference refresh are source-only. Do not treat them as active controls on the current deployed binary.</p>
  </Frame>;
}
function Errors() {
  const codes = [
    ["6001","VaultFrozen","Deployed"], ["6004","DestinationNotAllowed","Deployed"],
    ["6007","PerTxCapExceeded","Deployed"], ["6008","DailyCapExceeded","Deployed — epoch limit"],
    ["6011","PriceHalted","Deployed"], ["6013","PriceDeviationTooHigh","Deployed"],
    ["6016","PolicyNotEffective","Deployed"], ["6025","PoolTooLate","Source / CI only"],
    ["6026","FeedMismatch","Source only"], ["6027","PriceStale","Source only"]
  ];
  return <Frame path="/docs/errors" title="Refusal codes">
    <p>Codes are derived from the program error enum. Source-only entries are not protections in the immutable devnet deployment.</p>
    <div className="table-scroll"><table className="spec-table"><thead><tr><th>Code</th><th>Error</th><th>Scope</th></tr></thead><tbody>{codes.map(([code,name,scope]) => <tr key={code}><td className="mono">{code}</td><td className="mono">{name}</td><td>{scope}</td></tr>)}</tbody></table></div>
    <p><code className="mono">DailyCapExceeded</code> is a published legacy name for an epoch spending limit, not a calendar-day limit. Error codes are stable and must not be renumbered.</p>
  </Frame>;
}

export function DocsPage({ path }: { path: string }) {
  if (path === "/docs/accounts") return <Accounts />;
  if (path === "/docs/policies") return <Policies />;
  if (path === "/docs/errors") return <Errors />;
  if (path === "/docs/what") return <What />;
  if (path === "/docs/live") return <Live />;
  if (path === "/docs/not-live") return <NotLive />;
  if (path === "/docs/threat-model") return <Threat />;
  if (path === "/docs/non-claims") return <NonClaims />;
  if (path === "/docs/try") return <Try />;
  return <Start />;
}