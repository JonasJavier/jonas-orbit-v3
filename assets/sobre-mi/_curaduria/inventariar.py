"""Inventario local: no modifica originales ni extrae ubicaciones EXIF."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / '_curaduria'
(OUT / 'miniaturas').mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 19)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 13)
title = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 30)
photos = []
previous = json.loads((OUT/'inventario.json').read_text(encoding='utf-8')) if (OUT/'inventario.json').exists() else []
known = {p['archivo']: p['id'] for p in previous}
next_id = max((int(p['id'][1:]) for p in previous), default=0)
for path in sorted((p for p in ROOT.iterdir() if p.suffix.lower() in {'.jpg', '.jpeg', '.png'}), key=lambda p:p.name.lower()):
    with Image.open(path) as raw:
        im = ImageOps.exif_transpose(raw).convert('RGB')
        width, height = im.size
        im.thumbnail((1000, 1000))
        ident = known.get(path.name)
        if ident is None:
            next_id += 1
            ident = f'F{next_id:02}'
        im.save(OUT / 'miniaturas' / f'{ident}.jpg', quality=88)
        photos.append(dict(id=ident, archivo=path.name, ancho=width, alto=height, bytes=path.stat().st_size, sha256=hashlib.sha256(path.read_bytes()).hexdigest(), miniatura=f'miniaturas/{ident}.jpg'))

photos.sort(key=lambda p:p['id'])
for start in range(0, len(photos), 12):
    batch = photos[start:start+12]
    sheet = Image.new('RGB', (1440, 1300), '#111a25')
    draw = ImageDraw.Draw(sheet)
    draw.text((24, 20), f'JONÁS · Inventario privado · {start+1:02}–{start+len(batch):02}', font=title, fill='#f0e5ce')
    for j, item in enumerate(batch):
        x, y = 20+(j%4)*355, 85+(j//4)*400
        with Image.open(OUT/item['miniatura']) as im:
            thumb = ImageOps.contain(im, (335, 330))
            sheet.paste(thumb, (x+(335-thumb.width)//2, y+(330-thumb.height)//2))
        draw.text((x, y+337), f"{item['id']} · {item['ancho']}×{item['alto']}",font=font,fill='#f0e5ce')
        name=item['archivo']
        draw.text((x, y+366), name if len(name)<43 else name[:40]+'…',font=small,fill='#b6c7d5')
    sheet.save(OUT/f'lamina-{start//12+1:02}.jpg',quality=93)
(OUT/'inventario.json').write_text(json.dumps(photos,ensure_ascii=False,indent=2),encoding='utf-8')
groups={}
for p in photos: groups.setdefault(p['sha256'],[]).append(p['id'])
print(json.dumps({'fotos':len(photos),'duplicados_exactos':[g for g in groups.values() if len(g)>1],'laminas':(len(photos)+11)//12},ensure_ascii=False))
