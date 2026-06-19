#!/usr/bin/env python3
"""Extract coverage for ALL source files from V8 coverage-final.json."""
import json, sys

path = sys.argv[1] if len(sys.argv) > 1 else 'coverage/coverage-final.json'
with open(path) as f:
    data = json.load(f)

files = []
for fp, info in data.items():
    if 'trischach' in fp or 'schach9x9' in fp or '/shared/' in fp:
        stmt_map = info.get('statementMap', {})
        s = info.get('s', {})
        total_stmts = len(stmt_map)
        covered_stmts = sum(1 for k in s if isinstance(s[k], (int, float)) and s[k] > 0)
        stmts_pct = covered_stmts / max(total_stmts, 1) * 100

        fn_map = info.get('fnMap', {})
        f = info.get('f', {})
        total_fns = len(fn_map)
        covered_fns = sum(1 for k in f if isinstance(f[k], (int, float)) and f[k] > 0)
        fns_pct = covered_fns / max(total_fns, 1) * 100

        b = info.get('b', {})
        total_branches = 0
        covered_branches = 0
        if isinstance(b, dict):
            for k, v in b.items():
                if isinstance(v, list):
                    for loc in v:
                        total_branches += 1
                        if isinstance(loc, (int, float)) and loc > 0:
                            covered_branches += 1
        br_pct = covered_branches / max(total_branches, 1) * 100

        short = fp.split('base3/')[-1]
        files.append((short, stmts_pct, br_pct, fns_pct, covered_stmts, total_stmts))

files.sort(key=lambda x: x[1])
below = 0
for f, s, b, fn, cs, ts in files:
    flag = 'WARN' if s < 80 else 'OK'
    if s < 80:
        below += 1
    print(f'{flag} {f:55s} Stmts={s:5.1f}% ({cs}/{ts}) Branch={b:5.1f}% Funcs={fn:5.1f}%')

print(f'\n{below} files below 80% statements threshold')
