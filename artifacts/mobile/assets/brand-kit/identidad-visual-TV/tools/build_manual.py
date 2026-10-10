from pathlib import Path
import re,json,xml.etree.ElementTree as ET
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parents[1]
pdfmetrics.registerFont(TTFont('Sans','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('Bold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Serif','/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'))
W,H=A4
INK='#153037';PAPER='#F5F9F8';MINT='#66C7C6';TEAL='#0C959F';LAVENDER='#828297';MUTED='#A7C5C8'
palette=json.loads((ROOT/'manual/paleta.json').read_text())
ns={'s':'http://www.w3.org/2000/svg'}
paths=ET.parse(ROOT/'vector/isotipo-negro.svg').findall('.//s:path',ns)
c=canvas.Canvas(str(ROOT/'manual/manual-identidad-TV.pdf'),pagesize=A4)
c.setTitle('Identidad visual · TV')
c.setAuthor('Activos de marca')
c.setSubject('Logo 3D suave, isotipo TV, color y aplicaciones')

def rect(x,y,w,h,color,r=0):
    c.setFillColor(HexColor(color))
    if r:c.roundRect(x,y,w,h,r,stroke=0,fill=1)
    else:c.rect(x,y,w,h,stroke=0,fill=1)

def text(x,y,s,size=11,color=INK,font='Sans'):
    c.setFont(font,size);c.setFillColor(HexColor(color));c.drawString(x,y,s)

def center(y,s,size=11,color=INK,font='Sans'):
    c.setFont(font,size);c.setFillColor(HexColor(color));c.drawCentredString(W/2,y,s)

def wrap(x,y,s,width=495,size=10,color=INK,leading=15):
    lines=[];current=''
    for word in s.split():
        candidate=(current+' '+word).strip()
        if pdfmetrics.stringWidth(candidate,'Sans',size)>width:lines.append(current);current=word
        else:current=candidate
    lines.append(current)
    for line in lines:text(x,y,line,size,color);y-=leading
    return y

def flat(x,y,size,fill):
    c.saveState();c.translate(x,y+size);c.scale(size/1024,-size/1024)
    c.setFillColor(HexColor(fill))
    for node in paths:
        p=c.beginPath();tokens=re.findall(r'[MCLZ]|-?\d+(?:\.\d+)?',node.attrib['d']);i=0
        while i<len(tokens):
            cmd=tokens[i];i+=1;n={'M':2,'L':2,'C':6,'Z':0}[cmd]
            v=[float(t) for t in tokens[i:i+n]];i+=n
            if cmd=='M':p.moveTo(*v)
            elif cmd=='L':p.lineTo(*v)
            elif cmd=='C':p.curveTo(*v)
            else:p.close()
        c.drawPath(p,fill=1,stroke=0,fillMode=0 if node.attrib.get('fill-rule')=='evenodd' else 1)
    c.restoreState()

def header(kicker,title,dark=False):
    text(44,H-57,kicker,9,MINT if dark else TEAL,'Bold')
    text(44,H-106,title,30,PAPER if dark else INK,'Serif')

def footer(number,dark=False):
    color=MUTED if dark else '#667A7E'
    text(44,30,'TV  /  IDENTIDAD VISUAL  /  2026',8,color)
    text(W-65,30,f'{number:02d}',8,color)

# 01 — main mark and flat variants
rect(0,0,W,H,INK)
header('ACTIVOS DE MARCA  /  EDICIÓN 01','Identidad visual',True)
text(44,H-137,'TV · volumen suave y silueta clara',11,MUTED)
size=328
c.drawImage(str(ROOT/'3d/app-icon-1024.png'),(W-size)/2,325,width=size,height=size)
center(302,'01 / LOGOTIPO PRINCIPAL 3D',10,MINT,'Bold')
center(281,'Acabado suave · App icon · PNG 1024 × 1024',10,MUTED)
rect(44,80,245,166,PAPER,10);rect(301,80,250,166,'#24474F',10)
flat(109,111,112,'#000000');flat(371,111,112,'#FFFFFF')
text(60,95,'02 / ISOTIPO NEGRO',9,INK,'Bold');text(317,95,'02 / ISOTIPO BLANCO',9,PAPER,'Bold')
center(58,'Favicon · firmas · marcas de agua · documentos',9,MUTED)
footer(1,True);c.showPage()

# 02 — exact colors declared by the original SVG
rect(0,0,W,H,PAPER)
header('COLOR  /  VALORES ORIGINALES sRGB','Paleta del original')
wrap(44,H-140,'Códigos extraídos directamente de los atributos de color del SVG original. Los tonos base se acompañan de los reflejos y sombras de cada superficie.',size=9.8)
for i,color in enumerate(palette['colors'][:3]):
    y=H-270-i*110
    rect(44,y,90,80,color['hex'],8)
    text(155,y+60,color['name'],14,INK,'Bold')
    text(155,y+35,color['hex'],18)
    text(155,y+15,'RGB '+', '.join(map(str,color['rgb'])),10,'#52686D')
text(44,323,'REFLEJOS, SOMBRAS Y BOTÓN PLAY',9,TEAL,'Bold')
for i,color in enumerate(palette['colors'][3:]):
    col=i%3;row=i//3;x=44+col*172;y=269-row*96
    rect(x,y,159,30,color['hex'],5)
    text(x,y-16,color['name'],8.1,INK,'Bold')
    text(x,y-31,color['hex'],10)
    text(x,y-45,'RGB '+', '.join(map(str,color['rgb'])),7.6,'#52686D')
wrap(44,91,'El original contiene varias tonalidades por letra. Un HEX describe un color sólido; el acabado 3D requiere materiales, iluminación y sombras. El archivo paleta.json documenta los colores y su origen.',size=9,leading=13)
footer(2);c.showPage()

# 03 — proof of transparency and practical usage
rect(0,0,W,H,PAPER)
header('APLICACIÓN  /  ARCHIVOS Y USOS','Aplicaciones de marca')
wrap(44,H-141,'El 3D aislado permite aplicar la identidad en banners, redes y pantallas de carga. El PNG tiene canal alfa, incluido el hueco del botón de reproducción.',size=10)
rect(44,454,245,204,'#E6F1EF',10);rect(301,454,250,204,INK,10)
for x in (70,330):c.drawImage(str(ROOT/'3d/logo-3d-transparente-1024.png'),x,466,width=191,height=191,mask='auto')
text(44,432,'3D / FONDO CLARO',9,TEAL,'Bold');text(301,432,'3D / FONDO OSCURO',9,TEAL,'Bold')
rules=[
    ('Iconos de aplicación','App Store: PNG opaco de 1024 px. Google Play: exportación de 512 px incluida. El lienzo es cuadrado para que la plataforma aplique su máscara.'),
    ('Reproducción plana','SVG negro sobre fondos claros y SVG blanco sobre fondos oscuros. Para firmas de correo, utiliza los PNG planos por compatibilidad.'),
    ('Escala y espacio','Conserva la proporción del conjunto y el botón superior. Deja un margen libre equivalente a la mitad del ancho del tallo de la T. Se recomienda un mínimo de 32 px.'),
    ('Favicon','Incluye SVG adaptable al tema del dispositivo, ICO y PNG de 16, 32 y 48 px. El botón y su hueco tienen ajustes ópticos para la lectura a pequeña escala.'),
]
y=391
for title,body in rules:
    text(44,y,title,11,INK,'Bold');y-=20
    y=wrap(44,y,body,size=9.4,leading=14)-23
wrap(44,91,'El 3D es una recreación refinada desde la referencia. Los SVG planos contienen formas vectoriales sólidas y un hueco real de reproducción; no llevan imágenes incrustadas, texturas ni degradados.',size=8.8,leading=13)
footer(3);c.save()
print('Manual TV generado: 3 páginas.')
