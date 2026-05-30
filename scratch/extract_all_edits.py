import json

path = "/Users/nguyenduydo/.gemini/antigravity-ide/brain/ffcaaca2-1b66-4beb-9b18-953739d13f75/.system_generated/logs/transcript.jsonl"
edits = []
with open(path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        if data.get("source") == "MODEL" and data.get("type") == "PLANNER_RESPONSE":
            for tc in data.get("tool_calls", []):
                name = tc.get("name")
                args = tc.get("args", {})
                
                # Check if it targets GrowthScreen.jsx
                target = args.get("TargetFile", "")
                if "GrowthScreen.jsx" in target:
                    edits.append({
                        "step": data.get("step_index"),
                        "tool": name,
                        "args": args
                    })

print(f"Found {len(edits)} edits to GrowthScreen.jsx:")
for e in edits:
    print(f"Step {e['step']}: {e['tool']}")
    if e['tool'] == 'replace_file_content':
        print(f"  StartLine: {e['args'].get('StartLine')}, EndLine: {e['args'].get('EndLine')}")
        print(f"  TargetContent: {e['args'].get('TargetContent')[:100]}...")
        print(f"  ReplacementContent: {e['args'].get('ReplacementContent')[:100]}...")
