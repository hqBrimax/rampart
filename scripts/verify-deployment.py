#!/usr/bin/env python3
"""Verify the deployed Rampart binary against a pinned manifest.

Reads ProgramData from independent devnet RPCs, decodes deployment slot,
upgrade authority and ELF digest, checks agreement, then scans docs for
claims known to be false about the deployed binary.

Exits 0 only when every check passes. No dependencies beyond the stdlib.
"""

import argparse
import base64
import hashlib
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def b58encode(raw: bytes) -> str:
    n = int.from_bytes(raw, "big")
    out = ""
    while n:
        n, rem = divmod(n, 58)
        out = ALPHABET[rem] + out
    zeros = 0
    for byte in raw:
        if byte != 0:
            break
        zeros += 1
    return "1" * zeros + out


def rpc(url: str, method: str, params: list, timeout: float) -> dict:
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        result = json.loads(response.read())
    if "error" in result:
        raise RuntimeError(f"{url}: {result['error']}")
    return result


def fetch_state(url: str, pin: dict, timeout: float) -> dict:
    program = rpc(
        url, "getAccountInfo", [pin["program"], {"encoding": "base64"}], timeout
    )["result"]
    if not program or not program.get("value"):
        raise RuntimeError(f"{url}: program account not found")

    program_data_address = b58encode(
        base64.b64decode(program["value"]["data"][0])[4:36]
    )
    if program_data_address != pin["programData"]:
        raise RuntimeError(
            f"{url}: ProgramData {program_data_address} != pin {pin['programData']}"
        )

    account = rpc(
        url,
        "getAccountInfo",
        [pin["programData"], {"encoding": "base64"}],
        timeout,
    )["result"]
    if not account or not account.get("value"):
        raise RuntimeError(f"{url}: ProgramData account not found")

    raw = base64.b64decode(account["value"]["data"][0])
    offset = pin["payloadOffset"]
    if len(raw) <= offset or raw[:4] != b"\x03\x00\x00\x00":
        raise RuntimeError(f"{url}: unexpected ProgramData layout")

    option = raw[12]
    authority = b58encode(raw[13:45]) if option == 1 else None
    elf = raw[offset:]
    return {
        "rpc": url,
        "programData": program_data_address,
        "deploymentSlot": int.from_bytes(raw[4:12], "little"),
        "authorityOption": option,
        "upgradeAuthority": authority,
        "elfSha256": hashlib.sha256(elf).hexdigest(),
        "elfBytes": len(elf),
    }


def scan_docs(root: Path, pin: dict) -> list:
    findings = []
    markers = pin.get("correctionMarkers", [])
    for name in pin.get("documents", []):
        path = root / name
        if not path.exists():
            findings.append({"file": name, "claim": "<file missing>"})
            continue
        for line in path.read_text(errors="replace").splitlines():
            lowered = line.lower()
            if any(marker.lower() in lowered for marker in markers):
                continue
            for claim in pin.get("forbiddenDocClaims", []):
                if claim.lower() in lowered:
                    findings.append({"file": name, "claim": claim})
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pin", default="client/deployment-pin.json", help="path to deployment pin JSON"
    )
    parser.add_argument("--timeout", type=float, default=25.0, help="RPC timeout seconds")
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    pin_path = Path(args.pin)
    if not pin_path.is_absolute():
        pin_path = root / pin_path
    pin = json.loads(pin_path.read_text())

    checks = []
    states = []
    for url in pin["rpcEndpoints"]:
        try:
            state = fetch_state(url, pin, args.timeout)
            states.append(state)
            fields_ok = all(
                state[key] == pin[key]
                for key in (
                    "programData",
                    "deploymentSlot",
                    "upgradeAuthority",
                    "elfSha256",
                )
            )
            checks.append(
                {
                    "check": f"pin match @ {url}",
                    "ok": fields_ok,
                    "detail": state,
                }
            )
        except Exception as exc:
            checks.append(
                {"check": f"pin match @ {url}", "ok": False, "detail": str(exc)}
            )

    unique = {
        tuple(
            state[key]
            for key in ("programData", "deploymentSlot", "upgradeAuthority", "elfSha256")
        )
        for state in states
    }
    checks.append(
        {
            "check": f"RPC agreement (needs {pin['rpcMinimumAgree']})",
            "ok": len(unique) == 1 and len(states) >= pin["rpcMinimumAgree"],
            "detail": f"{len(states)} read(s), {len(unique)} distinct state(s)",
        }
    )

    doc_findings = scan_docs(root, pin)
    checks.append(
        {
            "check": "docs contain no stale deployment claims",
            "ok": not doc_findings,
            "detail": doc_findings or "clean",
        }
    )

    passed = all(check["ok"] for check in checks)
    report = {
        "result": "PASS" if passed else "FAIL",
        "program": pin["program"],
        "checks": checks,
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"Rampart deployment verification: {report['result']}")
        for check in checks:
            mark = "OK  " if check["ok"] else "FAIL"
            print(f"  [{mark}] {check['check']}")
            if not check["ok"]:
                print(f"         {check['detail']}")
        if passed:
            print(f"  ELF digest: {pin['elfSha256']}")
            print(f"  authority:  {pin['upgradeAuthority']}")
            print(f"  slot:       {pin['deploymentSlot']}")

    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
