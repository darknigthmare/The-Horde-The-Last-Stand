"""QA runtime 0.43.0: progressive disclosure and compact combat HUD in the real game DOM.
Raster data URIs are replaced by a 1x1 image only to keep headless QA fast; game code is unchanged.
"""
from pathlib import Path
import re,json,sys
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
s=(R/'JOUER_DERNIERE_LIGNE.html').read_text(encoding='utf8')
tiny='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
light=re.sub(r'data:image/[\w.+-]+;base64,[A-Za-z0-9+/=]+',tiny,s)
checks=[];errors=[]
def check(name,ok,detail=None):
    checks.append({'test':name,'ok':bool(ok),'detail':detail});print(('OK ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    p=b.new_page(viewport={'width':1440,'height':900});p.set_default_timeout(5000)
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.goto('about:blank?test=1');p.set_content(light,wait_until='domcontentloaded',timeout=20000);p.wait_for_timeout(500)
    check('Couche 0.43 active',p.evaluate('!!window.DL43UI'))
    check('Titre runtime 0.43',p.title()=='Dernière Ligne — Clarté de terrain 0.43.0')
    check('HUD combat absent du menu',p.evaluate("getComputedStyle(combatBar).display==='none'"))
    p.evaluate("__DL.startNew('campaign');__DL.stopLoop()");p.wait_for_timeout(180)
    check('HUD combat absent du camp',p.evaluate("getComputedStyle(combatBar).display==='none'"))
    check('Détails fermés par défaut',not p.evaluate("shell.classList.contains('dl43-details-open')"))
    check('Contenu profond masqué par défaut',p.evaluate("[...document.querySelectorAll('#shopBody .dl43-deep')].every(e=>getComputedStyle(e).display==='none')"))
    check('Intel fermé par défaut',p.evaluate("getComputedStyle(intelPanel).visibility==='hidden'&&intelPanel.getAttribute('aria-hidden')==='true'"))
    group_counts={}
    for group in ['mission','equipment','team','archives']:
        p.click(f'[data-campgroup="{group}"]');p.wait_for_timeout(35)
        n=p.evaluate("[...document.querySelectorAll('#campScreen .tabs button')].filter(e=>getComputedStyle(e).display!=='none').length")
        group_counts[group]=n
        check('Sous-menu '+group+' limité',n<=7,n)
    check('Quatre familles principales seulement',p.locator('[data-campgroup]').count()==4)
    p.evaluate("__DL.setTab('operation')");p.wait_for_timeout(60)
    p.click('#dl43DetailsBtn');p.wait_for_timeout(25)
    check('Bouton détails ouvre la profondeur',p.evaluate("shell.classList.contains('dl43-details-open')&&dl43DetailsBtn.getAttribute('aria-pressed')==='true'"))
    check('Contenu profond réapparaît à la demande',p.evaluate("[...document.querySelectorAll('#shopBody .dl43-deep')].some(e=>getComputedStyle(e).display!=='none')"))
    p.click('#dl43DetailsBtn');p.click('#dl43IntelBtn');p.wait_for_timeout(30)
    intel=p.evaluate("""()=>({vis:getComputedStyle(intelPanel).visibility,op:getComputedStyle(intelPanel).opacity,x:intelPanel.getBoundingClientRect().x,w:intelPanel.getBoundingClientRect().width,vw:innerWidth,aria:intelPanel.getAttribute('aria-hidden')})""")
    check('Tiroir renseignements réellement visible',intel['vis']=='visible' and float(intel['op'])>0.99,intel)
    check('Tiroir renseignements reste dans le viewport',intel['x']>=0 and intel['x']+intel['w']<=intel['vw']+1,intel)
    check('ARIA renseignements synchronisé',intel['aria']=='false')
    p.keyboard.press('Escape');p.wait_for_timeout(30)
    check('Échap ferme le tiroir',p.evaluate("getComputedStyle(intelPanel).visibility==='hidden'"))
    p.evaluate('__DL.showSettings()');p.wait_for_timeout(120)
    folds=p.evaluate("[...document.querySelectorAll('.dl43-settings-fold')].map(d=>({name:d.querySelector('summary')?.innerText||'',open:d.open}))")
    check('Réglages en six catégories lisibles',len(folds)==6,folds)
    check('Une seule catégorie de réglages ouverte',sum(1 for x in folds if x['open'])==1,folds)
    check('Aucun ancien réglage lâche',p.evaluate("[...dialogBody.children].filter(e=>e.matches('.setting-row,.section-label')||e.tagName==='P').length===0"))
    p.evaluate("__DL.startNew('campaign');__DL.stopLoop();__DL.start();__DL.stopLoop();__DL.refresh()");p.wait_for_timeout(250)
    check('Combat réel démarré',p.evaluate("__DL.snapshot().phase==='combat'&&shell.dataset.phase==='combat'"))
    check('Deux groupes action seulement',p.locator('.dl43-action-group').count()==2)
    check('Marque et crédits retirés du combat',p.evaluate("getComputedStyle(document.querySelector('#hud .brand')).display==='none'&&getComputedStyle(document.querySelector('.hudstat.cash')).display==='none'"))
    check('Objectif secondaire vide retiré',p.evaluate("getComputedStyle(secondaryStatus).display==='none'"))
    check('États absents retirés',p.evaluate("[...tacticalStatus.children].filter(e=>/ABSENTE|0 U/.test(e.textContent)).every(e=>getComputedStyle(e).display==='none')"))
    check('Pression calme retirée',p.evaluate("getComputedStyle(v22PressurePanel).display==='none'"))
    check('Actions tactiques indisponibles retirées',p.evaluate("[...tacticalActions.querySelectorAll('button:disabled')].every(e=>getComputedStyle(e).display==='none')"))
    check('Actions tactiques disponibles conservées',p.evaluate("[...tacticalActions.querySelectorAll('button:not(:disabled)')].some(e=>getComputedStyle(e).display!=='none')"))
    check('Build d’arme retiré du HUD',p.evaluate("!document.getElementById('v36-combat-build')||getComputedStyle(document.getElementById('v36-combat-build')).display==='none'"))
    check('Statut arme normal silencieux',p.evaluate("getComputedStyle(weaponStatus).display==='none'"))
    check('Combat bar visible',p.evaluate("getComputedStyle(combatBar).display==='flex'"))
    # Presentation must become informative again when pressure is actually non-zero.
    p.evaluate("v22PressurePanel.dataset.tier='1';v22MomentumText.textContent='ADRÉNALINE 25 %';DL43UI.decorate()")
    check('Pression utile réapparaît',p.evaluate("getComputedStyle(v22PressurePanel).display!=='none'"))
    # Compact layout should not create page-level horizontal scrolling.
    check('Pas de débordement horizontal desktop',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    p.set_viewport_size({'width':900,'height':600});p.wait_for_timeout(80)
    check('Pas de débordement horizontal compact',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    b.close()
check('Aucune erreur JavaScript runtime',not errors,errors)
out={'version':'0.43.0','passed':sum(x['ok'] for x in checks),'total':len(checks),'failed':[x for x in checks if not x['ok']],'errors':errors,'group_visible_counts':group_counts}
(R/'rapports/UI_0_43_0_RUNTIME.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'passed':out['passed'],'total':out['total'],'failed':len(out['failed']),'errors':len(errors)},ensure_ascii=False))
sys.exit(0 if out['passed']==out['total'] and not errors else 1)
