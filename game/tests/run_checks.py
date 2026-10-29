from pathlib import Path
import subprocess,sys,json,time
r=Path(__file__).resolve().parents[1];summary=[]
for script,report in [('syntaxe.py','SYNTAXE.json'),('regression_0401.py','REGRESSION_0401.json'),('atelier.py','ATELIER_QA.json'),('coherence.py','COHERENCE_QA.json'),('visuel.py','VISUEL_QA.json'),('gestes.py','GESTES_QA.json'),('images.py','IMAGES_QA.json'),('montage.py','MONTAGE_QA.json'),('montage_safety.py','MONTAGE_SAFETY_QA.json'),('protocols.py','PROTOCOLS_QA.json'),('protocols_safety.py','PROTOCOLS_SAFETY_QA.json'),('orders.py','ORDERS_QA.json'),('orders_safety.py','ORDERS_SAFETY_QA.json'),('before_after_0407.py','BEFORE_AFTER_0407.json'),('spatial.py','SPATIAL_QA.json')]:
 start=time.time();p=subprocess.run([sys.executable,str(r/'tests'/script)],cwd=r,stdout=(r/'rapports'/(script+'.log')).open('w'),stderr=subprocess.STDOUT)
 info={'script':script,'exit':p.returncode,'seconds':round(time.time()-start,2)}
 if (r/'rapports'/report).exists():
  data=json.loads((r/'rapports'/report).read_text());info.update({k:data.get(k) for k in ['passed','total','errors']})
 summary.append(info);(r/'rapports/SYNTHESE.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print(info,flush=True)
 if p.returncode:print('Échec : consulter rapports/'+script+'.log',flush=True)
sys.exit(0 if all(x['exit']==0 for x in summary) else 1)
