import json

path = "/Users/nguyenduydo/.gemini/antigravity-ide/brain/ffcaaca2-1b66-4beb-9b18-953739d13f75/.system_generated/logs/transcript.jsonl"
with open(path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        if data.get("step_index") == 103:
            for tc in data.get("tool_calls", []):
                if tc.get("name") == "replace_file_content":
                    args = tc["args"]
                    if isinstance(args, str):
                        args = json.loads(args)
                    code = args["ReplacementContent"]
                    if isinstance(code, str):
                        if code.startswith('"') and code.endswith('"'):
                            code = code[1:-1]
                        # Replace escape sequences
                        code = code.replace("\\n", "\n").replace('\\"', '"').replace("\\\\", "\\")
                    with open("/Users/nguyenduydo/Montessori/scratch/step_103_clean.js", "w", encoding="utf-8") as out:
                        out.write(code)
                    print("Successfully wrote step_103_clean.js!")
                    break
