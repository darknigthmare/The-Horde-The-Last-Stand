"""Verify every shipped file against MANIFEST_SHA256.json. No file is modified."""
from pathlib import Path
import hashlib,json,sys
R=Path(__file__).resolve().parents[1]
m=json.loads((R/'MANIFEST_SHA256.json').read_text(encoding='utf-8'));bad=[]
for x in m['files']:
 p=R/x['path'];safe=(R.resolve() in p.resolve().parents)
 if not safe or not p.is_file():bad.append({'path':x['path'],'error':'missing or unsafe'});continue
 if p.stat().st_size!=x['bytes'] or hashlib.sha256(p.read_bytes()).hexdigest()!=x['sha256']:bad.append({'path':x['path'],'error':'content mismatch'})
print(json.dumps({'version':m['version'],'checked':len(m['files']),'failed':bad},ensure_ascii=False,indent=2));sys.exit(1 if bad else 0)
