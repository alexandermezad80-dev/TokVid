from pathlib import Path
import re, json, xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
# Cubic outlines traced from the reference's front faces, without relief or shadows.
T='''M 216 225 L 313 225 C 329 225 338 231 338 243
C 338 255 327 261 314 261 L 279 261
C 277 261 276 263 276 266 L 277 353
C 278 368 269 376 257 376 C 244 376 236 367 236 354
L 236 275 C 236 267 230 262 222 261 L 216 261
C 201 261 194 258 193 247 C 190 234 200 225 216 225 Z'''
V='''M 305 264 L 321 264 C 327 264 331 266 333 272
L 347 307 C 349 314 351 318 354 317 L 392 247
C 398 234 402 226 415 226 L 430 226
C 440 226 443 228 438 237 L 368 355
C 362 369 352 376 342 374 C 332 373 326 366 322 355
L 298 286 C 292 273 289 264 305 264 Z'''
BUTTON='''M 289 173 C 275 169 265 179 268 194
C 269 203 273 214 279 221 C 288 223 302 223 309 221
C 315 215 309 204 303 191 C 300 181 297 175 289 173 Z'''
PLAY='''M 283 195 L 297 199 C 300 200 300 202 298 204
L 288 211 C 286 213 284 211 284 209 L 280 198
C 279 196 281 194 283 195 Z'''
S=3.15
DX=512-316*S
DY=512-274.5*S

def transform(raw,button=False,hole=False,favicon=False):
    tokens=re.findall(r'[MCLZ]|-?\d+(?:\.\d+)?',raw)
    out=[];axis=0
    for token in tokens:
        if token in 'MCLZ':out.append(token);axis=0;continue
        v=float(token)
        if favicon and button:
            center=(289 if axis%2==0 else (202 if hole else 198))
            v=center+(v-center)*(1.60 if hole else 1.50)
            v-=3.5 if axis%2==0 else 19
        v=v*S+(DX if axis%2==0 else DY)
        out.append(f'{v:.2f}');axis+=1
    return ' '.join(out)

def svg(fill,adaptive=False,favicon=False):
    style='<style>g{fill:#000}@media(prefers-color-scheme:dark){g{fill:#fff}}</style>' if adaptive else ''
    t=transform(T);v=transform(V)
    b=transform(BUTTON,button=True,favicon=favicon)+' '+transform(PLAY,button=True,hole=True,favicon=favicon)
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" role="img" aria-labelledby="title desc">
  <title id="title">Isotipo TV con botón de reproducción superior</title>
  <desc id="desc">T y V estilizadas en curvas vectoriales sólidas. El triángulo de reproducción es un hueco transparente.</desc>
  {style}
  <g fill="{fill}">
    <path id="letra-t" d="{t}"/>
    <path id="letra-v" d="{v}"/>
    <path id="boton-play" fill-rule="evenodd" d="{b}"/>
  </g>
</svg>
'''

(ROOT/'vector/isotipo-negro.svg').write_text(svg('#000000'),encoding='utf-8')
(ROOT/'vector/isotipo-blanco.svg').write_text(svg('#FFFFFF'),encoding='utf-8')
(ROOT/'favicon/favicon.svg').write_text(svg('#000000',adaptive=True,favicon=True),encoding='utf-8')
(ROOT/'favicon/favicon-negro.svg').write_text(svg('#000000',favicon=True),encoding='utf-8')
(ROOT/'favicon/favicon-blanco.svg').write_text(svg('#FFFFFF',favicon=True),encoding='utf-8')

source=ET.parse(ROOT/'source/referencia-original.svg')
ns={'s':'http://www.w3.org/2000/svg'}
groups=source.findall('.//s:g',ns)
colors=[
    ('Turquesa base','#0C959F','Fondo',True),
    ('Celeste menta · T','#66C7C6','Cara de la T',True),
    ('Plata / lavanda · V','#828297','Tono principal de la cara lavanda de la V',True),
    ('Reflejo celeste · T','#EFFCFC','Reflejos de la T',False),
    ('Sombra menta · T','#60ABAF','Sombras de la T',False),
    ('Reflejo plata · V','#CBD3D9','Reflejos de la V',False),
    ('Sombra lavanda · V','#8E7C95','Sombras internas de la V',False),
    ('Menta · botón play','#6EC6C7','Cara del botón de reproducción',False),
    ('Turquesa profundo · play','#217B84','Interior del botón de reproducción',False),
]
palette={'color_space':'sRGB','source':'source/referencia-original.svg','method':'Lectura directa de atributos fill del SVG original; no se promedian colores ni se toman de la recreación 3D. Los tonos base representan una de las superficies del original, que contiene varios reflejos y sombras.','colors':[]}
for name,color,role,primary in colors:
    matches=[i for i,g in enumerate(groups) if g.attrib.get('fill','').upper()==color]
    assert matches,color
    palette['colors'].append({'name':name,'hex':color,'rgb':[int(color[i:i+2],16) for i in (1,3,5)],'role':role,'primary':primary,'source_group_indexes':matches})
palette['note']='Un único HEX representa un tono sólido; el volumen y el acabado suave dependen de la iluminación, los reflejos y las sombras.'
(ROOT/'manual/paleta.json').write_text(json.dumps(palette,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'manual/paleta.css').write_text('''/* Colores declarados en el SVG original · sRGB */
:root {
  --tv-turquesa-base: #0C959F;
  --tv-celeste-menta: #66C7C6;
  --tv-plata-lavanda: #828297;
  --tv-reflejo-celeste: #EFFCFC;
  --tv-sombra-menta: #60ABAF;
  --tv-reflejo-plata: #CBD3D9;
  --tv-sombra-lavanda: #8E7C95;
  --tv-play-menta: #6EC6C7;
  --tv-play-profundo: #217B84;
}
''',encoding='utf-8')
rows=['# Paleta del SVG original','', '| Color | HEX | RGB |', '|---|---|---|']
for c in palette['colors']:rows.append(f"| {c['name']} | `{c['hex']}` | {', '.join(map(str,c['rgb']))} |")
rows+=['',palette['method'],'',palette['note']]
(ROOT/'manual/paleta.md').write_text('\n'.join(rows)+'\n',encoding='utf-8')
print('SVG planos y paleta exacta del original generados.')
