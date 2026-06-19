#!/usr/bin/env python3
"""Extract per-function coverage for specific files."""
import json, sys

path = sys.argv[1] if len(sys.argv) > 1 else 'coverage/coverage-final.json'
targets = sys.argv[2:] if len(sys.argv) > 2 else []

with open(path) as f:
    data = json.load(f)

for fp, info in data.items():
    if not any(t in fp for t in targets):
        continue
    fn_map = info.get('fnMap', {})
    f = info.get('f', {})
    if not fn_map:
        continue
    short = fp.split('base3/')[-1]
    uncovered = []
    for k, fn in fn_map.items():
        fname = fn.get('name', '<anonymous>')
        line = fn.get('line', '?')
        count = f.get(k, 0)
        if isinstance(count, (int, float)) and count == 0:
            uncovered.append((line, fname))
    if uncovered:
        print(f"\n=== {short} ===")
        for line, fname in sorted(uncovered):
            print(f"  L{line}: {fname}")
