#!/usr/bin/env python3
"""Debug: show raw V8 coverage structure for one file."""
import json

with open('coverage/coverage-final.json') as f:
    data = json.load(f)

# Find one trischach file
for fp, info in data.items():
    if 'trischach/hex.ts' in fp:
        print(f"File: {fp}")
        print(f"Keys: {list(info.keys())}")
        for k, v in info.items():
            if isinstance(v, dict):
                print(f"  {k}: dict with {len(v)} entries, sample: {dict(list(v.items())[:3])}")
            elif isinstance(v, list):
                print(f"  {k}: list with {len(v)} entries, sample: {v[:3]}")
            else:
                print(f"  {k}: {v}")
        break
