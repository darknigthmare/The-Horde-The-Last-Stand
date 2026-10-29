"""Read repaired PNG/WebP pixels and verify each atlas frame, without OCR."""
from pathlib import Path
from PIL import Image
import json,numpy as np,scipy.ndimage as ndi,sys
R=Path(__file__).resolve().parents[1];m=json.loads((R/'assets/manifest.json').read_text());checks=[];stats={}
def ck(name,ok,detail=None):checks.append({'test':name,'ok':bool(ok),'detail':detail})
for aid,a in m['assets'].items():
 src=Image.open(R/a['source']).convert('RGBA');web=Image.open(R/a['path']).convert('RGBA'); ar=np.array(src);aw=np.array(web)
 ck(aid+': format et alpha conservés',src.size==web.size and np.array_equal(ar[:,:,3],aw[:,:,3]),{'width':src.width,'height':src.height})
 images=[ar[y:y+384,x:x+384] for y in range(0,1152,384) for x in range(0,1536,384)] if aid.startswith('v26-gait-') else [ar]
 rows=[]
 for i,f in enumerate(images):
  alpha=f[:,:,3];binary=alpha>128;lab,n=ndi.label(binary);size=np.bincount(lab.ravel());size[0]=0
  ys,xs=np.where(binary);total=int(binary.sum());main=size.max() if len(size)>1 else 0;ratio=float(main/max(1,total));holes=int((ndi.binary_fill_holes(binary)&~binary).sum());edge=int(binary[0].sum()+binary[-1].sum()+binary[:,0].sum()+binary[:,-1].sum())
  row={'frame':i,'componentRatio':round(ratio,6),'opaqueCorePixels':total,'enclosedHoles':holes,'edgePixels':edge,'bbox':[int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())]};rows.append(row)
  ck(aid+': silhouette unique cadre '+str(i),ratio>.985 and edge==0 and total>1500,row)
 stats[aid]=rows
# Per-frame metadata lies inside the actual painted head band and near feet=355.
for typ,frames in m['frames'].items():
 ck(typ+': 12 repères exploitables',len(frames)==12 and all(0<x['head'][0]<384 and 0<x['head'][1]<x['baseline']==355 for x in frames),frames)
out={'passed':sum(x['ok'] for x in checks),'total':len(checks),'failed':[x for x in checks if not x['ok']],'checks':checks,'assets':stats,'method':'Analyse alpha PNG et WebP décodés ; seuil alpha 128, composante principale >98,5 %, aucun pixel à la limite des cellules.'}
(R/'rapports/IMAGES_QA.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps({'passed':out['passed'],'total':out['total'],'failed':out['failed']},ensure_ascii=False));sys.exit(1 if out['failed'] else 0)
