import { useCallback, useEffect, useRef, useState } from "react";

interface StepResult {
  seq: number; label: string; status: "ok" | "rejected" | "info" | "error";
  detail: string; tx?: string; errorCode?: number; errorName?: string; ts: number;
}
interface DemoStatus { status: string; error?: string; steps: StepResult[]; summary?: { ok: number; rejected: number; info: number } }
interface VaultInfo { owner?: string; frozen?: boolean; referencePrice?: string; timelockSlots?: string }
interface PolicyInfo { dailyUsd?: string; perTxUsd?: string; maxSlippageBps?: number; allowlist?: string[]; pendingExists?: boolean; pendingEffectiveSlot?: string }
interface State {
  status?: string; error?: string; owner?: string; program?: string; walletBalance?: number;
  feed?: string; feedPrice?: string; agent?: string; destination?: string; vault?: string;
  vaultState?: VaultInfo; policy?: PolicyInfo; spend?: { epochSlot?: string; spentUsd?: string }; treasuryBalance?: number;
}
interface ApiProblem { message: string; status?: number }
const PROGRAM = "6Ea4SqpMwVE57cghBU4LqhZBSs573cQ8o8FXDitKUHEr";
const TX = "5fTWxABNmeveksHH3vhcfNbTMkfMez8fXR9eiUVRWSJzhZiG5n1VFse2xk5ZS75pP2HJd8ZLyEZWafwH7ZuHDhqg";
const EXPLORER = "https://explorer.solana.com";
const SOLSCAN = "https://solscan.io";
const shorten = (value: string, n = 10) => value ? `${value.slice(0,n)}…${value.slice(-4)}` : "—";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { Accept: "application/json", ...init?.headers } });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : response.statusText || "Request failed";
    throw { message, status: response.status } satisfies ApiProblem;
  }
  return payload as T;
}
function errorMessage(error: unknown) {
  const problem = error as ApiProblem;
  if (problem?.status === 401 && problem.message?.toLowerCase().includes("not configured")) return "Demo execution is disabled: the server has no RAMPART_RUN_TOKEN configured. Contact the project operator.";
  if (problem?.status === 401 || problem?.status === 403) return "This action is protected. Enter the demo access token supplied by the project operator.";
  if (problem?.status === 409) return "A demo run is already in progress. Wait for it to finish or reset it.";
  if (problem?.status && problem.status >= 500) return "The API could not complete this request. Check service status and try again.";
  return problem?.message || "Could not reach the Rampart API. Check your connection and retry.";
}
function Header() {
  return <header className="site-header"><a className="wordmark" href="/" aria-label="Rampart home"><span className="mark">R</span> RAMPART</a><nav aria-label="Main navigation"><a href="/#architecture">Architecture</a><a href="/#security">Security</a><a href="/docs">Docs</a><a href="/whitepaper">Whitepaper</a><a href="/changelog">Changelog</a><a href="/status">Status</a></nav><a className="header-cta" href="#demo">Open demo <span aria-hidden="true">↗</span></a></header>;
}
function SectionTitle({ index, eyebrow, title, copy }: { index: string; eyebrow: string; title: string; copy: string }) {
  return <div className="section-title"><span className="eyebrow">{index} / {eyebrow}</span><h2>{title}</h2><p>{copy}</p></div>;
}
function DataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="data-row"><span>{label}</span><strong>{children}</strong></div>;
}
function Address({ value }: { value?: string }) {
  if (!value) return <span className="muted">Not available</span>;
  return <a className="mono link" href={`${SOLSCAN}/account/${value}?cluster=devnet`} target="_blank" rel="noreferrer">{shorten(value)}</a>;
}
function Guard({ name, detail, state = "deployed" }: { name: string; detail: string; state?: "deployed" | "source" }) {
  return <article className="guard-row"><span className="guard-mark" aria-hidden="true">{state === "deployed" ? "✓" : "—"}</span><div><h3>{name}</h3><p>{detail}</p></div><span className={`scope scope-${state}`}>{state === "deployed" ? "Devnet" : "Source only"}</span></article>;
}
function Step({ item }: { item: StepResult }) {
  return <li className="event-row"><span className={`event-state state-${item.status}`}>{item.status === "ok" ? "ACCEPTED" : item.status === "rejected" ? "REJECTED" : item.status.toUpperCase()}</span><div className="event-copy"><strong>{item.label}</strong><p>{item.detail}{item.errorCode != null ? ` · error ${item.errorCode}` : ""}</p>{item.tx && <a className="mono link" href={`${EXPLORER}/tx/${item.tx}?cluster=devnet`} target="_blank" rel="noreferrer">View transaction ↗</a>}</div></li>;
}
export default function App() {
  const [demo, setDemo] = useState<DemoStatus>({ status: "idle", steps: [] });
  const [state, setState] = useState<State>({});
  const [apiError, setApiError] = useState("");
  const [stateError, setStateError] = useState("");
  const [token, setToken] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastChecked, setLastChecked] = useState("");
  const runningRef = useRef(false);
  runningRef.current = demo.status === "running";
  const load = useCallback(async () => {
    try {
      const data = await request<DemoStatus>("/api/demo/status");
      setDemo(data); setApiError("");
    } catch (error) { setApiError(errorMessage(error)); }
    try {
      const data = await request<State>("/api/state");
      if (data.error) { setStateError(data.error); } else { setState(data); setStateError(""); }
    } catch (error) { setStateError(errorMessage(error)); }
    setLastChecked(new Date().toLocaleTimeString());
  }, []);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      await load();
      if (!cancelled) timer = setTimeout(poll, runningRef.current ? 2500 : 10000);
    };
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [load]);
  const perform = async (kind: "run" | "reset") => {
    setBusy(true); setActionError("");
    try {
      await request(`/api/demo/${kind}`, { method: "POST", headers: { "x-rampart-token": token } });
      await load();
    } catch (error) { setActionError(errorMessage(error)); }
    finally { setBusy(false); }
  };
  const active = demo.status === "running";
  const stateUnavailable = Boolean(stateError);
  return <div className="app-shell">
    <Header />
    <main>
      <section className="hero wrap">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> SOLANA / DEVNET <span className="eyebrow-divider">·</span> POLICY ENFORCEMENT LAYER</div>
          <h1>Spending authority for autonomous agents. <em>Enforced on-chain.</em></h1>
          <p className="hero-lede">AI agents can initiate a spend. They should not have unrestricted authority over the capital they operate with. Rampart puts owner-defined policy in the instruction that moves the funds.</p>
          <div className="hero-actions"><a className="button button-primary" href="#demo">Explore the live demo <span>↗</span></a><a className="text-link" href="/docs">Read technical docs <span>→</span></a></div>
          <div className="hero-meta"><span>PROGRAM <b className="mono">{shorten(PROGRAM, 12)}</b></span><a href={`${EXPLORER}/address/${PROGRAM}?cluster=devnet`} target="_blank" rel="noreferrer">View on explorer ↗</a></div>
        </div>
        <div className="flow-panel" aria-label="Spending policy flow">
          <div className="flow-caption"><span>ENFORCEMENT PATH</span><span>01 — 03</span></div>
          <div className="flow-node"><span className="node-index">01</span><div><strong>Agent request</strong><small>Untrusted instruction</small></div><span className="node-tag">REQUEST</span></div>
          <div className="flow-connector"><span /></div>
          <div className="flow-node flow-policy"><span className="node-index">02</span><div><strong>Rampart policy</strong><small>Program evaluates constraints</small></div><span className="node-tag">ENFORCE</span></div>
          <div className="flow-branches"><span /><span /></div>
          <div className="flow-outcomes"><div className="outcome allow"><b>ALLOW</b><small>Transfer executes</small></div><div className="outcome deny"><b>REJECT</b><small>Instruction reverts</small></div></div>
          <p className="flow-footnote">The agent cannot override an on-chain refusal.</p>
        </div>
      </section>

      <section className="trust-strip"><div className="wrap trust-grid"><div><span>NETWORK</span><strong>Solana Devnet</strong></div><div><span>PROGRAM</span><strong>Immutable deployment</strong></div><div><span>UPGRADE AUTHORITY</span><strong>Renounced</strong></div><div><span>MAINNET</span><strong className="warning-text">Not deployed</strong></div></div></section>

      <section className="section wrap" id="architecture">
        <SectionTitle index="01" eyebrow="SYSTEM MODEL" title="Policy sits outside the agent." copy="The agent is an untrusted caller. Capital remains in program-controlled accounts, and the program evaluates the request before lamports move." />
        <div className="architecture-grid"><article><span className="step-index">01 / OWNER</span><h3>Configure the boundary</h3><p>The owner deposits capital, registers an agent, defines spending policy and controls the vault.</p></article><article><span className="step-index">02 / AGENT</span><h3>Request a transfer</h3><p>An authorized agent submits a destination and amount. Its key does not own the treasury.</p></article><article><span className="step-index">03 / PROGRAM</span><h3>Evaluate on-chain</h3><p>The instruction checks the destination, caps, price conditions and vault state.</p></article><article><span className="step-index">04 / RESULT</span><h3>Execute or revert</h3><p>Allowed transfers execute. A failed guard rejects the instruction atomically.</p></article></div>
      </section>

      <section className="section section-border" id="security"><div className="wrap"><SectionTitle index="02" eyebrow="SECURITY MODEL" title="What is enforced — and where." copy="Deployment scope matters. Source code is not deployed protection. The distinctions below describe the immutable devnet binary, not a future release." />
        <div className="security-layout"><div className="guard-list">
          <Guard name="Destination allowlist" detail="Outbound destinations must be explicitly permitted by the vault policy." />
          <Guard name="Per-transaction USD cap" detail="Each guarded transfer is checked against its configured transaction ceiling." />
          <Guard name="Per-epoch USD limit" detail="Spending is tracked over an epoch. The published DailyCapExceeded name does not mean a calendar day." />
          <Guard name="Pyth price-band check" detail="The live instruction compares the feed price with the vault reference snapshot." />
          <Guard name="Halted-feed rejection" detail="A feed that is not trading is refused. This is not a deployed staleness check." />
          <Guard name="Owner freeze and policy timelock" detail="The owner can freeze the vault; policy changes become effective after the configured delay." />
          <Guard name="Feed pinning and staleness window" detail="Implemented in source, but not present in the immutable deployed binary." state="source" />
          <Guard name="Meteora DBC curve guard" detail="Source and CI only. It gates and releases capital; Rampart does not execute swaps." state="source" />
        </div><aside className="security-note"><span className="eyebrow">DEPLOYMENT NOTE</span><h3>Source changes do not update this program.</h3><p>The devnet deployment is immutable. Feed pinning, staleness validation, reference refresh and the DBC path require a new program ID and deployment.</p><a className="text-link" href="/docs/not-live">Read current limitations →</a></aside></div>
      </div></section>

      <section className="section wrap" id="proof"><SectionTitle index="03" eyebrow="VERIFIABLE PROOF" title="One refusal. One claim." copy="This transaction demonstrates a guarded transfer rejected because its destination was not allowlisted. It does not independently prove every guard." />
        <div className="proof-panel"><div><span className="scope scope-deployed">DEVNET TRANSACTION</span><h3>DestinationNotAllowed</h3><p>Program error 6004 · the attempted destination was outside the vault allowlist.</p><code className="mono proof-hash">{TX}</code></div><a className="button button-secondary" href={`${EXPLORER}/tx/${TX}?cluster=devnet`} target="_blank" rel="noreferrer">Inspect transaction ↗</a></div>
      </section>

      <section className="section section-border" id="demo"><div className="wrap"><SectionTitle index="04" eyebrow="DEVNET DEMONSTRATION" title="Inspect the system state." copy="The dashboard reads from the running API. No sample balances, fabricated transaction activity or simulated success states are shown." />
        <div className="demo-toolbar"><div><span className={`status-indicator ${apiError ? "is-down" : active ? "is-running" : "is-up"}`} /> <strong>{apiError ? "Demo API unavailable" : active ? "Demo run in progress" : `Demo status: ${demo.status}`}</strong><small>{lastChecked ? `Last checked ${lastChecked}` : "Waiting for first API response"}</small></div><button className="button button-secondary" onClick={() => void load()}>Refresh state</button></div>
        {(apiError || stateError || actionError) && <div className="notice notice-error" role="alert"><strong>Attention required</strong><p>{actionError || apiError || stateError}</p></div>}
        <div className="demo-grid"><section className="data-panel"><div className="panel-heading"><span>01 / VAULT STATE</span><span className="scope scope-deployed">LIVE API</span></div>{stateUnavailable ? <p className="empty-state">Vault state unavailable. {stateError}</p> : <><DataRow label="Vault"><Address value={state.vault}/></DataRow><DataRow label="Owner"><Address value={state.owner}/></DataRow><DataRow label="Treasury balance">{state.treasuryBalance == null ? "—" : `${state.treasuryBalance.toFixed(3)} SOL`}</DataRow><DataRow label="Frozen">{state.vaultState?.frozen == null ? "—" : state.vaultState.frozen ? "Yes" : "No"}</DataRow><DataRow label="Reference price">{state.vaultState?.referencePrice ?? "—"}</DataRow><DataRow label="Epoch spend">{state.spend?.spentUsd ? `$${state.spend.spentUsd}` : "—"}</DataRow></>}</section>
        <section className="data-panel"><div className="panel-heading"><span>02 / POLICY</span><span className="scope scope-deployed">LIVE API</span></div>{stateUnavailable ? <p className="empty-state">Policy unavailable until the state API responds.</p> : <><DataRow label="Per-transaction cap">{state.policy?.perTxUsd ? `$${state.policy.perTxUsd}` : "—"}</DataRow><DataRow label="Per-epoch cap">{state.policy?.dailyUsd ? `$${state.policy.dailyUsd}` : "—"}</DataRow><DataRow label="Max slippage">{state.policy?.maxSlippageBps == null ? "—" : `${state.policy.maxSlippageBps} bps`}</DataRow><DataRow label="Allowlisted destinations">{state.policy?.allowlist?.length ?? "—"}</DataRow><DataRow label="Agent"><Address value={state.agent}/></DataRow><DataRow label="Oracle price">{state.feedPrice ? `$${state.feedPrice}` : "—"}</DataRow></>}</section></div>
        <section className="data-panel activity-panel"><div className="panel-heading"><span>03 / DEMO EXECUTION LOG</span><StatusBadge status={demo.status}/></div>{demo.error && <div className="notice notice-error" role="status">{demo.error}</div>}{demo.steps.length ? <ol className="event-list">{demo.steps.map(item => <Step key={item.seq} item={item}/>)}</ol> : <p className="empty-state">{apiError ? "Execution log unavailable while the API is unreachable." : "No demo run is currently recorded. Run access may require an operator-issued token."}</p>}
          <div className="demo-controls"><label htmlFor="run-token">Demo access token <span>(optional; required when the server is protected)</span></label><input id="run-token" type="password" autoComplete="off" spellCheck={false} value={token} onChange={event => setToken(event.target.value)} placeholder="Enter operator-issued token" /><p className="field-hint">Held in page memory only. Sent in a request header; never saved or added to a URL.</p><div className="control-actions"><button className="button button-primary" disabled={busy || active} onClick={() => void perform("run")}>{busy ? "Sending…" : active ? "Run in progress" : "Run devnet demo"}</button><button className="button button-secondary" disabled={busy || !token} onClick={() => void perform("reset")}>Reset run</button></div></div>
        </section></div></section>

      <section className="section wrap"><SectionTitle index="05" eyebrow="PROJECT STATE" title="Early-stage infrastructure. Clearly scoped." copy="Rampart is a devnet research and demonstration project. Its current deployment has known limitations and has not been externally audited." /><div className="status-grid"><div><span>DEPLOYMENT</span><strong>Solana devnet</strong></div><div><span>PROGRAM ID</span><strong className="mono">{shorten(PROGRAM, 14)}</strong></div><div><span>EXTERNAL AUDIT</span><strong className="warning-text">Not completed</strong></div><div><span>MAINNET</span><strong className="warning-text">Not deployed</strong></div></div></section>
    </main>
    <footer className="site-footer"><div className="wrap footer-inner"><a className="wordmark" href="/"><span className="mark">R</span> RAMPART</a><p>Policy enforcement for autonomous capital.</p><nav aria-label="Footer navigation"><a href="/docs">Documentation</a><a href="/whitepaper">Whitepaper</a><a href="/changelog">Changelog</a><a href="https://github.com/hqBrimax/rampart" target="_blank" rel="noreferrer">GitHub ↗</a></nav><small>Solana devnet · No mainnet deployment · No token</small></div></footer>
  </div>;
}
function StatusBadge({ status }: { status: string }) { return <span className={`run-status status-${status}`}>{status.toUpperCase()}</span>; }
