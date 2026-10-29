"""Analyse tous les scripts HTML réellement livrés par Node, sans exécuter du code dynamique."""
from pathlib import Path
import tempfile,subprocess,re,json,hashlib,sys
R=Path(__file__).resolve().parents[1];file=R/'JOUER_DERNIERE_LIGNE.html';text=file.read_text();rows=[]
with tempfile.TemporaryDirectory(prefix='dl404_syntax_') as temp:
 for i,source in enumerate(re.findall(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',text,re.I)):
  if not source.strip():continue
  p=Path(temp)/f'inline-{i}.js';p.write_text(source);cp=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
  rows.append({'script':i,'ok':cp.returncode==0,'stderr':cp.stderr})
r={'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'passed':sum(x['ok'] for x in rows),'total':len(rows),'scripts':rows};(R/'rapports/SYNTAXE.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));print(json.dumps({k:r[k] for k in ['passed','total']}));sys.exit(0 if all(x['ok'] for x in rows) else 1)
