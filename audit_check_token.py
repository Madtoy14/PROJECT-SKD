import re

with open(r'C:\Users\NET\.gemini\antigravity\playground\SKD_WEB\.zcode\supabase_session_info.md') as f:
    raw = f.read()

print('len:', len(raw))

# Find expires_at
m = re.search(r'expires_at.{0,20}', raw)
if m: print(m.group())
m2 = re.search(r'refresh_token.{0,40}', raw)
if m2: print(m2.group())
m3 = re.search(r'access_token.{0,30}', raw)
if m3: print(m3.group())
