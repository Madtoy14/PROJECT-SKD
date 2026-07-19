import json, re

with open(r'C:\Users\NET\.gemini\antigravity\playground\SKD_WEB\.zcode\supabase_session_info.md', encoding='utf-8') as f:
    raw = f.read()

# Extract the JSON value between the outer quotes
# Format: '[[\"sb-...\",\"{...json...}\"]]
# The value is heavily escaped: \\\" -> ", \\\\ -> \

# Try to find the raw token json string
match = re.search(r'"access_token":"([^"]+)"', raw)
if match:
    tok = match.group(1)
    # unescape
    tok = tok.replace('\\\\', '\\').replace('\\"', '"')
    print("ACCESS_TOKEN length:", len(tok))
    print("First 50:", tok[:50])
    print("Last 50:", tok[-50:])
else:
    print("No access_token found")
    # Dump first 2000 chars to see format
    print(raw[:2000])
