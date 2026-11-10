"""Ask every student machine of an agent for its student-status, and collect the answers.

    "$FLOWPAD_PYTHON" it_class.py --agent <agent id> --out answers.json [--targets 36RK,GX8V] [--wait 600]

Runs on the teacher's desktop, signed in to the hub as the agent's owner or admin (the SDK's stored sign-in).
1. roster: agent/<id>/public_deployments -- every live code (name, last 4, state) and its machine;
2. remembers each target machine's IT state and switches IT on (agent/<id>/it_sessions);
3. one agent/<id>/it_message to the targets: student-status/SKILL.md attached, answer.shape.json as the answer shape;
4. polls the IT conversation until every target answered or --wait seconds passed;
5. switches IT back to what it was, and writes one JSON file: the roster plus one answer (or why none) per code.
Never prints or stores a secret: the answers are what each machine chose to report under the skill's rules.
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import time
from datetime import datetime, timezone
from pathlib import Path

from flow_sdk.cloud_client.client import ApiConfig, FlowpadClient

HERE = Path(__file__).resolve().parent.parent
SKILL = HERE / "student-status" / "SKILL.md"
SHAPE = HERE / "student-status" / "answer.shape.json"
TEXT = "Run the attached student-status skill (SKILL.md) on this machine, for lesson 4. Read only."
#: Seconds between looks at the IT conversation: soon at first (a machine that is up answers in ~1 min), then less.
POLLS = (5, 10, 20)


async def send(agent: str, out: Path, targets: list[str] | None, wait_s: int) -> dict:
    async with FlowpadClient(ApiConfig.from_env()) as hub:
        base = f"/graph/agent/{agent}"
        roster = await hub.get(f"{base}/public_deployments")
        boxes = {d["code_last4"]: d for d in roster.get("deployments") or []}
        codes = [c for c in roster.get("codes") or [] if c.get("state") != "revoked"]
        asked = {c["last4"] for c in codes if c["last4"] in boxes and (not targets or c["last4"] in targets)}
        it_before = {boxes[c]["node_typeid"]: boxes[c].get("it_enabled") for c in asked}
        nodes = list(it_before)
        sent_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        answers: dict[str, dict] = {}
        conversation = None
        try:
            if nodes:
                await hub.post(f"{base}/it_sessions", {"targets": nodes, "on": True})
                body = {
                    "text": TEXT,
                    "attachments": [{"name": "SKILL.md", "content_b64": base64.b64encode(SKILL.read_bytes()).decode()}],
                    "answer_shape": json.loads(SHAPE.read_text()),
                    "targets": nodes,
                }
                conversation = (await hub.post(f"{base}/it_message", body))["conversation_id"]
                deadline, n = time.time() + wait_s, 0
                while time.time() < deadline and len(answers) < len(nodes):
                    await asyncio.sleep(POLLS[min(n, len(POLLS) - 1)])
                    n += 1
                    answers = await _collect(hub, conversation)
        finally:
            off = [node for node, was in it_before.items() if not was]
            if off:
                await hub.post(f"{base}/it_sessions", {"targets": off, "on": False})
        missing = {"value": None, "reply": None}
        result = {
            "agent": agent,
            "sent_at": sent_at,
            "conversation_id": conversation,
            "students": [
                {
                    "name": c.get("name") or "",
                    "last4": c["last4"],
                    "state": c.get("state"),
                    "machine": (boxes.get(c["last4"]) or {}).get("status"),
                    "asked": c["last4"] in asked,
                    **answers.get(
                        c["last4"], {**missing, "reply_state": "no_answer" if c["last4"] in asked else "not_opened"}
                    ),
                }
                for c in codes
            ],
        }
        out.write_text(json.dumps(result, ensure_ascii=False, indent=1))
        return result


async def _collect(hub, conversation: str) -> dict[str, dict]:
    """One answer per machine, from each reply's ``metadata.it`` (the hub writes the code's last 4, the state --
    done, failed, off, signed_in, unreachable -- and the full value there). A reply with no value is no answer."""
    found: dict[str, dict] = {}
    for m in (await hub.get(f"/graph/conversation/{conversation}/messages"))[1:]:
        it = (m.get("metadata") or {}).get("it") or {}
        if it.get("code_last4"):
            found[it["code_last4"]] = {
                "value": it.get("value"),
                "reply": m.get("text") or "",
                "reply_state": it.get("state"),
                "replied_at": m.get("created_date"),
            }
    return found


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--agent", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--targets", default="", help="comma-separated last-4 codes; default every machine in use")
    ap.add_argument("--wait", type=int, default=600)
    a = ap.parse_args()
    targets = [t.strip() for t in a.targets.split(",") if t.strip()] or None
    r = asyncio.run(send(a.agent, Path(a.out), targets, a.wait))
    got = sum(1 for s in r["students"] if s.get("value") is not None)
    asked = sum(s["asked"] for s in r["students"])
    print(json.dumps({"out": a.out, "asked": asked, "answered": got, "conversation_id": r["conversation_id"]}))


if __name__ == "__main__":
    main()
