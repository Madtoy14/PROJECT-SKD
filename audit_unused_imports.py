import os, re

src = r"C:\Users\NET\.gemini\antigravity\playground\SKD_WEB\src"
results = []

for root, dirs, files in os.walk(src):
    dirs[:] = [d for d in dirs if d != 'node_modules']
    for fn in files:
        if not fn.endswith(('.ts', '.tsx')): continue
        path = os.path.join(root, fn)
        with open(path, encoding='utf-8', errors='ignore') as f:
            content = f.read()
        lines = content.split('\n')
        full = content
        for i, line in enumerate(lines, 1):
            m = re.match(r'^import\s+\{([^}]+)\}\s+from', line)
            if not m: continue
            names = [n.strip().split(' as ')[-1].strip() for n in m.group(1).split(',')]
            for name in names:
                if not name: continue
                occ = len(re.findall(r'\b' + re.escape(name) + r'\b', full))
                if occ <= 1:
                    rel = path.replace(src, '').lstrip('/\\')
                    results.append(f"{rel}:{i}: '{name}'")

for r in results[:50]:
    print(r)
print(f"\nTOTAL UNUSED IDENTIFIERS: {len(results)}")
