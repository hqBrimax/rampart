import express from "express";
import cors from "cors";
import { timingSafeEqual } from "node:crypto";
import { Keypair } from "@solana/web3.js";
import { createServer as createViteServer } from "vite";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { RampartClient } from "../src/rampart.js";
import { RampartDemo } from "../src/demo.js";
import { loadPayer, RPC_URL, PROGRAM_ID, MOCK_PROGRAM_ID } from "../src/env.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 3000);
const payer = (() => {
  try { return loadPayer(); }
  catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    console.warn("[rampart] No local sponsor wallet found; using an ephemeral, unfunded keypair for read-only development.");
    return Keypair.generate();
  }
})();

const client = new RampartClient(payer, RPC_URL);
const demo = new RampartDemo(client);

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

const redact = (value: string) => value.replace(/([?&]api-key=)[^&\s]*/gi, "$1REDACTED");

app.get("/healthz", (_req, res) => {
  res.json({
    ok: true,
    rpc: redact(client.connection.rpcEndpoint),
    program: PROGRAM_ID.toBase58(),
    mockProgram: MOCK_PROGRAM_ID.toBase58(),
    owner: payer.publicKey.toBase58(),
    uptime: Math.round(process.uptime()),
  });
});


app.get("/api/status", async (_req, res) => {
  const started = Date.now();
  const checks: { name: string; ok: boolean; level: "ok" | "warn" | "down"; detail: string }[] = [];
  let heliusOk = false;
  let programOk = false;
  try {
    const slot = await client.connection.getSlot("confirmed");
    heliusOk = true;
    checks.push({ name: "helius", ok: true, level: "ok", detail: `slot ${slot}` });
  } catch (e) {
    checks.push({ name: "helius", ok: false, level: "down", detail: redact(String(e)).slice(0, 180) });
  }
  try {
    const info = await client.connection.getAccountInfo(PROGRAM_ID);
    programOk = !!info;
    checks.push({
      name: "program",
      ok: programOk,
      level: programOk ? "ok" : "down",
      detail: programOk ? "account present on devnet" : "missing on this cluster",
    });
  } catch (e) {
    checks.push({ name: "program", ok: false, level: "down", detail: redact(String(e)).slice(0, 180) });
  }
  try {
    const bal = await client.connection.getBalance(payer.publicKey, "confirmed");
    const sol = bal / 1_000_000_000;
    const thin = sol < 0.08;
    checks.push({
      name: "sponsor",
      ok: !thin,
      level: thin ? "warn" : "ok",
      detail: `${sol.toFixed(3)} SOL`,
    });
  } catch (e) {
    checks.push({ name: "sponsor", ok: false, level: "warn", detail: redact(String(e)).slice(0, 180) });
  }
  checks.push({
    name: "demo",
    ok: demo.status !== "failed",
    level: demo.status === "failed" ? "warn" : "ok",
    detail: demo.error ? redact(`${demo.status}: ${demo.error}`).slice(0, 160) : demo.status,
  });
  const state = !heliusOk || !programOk ? "down" : checks.some((c) => c.level === "warn") ? "degraded" : "operational";
  res.status(state === "down" ? 503 : 200).json({
    ok: state === "operational",
    state,
    rpc: redact(client.connection.rpcEndpoint),
    program: PROGRAM_ID.toBase58(),
    mockProgram: MOCK_PROGRAM_ID.toBase58(),
    owner: payer.publicKey.toBase58(),
    uptime: Math.round(process.uptime()),
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    checks,
  });
});

app.get("/api/state", async (_req, res) => {
  try {
    res.json(await demo.readState());
  } catch (e) {
    const err = String(e);
    const messageOverride = err.includes("no program") ? "program not deployed on this network yet" : undefined;
    res.status(503).json({ error: messageOverride ?? redact(err) });
  }
});

// Public demo runs use the server-held sponsor wallet. Keep the execution
// surface bounded: one run at a time, a per-IP rolling limit, and a global
// daily ceiling. For durable limits across restarts, put this behind an edge
// rate limiter as well.
const runToken = process.env.RAMPART_RUN_TOKEN;
const PUBLIC_RUNS_PER_IP = Number(process.env.RAMPART_PUBLIC_RUNS_PER_IP ?? 2);
const PUBLIC_RUN_WINDOW_MS = Number(process.env.RAMPART_PUBLIC_RUN_WINDOW_MS ?? 60 * 60 * 1000);
const PUBLIC_RUNS_PER_DAY = Number(process.env.RAMPART_PUBLIC_RUNS_PER_DAY ?? 6);
const publicRunsByIp = new Map<string, number[]>();
const publicRunTimestamps: number[] = [];

const tokensMatch = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};
const resetGate = (req: express.Request, res: express.Response): boolean => {
  const given = String(req.get("x-rampart-token") ?? "");
  if (runToken && tokensMatch(given, runToken)) return true;
  res.status(401).json({ error: "reset is operator-only" });
  return false;
};

app.post("/api/demo/run", async (req, res) => {
  demo.reapStalledRun();
  if (demo.status === "running") {
    res.status(409).json({ error: "demo already running" });
    return;
  }
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  for (const [key, timestamps] of publicRunsByIp) {
    const fresh = timestamps.filter((at) => now - at < PUBLIC_RUN_WINDOW_MS);
    if (fresh.length) publicRunsByIp.set(key, fresh);
    else publicRunsByIp.delete(key);
  }
  const recentIpRuns = (publicRunsByIp.get(ip) ?? []);
  if (recentIpRuns.length >= PUBLIC_RUNS_PER_IP) {
    res.status(429).json({ error: "demo rate limit reached for this network; try again later" });
    return;
  }
  while (publicRunTimestamps.length && now - publicRunTimestamps[0] >= 24 * 60 * 60 * 1000) {
    publicRunTimestamps.shift();
  }
  if (publicRunTimestamps.length >= PUBLIC_RUNS_PER_DAY) {
    res.status(429).json({ error: "public demo capacity reached for today; try again tomorrow" });
    return;
  }
  recentIpRuns.push(now);
  publicRunsByIp.set(ip, recentIpRuns);
  publicRunTimestamps.push(now);
  demo.run().catch(() => {
    /* status captured in demo.error */
  });
  res.status(202).json({ ok: true, status: "running" });
});

// Recovers a wedged run without a server restart. A run that has produced no
// step for STALL_MS cannot still be making progress: every step awaits a devnet
// confirmation, and those are individually timeboxed now.
app.post("/api/demo/reset", (req, res) => {
  if (!resetGate(req, res)) return;
  const was = demo.status;
  demo.reset();
  res.json({ ok: true, was, status: demo.status });
});

app.get("/api/demo/status", (_req, res) => {
  demo.reapStalledRun();
  res.json({
    status: demo.status,
    error: demo.error ? redact(demo.error) : demo.error,
    steps: demo.steps.map((s) => ({ ...s, detail: redact(s.detail) })),
    summary: {
      ok: demo.steps.filter((s) => s.status === "ok").length,
      rejected: demo.steps.filter((s) => s.status === "rejected").length,
      info: demo.steps.filter((s) => s.status === "info").length,
    },
  });
});

const webDist = join(__dirname, "..", "web", "dist");

async function start() {
  if (process.env.NODE_ENV === "production") {
    if (!existsSync(webDist)) throw new Error("web build missing; run pnpm build:web");
    app.use(express.static(webDist));
    app.get(/^\/(?!api\/|healthz).*/, (_req, res) => res.sendFile(join(webDist, "index.html")));
  } else {
    const vite = await createViteServer({
      configFile: join(__dirname, "..", "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, () => {
    console.log(`Rampart ${process.env.NODE_ENV === "production" ? "production" : "development"} server on http://localhost:${PORT}`);
    console.log(`RPC ${redact(client.connection.rpcEndpoint)}`);
    console.log(`Sponsor ${payer.publicKey.toBase58()}${process.env.NODE_ENV === "production" ? "" : " (local ephemeral / unfunded)"}`);
    if (!process.env.RAMPART_RUN_TOKEN) console.log("Sponsor-wallet demo execution is disabled: RAMPART_RUN_TOKEN is not configured.");
  });
}
void start().catch((error) => { console.error("[rampart] startup failed", error); process.exitCode = 1; });