"""Turn the official UK food table (CoFID 2021, Open Government Licence v3.0) into a small search file.

Download: https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid
Run:      python3 scripts/build-cofid.py path/to/CoFID.xlsx public/cofid.json
Each row: [name, kcal, protein, carbs, fat, fibre, sugar] per 100g (per 100ml for drinks).
"""
import json, sys
import openpyxl

src, out = sys.argv[1], sys.argv[2]
ws = openpyxl.load_workbook(src, read_only=True)['1.3 Proximates']
rows = list(ws.iter_rows(values_only=True))
codes = rows[1]
col = {c: i for i, c in enumerate(codes) if c}

def num(v):
    if v in (None, '', 'N'): return None
    if v == 'Tr': return 0.0
    try: return float(str(v).strip())
    except ValueError: return None

def r1(x): return 0 if x is None else (round(x) if x >= 10 else round(x, 1))

foods, seen = [], set()
for r in rows[3:]:
    name = (r[1] or '').strip()
    kcal = num(r[col['KCALS']])
    if not name or kcal is None or name.lower() in seen: continue
    seen.add(name.lower())
    fibre = num(r[col['AOACFIB']])
    if fibre is None: fibre = num(r[col['ENGFIB']])
    foods.append([name, round(kcal), r1(num(r[col['PROT']])), r1(num(r[col['CHO']])), r1(num(r[col['FAT']])), r1(fibre), r1(num(r[col['TOTSUG']]))])

json.dump({'source': 'McCance and Widdowson’s CoFID 2021, Public Health England, Open Government Licence v3.0', 'foods': foods},
          open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(foods), 'foods')
