import json

path = "/Users/nguyenduydo/.gemini/antigravity-ide/brain/ffcaaca2-1b66-4beb-9b18-953739d13f75/.system_generated/logs/transcript.jsonl"
with open(path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        step = data.get("step_index")
        if step in [65, 103, 111]:
            for tc in data.get("tool_calls", []):
                if tc.get("name") == "replace_file_content":
                    args = tc["args"]
                    if isinstance(args, str):
                        args = json.loads(args)
                    content = args["ReplacementContent"]
                    
                    # Repeatedly parse JSON if it is nested
                    for _ in range(5):
                        if isinstance(content, str):
                            stripped = content.strip()
                            if (stripped.startswith('"') and stripped.endswith('"')) or (stripped.startswith('{') and stripped.endswith('}')):
                                try:
                                    # USE strict=False here!
                                    content = json.loads(stripped, strict=False)
                                except Exception as e:
                                    print(f"Failed json.loads on step {step}:", e)
                                    break
                            else:
                                break
                    
                    with open(f"/Users/nguyenduydo/Montessori/scratch/step_{step}_clean.js", "w", encoding="utf-8") as out:
                        out.write(content)
                    print(f"Wrote step_{step}_clean.js successfully!")
                    break
