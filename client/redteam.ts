/**
 * Rampart adversarial guard-matrix runner — devnet only.
 * Fresh owner each run; refusals use skipPreflight via .rpc().
 */
import { Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmRawTransaction } from "@solana/web3.js";
import BN from "bn.js";
import bs58 from "bs58";
import { readFileSync, writeFileSync } from "node:fs";
import { RampartClient } from "./src/rampart.js";
import { RPC_URL, PROGRAM_ID } from "./src/env.js";
import { agentPda, policyPda, spendPda, treasuryPubkey, vaultPda } from "./src/rampart.js";

const RPC = process.env.RAMPART_RPC || "https://api.devnet.solana.com";
const funder = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync("/tmp/redteam-owner.json", "utf8"))));
const owner = Keypair.generate();
const fp = new RampartClient(funder, RPC);
const seedTx = new Transaction().add(SystemProgram.transfer({ fromPubkey: funder.publicKey, toPubkey: owner.publicKey, lamports: 40_000_000 }));
await fp.provider.sendAndConfirm(seedTx, [funder]);
const client = new RampartClient(owner, RPC);
const conn = client.connection;
const program = (client as any).program;
const out: any = { owner: owner.publicKey.toBase58(), program: PROGRAM_ID.toBase58(), cases: [] };
const record = (name: string, ok: boolean, detail: string) => {
  out.cases.push({ name, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}: ${detail}`);
  writeFileSync("/tmp/redteam-results.json", JSON.stringify(out, null, 2));
};
async function attempt(name: string, expected: number, run: () => Promise<string>) {
  let sig = "";
  try { sig = await run(); } catch (e: any) { sig = e?.signature || ""; }
  if (!sig) { record(name, false, "no signature"); return; }
  await new Promise((r) => setTimeout(r, 2000));
  const st = await conn.getSignatureStatuses([sig], { searchTransactionHistory: true });
  const err = st.value[0]?.err as any;
  const code = err?.InstructionError ? Number(err.InstructionError[1]?.Custom) : 0;
  record(name, code === expected, `code ${code} sig ${sig}`);
}

const feed = await client.createFeed(20_000_000_000, -8, 1);
const vault = vaultPda(owner.publicKey);
await program.methods.initVault(new BN(500_000_000), new BN(100_000_000)).accounts({
  owner: owner.publicKey, vault, policy: policyPda(vault), spendTracker: spendPda(vault),
  priceFeed: feed.publicKey, systemProgram: SystemProgram.programId,
}).rpc();
out.vault = vault.toBase58();
const [, tb] = await PublicKey.findProgramAddress([Buffer.from("rampart_treasury"), vault.toBuffer()], PROGRAM_ID);
const treasury = treasuryPubkey(vault, tb);
await client.deposit(vault, 12_000_000);
const agent = Keypair.generate();
const fundTx = new Transaction().add(SystemProgram.transfer({ fromPubkey: owner.publicKey, toPubkey: agent.publicKey, lamports: 10_000_000 }));
await client.provider.sendAndConfirm(fundTx, [owner]);
await client.registerAgent(vault, agent);
const A = Keypair.generate().publicKey;

async function proposeApply(capMicro: number) {
  const sig = await client.proposePolicy(vault, { dailyUsdCapMicro: 500_000_000, perTxUsdCapMicro: capMicro, maxSlippageBps: 100, epochLenSlots: 100, allowlist: [A] });
  await new Promise((r) => setTimeout(r, 35_000));
  await client.applyPolicy(vault);
}
await proposeApply(100_000_000);

const amount = 2_000_000;
const transfer = (dest: PublicKey, amt: number) => program.methods.guardedTransfer(new BN(amt)).accounts({
  agent: agent.publicKey, agentAccount: agentPda(vault, agent.publicKey), vault,
  policy: policyPda(vault), spendTracker: spendPda(vault), destination: dest,
  priceFeed: feed.publicKey, treasury, systemProgram: SystemProgram.programId,
}).signers([agent]).rpc({ skipPreflight: true });

await attempt("baseline success", 0, () => transfer(A, amount));
async function attemptRaw(name: string, expected: number, build: () => Promise<Transaction>, signers: Keypair[] = [agent]) {
  const tx = await build();
  tx.recentBlockhash = (await conn.getLatestBlockhash("confirmed")).blockhash;
  tx.feePayer = owner.publicKey;
  tx.sign(...signers, owner);
  const sig = bs58.encode(tx.signature!);
  let sent = true;
  try { await sendAndConfirmRawTransaction(conn, tx.serialize(), { skipPreflight: true, commitment: "confirmed" }); }
  catch (e: any) { sent = false; console.log(`  send error: ${String(e).slice(0, 160)}`); }
  await new Promise((r) => setTimeout(r, 4000));
  const st = await conn.getSignatureStatuses([sig], { searchTransactionHistory: true });
  const value = st.value[0];
  const err = value?.err as any;
  const code = value ? (err?.InstructionError ? Number(err.InstructionError[1]?.Custom) : 0) : -1;
  record(name, code === expected, `code ${code} sig ${sig}${sent ? "" : " (send failed)"}`);
}
const transferTx = (dest: PublicKey, amt: number) => program.methods.guardedTransfer(new BN(amt)).accounts({
  agent: agent.publicKey, agentAccount: agentPda(vault, agent.publicKey), vault,
  policy: policyPda(vault), spendTracker: spendPda(vault), destination: dest,
  priceFeed: feed.publicKey, treasury, systemProgram: SystemProgram.programId,
}).signers([agent]).transaction();

await attemptRaw("destination refused", 6004, () => transferTx(Keypair.generate().publicKey, amount));
await attemptRaw("amount zero", 6006, () => transferTx(A, 0));
await proposeApply(1);
await attemptRaw("per-tx cap", 6007, () => transferTx(A, amount));
await client.freeze(vault);
await attemptRaw("frozen vault", 6001, () => transferTx(A, amount));
await client.unfreeze(vault);

// early apply: propose, try apply before pendingEffectiveSlot
const earlySig = await client.proposePolicy(vault, { dailyUsdCapMicro: 500_000_000, perTxUsdCapMicro: 100_000_000, maxSlippageBps: 100, epochLenSlots: 100, allowlist: [A] });
const applyTx = await program.methods.applyPolicy().accounts({
  owner: owner.publicKey, vault, policy: policyPda(vault),
}).transaction();
await attemptRaw("early apply", 6016, async () => applyTx, []);
// let the proposal become effective and clear it, so later cases use a stable policy
await new Promise((r) => setTimeout(r, 35_000));
await client.applyPolicy(vault);

// treasury destination
await attemptRaw("treasury destination", 6005, () => transferTx(treasury, amount));

// epoch cap: tiny daily cap, one tx succeeds, second in same epoch refused
await client.proposePolicy(vault, { dailyUsdCapMicro: 600_000, perTxUsdCapMicro: 100_000_000, maxSlippageBps: 100, epochLenSlots: 100_000, allowlist: [A] });
await new Promise((r) => setTimeout(r, 35_000));
await client.applyPolicy(vault);
await attempt("epoch cap first transfer", 0, () => transfer(A, 2_000_000));
await attemptRaw("epoch cap exceeded", 6008, () => transferTx(A, 2_000_000));

// agent inactive: unregister then transfer
await client.unregisterAgent(vault, agent.publicKey);
await attemptRaw("agent inactive", 6003, () => transferTx(A, amount));

writeFileSync("/tmp/redteam-results.json", JSON.stringify(out, null, 2));
console.log("written /tmp/redteam-results.json");
