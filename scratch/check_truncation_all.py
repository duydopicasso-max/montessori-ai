import json

path = "/Users/nguyenduydo/.gemini/antigravity-ide/brain/ffcaaca2-1b66-4beb-9b18-953739d13f75/.system_generated/logs/transcript.jsonl"
with open(path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        step = data.get("step_index")
        if step in [65, 69, 73, 103, 111, 306, 310, 314, 320, 360]:
            for tc in data.get("tool_calls", []):
                if tc.get("name") == "replace_file_content":
                    args = tc["args"]
                    if isinstance(args, str):
                        args = json.loads(args)
                    code = args.get("ReplacementContent", "")
                    print(f"Step {step}: len={len(code)}, ends with truncated: {'truncated' in code}")
