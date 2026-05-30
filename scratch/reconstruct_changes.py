import json

path = "/Users/nguyenduydo/.gemini/antigravity-ide/brain/ffcaaca2-1b66-4beb-9b18-953739d13f75/.system_generated/logs/transcript.jsonl"
edits = []
with open(path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        step = data.get("step_index")
        # We only care about edits made BEFORE our session started (steps < 380)
        if step is not None and step < 380:
            if data.get("source") == "MODEL" and data.get("type") == "PLANNER_RESPONSE":
                for tc in data.get("tool_calls", []):
                    name = tc.get("name")
                    args = tc.get("args", {})
                    target = args.get("TargetFile", "")
                    if "GrowthScreen.jsx" in target and name == "replace_file_content":
                        edits.append({
                            "step": step,
                            "args": args
                        })

print(f"Reconstruction plan: {len(edits)} edits found.")
for i, e in enumerate(edits):
    print(f"\n--- EDIT {i+1} (Step {e['step']}) ---")
    print(f"StartLine: {e['args'].get('StartLine')}")
    print(f"EndLine: {e['args'].get('EndLine')}")
    print(f"TargetContent:\n{e['args'].get('TargetContent')}")
    print(f"ReplacementContent:\n{e['args'].get('ReplacementContent')}")
