"""Crea copias temáticas y una mesa de revisión local; nunca publica archivos."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
from html import escape
from urllib.parse import quote
import hashlib
import json
import shutil

OUT = Path(__file__).resolve().parent
ROOT = OUT.parent
inventory = json.loads((OUT/'inventario.json').read_text(encoding='utf-8'))
notes = {p['id']:p for p in json.loads((OUT/'clasificacion.json').read_text(encoding='utf-8'))}
assert set(notes) == {p['id'] for p in inventory}
folders = {'retrato':'retrato','mi-gente':'Migente','mis-raices':'mis-raices','como-soy':'como-soy','lo-que-disfruto':'lo-que-disfruto','mi-camino':'mi-camino','lo-que-sueno':'mis-suenos','reserva':'_reserva'}
labels = {'retrato':'Retrato central','mi-gente':'Mi gente','mis-raices':'Mis raíces','como-soy':'Cómo soy','lo-que-disfruto':'Lo que disfruto','mi-camino':'Mi camino','lo-que-sueno':'Lo que sueño','reserva':'Reserva técnica'}
organized=[]
for p in inventory:
    n=notes[p['id']]
    target=ROOT/folders[n['seccion']]/(p['id']+'__'+p['archivo'])
    target.parent.mkdir(exist_ok=True)
    if not target.exists(): shutil.copy2(ROOT/p['archivo'],target)
    assert hashlib.sha256(target.read_bytes()).hexdigest()==p['sha256'], str(target)
    assert hashlib.sha256((ROOT/p['archivo']).read_bytes()).hexdigest()==p['sha256'], p['archivo']
    organized.append({'id':p['id'],'original':p['archivo'],'copia':target.relative_to(ROOT).as_posix(),'seccion':n['seccion'],'prioridad':n['prioridad'],'estado':'provisional; no publicado'})
(OUT/'organizacion.json').write_text(json.dumps(organized,ensure_ascii=False,indent=2),encoding='utf-8')

cards=[]
for p in inventory:
    n=notes[p['id']]
    cards.append(f'''<article id="{p['id']}" data-section="{n['seccion']}" data-priority="{n['prioridad']}">
    <a class="photo" href="{p['miniatura']}" target="_blank" rel="noopener"><img loading="lazy" src="{p['miniatura']}" alt="{escape(n['observacion'],quote=True)}"></a>
    <div class="body"><div class="meta"><b>{p['id']}</b><span>{escape(labels[n['seccion']])}</span><em>{n['prioridad']}</em></div>
    <h2>{escape(p['archivo'])}</h2><small>{p['ancho']} × {p['alto']} px · {p['bytes']/1048576:.1f} MB</small>
    <p>{escape(n['observacion'])}</p><p class="question"><strong>Por confirmar</strong><br>{escape(n['por_confirmar'])}</p>
    <a href="../{quote(p['archivo'])}">Abrir original ↗</a></div></article>''')
options=''.join(f'<option value="{k}">{v}</option>' for k,v in labels.items())
html='''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jonás · Mesa de selección personal</title><style>
*{box-sizing:border-box}body{margin:0;background:#0d1622;color:#e7edf1;font:16px/1.55 system-ui,sans-serif}header,main{max-width:1500px;margin:auto;padding:28px}header{padding-top:54px}h1{font:48px/1.1 Georgia,serif;margin:12px 0}header p{max-width:820px;color:#b4c5d4}.eyebrow{color:#dcbd80;letter-spacing:.18em;font-size:12px}a{color:#d9bb84;text-underline-offset:4px}nav{display:flex;gap:20px;flex-wrap:wrap;margin:24px 0}.filters{position:sticky;top:0;z-index:2;background:#152131;padding:16px 28px;display:flex;gap:18px;flex-wrap:wrap;align-items:center;border-block:1px solid #304357}select{font:inherit;background:#0d1622;color:#e7edf1;padding:9px;border:1px solid #526b80;border-radius:6px}input{width:20px;height:20px;vertical-align:middle}#count{color:#d9bb84;margin-left:auto}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:24px}article{border:1px solid #304357;border-radius:12px;overflow:hidden;background:#142030}article[hidden]{display:none}.photo{display:block;height:300px;background:#080e16}.photo img{width:100%;height:100%;object-fit:contain}.body{padding:20px}.meta{display:flex;gap:9px;align-items:center;flex-wrap:wrap;font-size:12px}.meta b{font-size:21px;color:#efcc89}.meta em{font-style:normal;border:1px solid #576c7c;border-radius:20px;padding:2px 9px}h2{font-size:13px;overflow-wrap:anywhere;color:#9db4c7;margin:10px 0 2px}small{color:#9db4c7}.question{border-top:1px solid #34495b;padding-top:12px;color:#b8c9d6}.question strong{color:#d9bb84;font-size:12px;text-transform:uppercase}a:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #92d7ff;outline-offset:4px}footer{padding:32px;text-align:center;color:#a3b6c7}@media(max-width:600px){header,main{padding:20px}h1{font-size:36px}.filters{padding:14px 20px}.photo{height:330px}}
</style><header><div class="eyebrow">ARCHIVO LOCAL · PRIMERA REVISIÓN</div><h1>Tu historia, foto a foto.</h1>
<p>50 archivos revisados · 49 únicos · clasificación provisional. Este catálogo es una mesa de trabajo para elegir y contar recuerdos. Puedes responder usando F01–F50; no necesitas cambiar los nombres de las fotos.</p>
<p>Las observaciones describen lo visible. Los parentescos, lugares y experiencias se confirman contigo. Las copias temáticas conservan la calidad del original.</p>
<nav><a href="../BASE-EDITORIAL.md">Base de la historia</a><a href="lamina-01.jpg">Lámina 1</a><a href="lamina-02.jpg">Lámina 2</a><a href="lamina-03.jpg">Lámina 3</a><a href="lamina-04.jpg">Lámina 4</a><a href="lamina-05.jpg">Lámina 5</a></nav></header>
<div class="filters"><label>Constelación <select id="section"><option value="all">Todas</option>'''+options+'''</select></label><label><input id="priority" type="checkbox"> Sólo primera selección</label><span id="count" role="status">50 fotografías</span></div>
<main class="grid">'''+''.join(cards)+'''</main><footer>Originales intactos · Ninguna foto publicada · Sin servicios externos</footer>
<script>const section=document.querySelector('#section'),priority=document.querySelector('#priority');function filter(){let count=0;document.querySelectorAll('article').forEach(card=>{card.hidden=!(section.value==='all'||section.value===card.dataset.section)||(priority.checked&&card.dataset.priority!=='prioritaria');if(!card.hidden)count++;});document.querySelector('#count').textContent=count+' fotografías';}section.addEventListener('change',filter);priority.addEventListener('change',filter);</script></html>'''
(OUT/'catalogo.html').write_text(html,encoding='utf-8')
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',19)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
title=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',28)
chosen=[p for p in inventory if notes[p['id']]['prioridad']=='prioritaria']
for start in range(0,len(chosen),9):
    batch=chosen[start:start+9]
    sheet=Image.new('RGB',(1200,1250),'#101a28')
    draw=ImageDraw.Draw(sheet)
    draw.text((25,20),f'JONÁS · Candidatas · Lámina {start//9+1}',font=title,fill='#f0dcba')
    draw.text((25,58),'Selección provisional: faltan tus historias y confirmaciones.',font=small,fill='#b5c4d6')
    for j,p in enumerate(batch):
        x,y=25+j%3*395,100+j//3*380
        with Image.open(OUT/p['miniatura']) as im:
            thumb=ImageOps.contain(im,(360,310))
            sheet.paste(thumb,(x+(360-thumb.width)//2,y+(310-thumb.height)//2))
        draw.text((x,y+320),p['id']+' · '+labels[notes[p['id']]['seccion']],font=font,fill='#f0dcba')
    sheet.save(OUT/f'primera-seleccion-{start//9+1:02}.jpg',quality=92)
print(json.dumps({'originales_verificados':len(inventory),'copias_verificadas':len(organized),'candidatas_prioritarias':len(chosen),'catalogo':str(OUT/'catalogo.html')},ensure_ascii=False))
