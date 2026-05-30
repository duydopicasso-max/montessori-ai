import json

path = "/Users/nguyenduydo/.gemini/antigravity-ide/brain/ffcaaca2-1b66-4beb-9b18-953739d13f75/.system_generated/logs/transcript.jsonl"
with open(path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        step = data.get("step_index")
        # Check if model wrote walkthrough.md in previous turns (before step 380)
        if step is not None and step < 380:
            for tc in data.get("tool_calls", []):
                if tc.get("name") == "write_to_file" and "walkthrough.md" in tc["args"].get("TargetFile", ""):
                    print(f"Step {step} wrote walkthrough.md:")
                    args = tc["args"]
                    if isinstance(args, str):
                        args = json.loads(args)
                    print(args.get("CodeContent")[:1000])
                    print("="*40)
