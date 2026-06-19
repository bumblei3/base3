#!/usr/bin/env python3
"""Coverage summary sorted by statement coverage ascending."""
import json

with open('coverage/coverage-final.json') as f:
    data = json.load(f)

files = []
for fp, info in data.items():
    if 'trischach' in fp or 'schach9x9' in fp or '/shared/' in fp:
        stmt_map = info.get('statementMap', {})
        s_map = info.get('s', {})
        fn_map = info.get('fnMap', {})
        f_map = info.get('f', {})
        b_map = info.get('b', {})

        total_stmts = len(stmt_map)
        covered_stmts = sum(1 for k in s_map if isinstance(s_map.get(k), (int, float)) and s_map[k] > 0)
        stmts_pct = covered_stmts / max(total_stmts, 1) * 100

        total_fns = len(fn_map)
        covered_fns = sum(1 for k in f_map if isinstance(f_map.get(k), (int, float)) and f_map[k] > 0)
        fns_pct = covered_fns / max(total_fns, 1) * 100

        total_br = 0
        covered_br = 0
        if isinstance(b_map, dict):
            for k, v in b_map.items():
                if isinstance(v, list):
                    for loc in v:
                        total_br += 1
                        if isinstance(loc, (int, float)) and loc > 0:
                            covered_br += 1
        br_pct = covered_br / max(total_br, 1) * 100

        short = fp.split('base3/')[-1]
        files.append((short, stmts_pct, br_pct, fns_pct, covered_stmts, total_stmts, covered_fns, total_fns))

files.sort(key=lambda x: x[1])
for f, s, b, fn, cs, ts, cf, ft in files:
    flag = 'WARN' if s < 80 else 'OK'
    print(f'{flag} {f:55s} Stmts={s:5.1f}% ({cs:3d}/{ts:3d}) Branch={b:5.1f}% Funcs={fn:5.1f}% ({cf}/{ft})')
