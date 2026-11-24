# Rampart adversarial guard matrix — final results

**Program:** `6Ea4SqpMwVE57cghBU4LqhZBSs573cQ8o8FXDitKUHEr`
**Runner:** `client/redteam.ts` — devnet only, fresh owner and agent keypairs each run, raw transactions with `skipPreflight` so refusals land on-chain.
**Verification:** all 10 signatures independently confirmed finalized on `api.devnet.solana.com` and `devnet.rpcpool.com`, with matching error codes.

---

## Results

| Guard | Expected | Observed | Finalized on both RPCs |
|---|---|---|---|
| baseline success | success | code 0 | yes |
| destination not allowlisted | 6004 | 6004 | yes |
| amount zero | 6006 | 6006 | yes |
| per-tx cap exceeded | 6007 | 6007 | yes |
| frozen vault | 6001 | 6001 | yes |
| early `applyPolicy` | 6016 | 6016 | yes |
| destination = treasury | 6005 | 6005 | yes |
| epoch cap first transfer | success | code 0 | yes |
| epoch cap exceeded | 6008 | 6008 | yes |
| agent inactive | 6003 | 6003 | yes |

Every deployed guard in the pin manifest's `deployedCapabilities` has now been exercised with an independent keypair and verified on-chain.

---

## Not tested

- **Price path / 6013** — excluded by design. The deployed Pyth decoder reads the wrong fields, so a result there would not establish whether the guard works. Source-only fix required.
- **Feed identity / 6026 and staleness / 6027** — not in the deployed binary.
- **`refresh_reference` and `guarded_dbc_transfer`** — source-only.

---

## Notes from the work

- The current source IDL cannot decode the deployed account layout (`Invalid account discriminator`) — another source-versus-deployed split.
- Anchor `.rpc()` throws before returning a signature on refusal; local signing plus raw send is needed to capture it.
- `getSignatureStatuses` can return `null` for a transaction that `getTransaction` finds; batch verification avoids transient misses.
- The epoch-cap case initially failed because the cap was set in USD micro, not lamports. Decoding the on-chain spend tracker showed the guard behaving correctly; the test parameter was corrected.

---

## Reproduce

```bash
cd client
RAMPART_RPC=https://api.devnet.solana.com ./node_modules/.bin/tsx redteam.ts
python3 ../scripts/verify-deployment.py
```
