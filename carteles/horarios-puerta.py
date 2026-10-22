# Vinilos de corte con los horarios para el vidrio de la puerta, en vinilo
# blanco. Genera los SVG con el texto convertido a curvas (en mm), que es lo
# que pide la imprenta. La hoja se ajusta al texto, con margen alrededor.
# Necesita fonttools y la fuente Inter. Desde la raíz del proyecto:
#   python3 carteles/horarios-puerta.py
# Escribe en carteles/:
#   horarios-puerta.svg                  horario de la mañana con agenda
#   horarios-puerta-reserva.svg          mañana solo con reserva, sin horario;
#                                        deja vacío el lugar del QR
#   horarios-puerta-reserva-montaje.svg  lo mismo con el QR en su lugar, para
#                                        mostrar cómo se arma
# El QR no se corta: va impreso negro sobre blanco. Los PDF se arman con
# Chrome a partir de cada SVG, con la medida que imprime.
import os
import re
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
font = TTFont("/usr/share/fonts/opentype/inter/Inter-Bold.otf")
gs, cmap = font.getGlyphSet(), font.getBestCmap()
cap = font["OS/2"].sCapHeight
MARGIN = 30  # mm a cada lado
DESC = 5     # mm para la cola de la "g"

# (texto, altura de mayúscula en mm, espacio arriba en mm)
HEAD = [("HORARIOS", 34, 0), ("LUNES A VIERNES", 17, 12)]
AGENDA = HEAD + [("Solo con agenda: 9:00 a 12:30 hs", 22, 20),
                 ("Atención normal: 15:00 a 19:00 hs", 22, 20)]
RESERVA = HEAD + [("Mañana: solo con reserva", 22, 20),
                  ("Tarde: 15:00 a 19:00 hs", 22, 20)]
QR = 100      # mm del QR impreso, con su margen blanco incluido
QR_GAP = 45   # mm entre el texto y el QR
QR_TEXT = [("Escaneá", 11, 0), ("para reservar", 11, 5)]


def width(t, h):
    return sum(gs[cmap[ord(c)]].width for c in t) * h / cap


def block_height(lines):
    return sum(h + g for _, h, g in lines) + DESC


def draw(lines, cx, top, paths):
    """Agrega a paths las líneas centradas en cx, empezando en top."""
    y = top
    for t, h, g in lines:
        s = h / cap
        y += g + h  # línea de base
        x = cx - width(t, h) / 2
        for c in t:
            gl = gs[cmap[ord(c)]]
            pen = SVGPathPen(gs)
            gl.draw(TransformPen(pen, (s, 0, 0, -s, x, y)))
            if pen.getCommands():
                paths.append(pen.getCommands())
            x += gl.width * s


def up(mm):
    return int(-(-mm // 10) * 10)  # redondeado al centímetro


def svg(W, H, paths, extra=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" '
            f'height="{H}mm" viewBox="0 0 {W} {H}">\n'
            f'  <path fill="#000" d="{" ".join(paths)}"/>\n{extra}</svg>\n')


def write(name, text):
    open(os.path.join(HERE, name), "w").write(text)


# Horario con agenda
tw = max(width(t, h) for t, h, _ in AGENDA)
th = block_height(AGENDA)
W, H = up(tw + 2 * MARGIN), up(th + 2 * MARGIN)
paths = []
draw(AGENDA, W / 2, (H - th) / 2, paths)
write("horarios-puerta.svg", svg(W, H, paths))
print("horarios-puerta:", W, "x", H, "mm", file=sys.stderr)

# Mañana solo con reserva, con el QR a la derecha y la leyenda debajo
tw = max(width(t, h) for t, h, _ in RESERVA)
th = block_height(RESERVA)
qh = QR + 4 + block_height(QR_TEXT)
W = up(tw + QR_GAP + QR + 2 * MARGIN)
H = up(max(th, qh) + 2 * MARGIN)
x0 = (W - (tw + QR_GAP + QR)) / 2
paths = []
draw(RESERVA, x0 + tw / 2, (H - th) / 2, paths)
qx, qy = x0 + tw + QR_GAP, (H - qh) / 2
draw(QR_TEXT, qx + QR / 2, qy + QR + 4, paths)
write("horarios-puerta-reserva.svg", svg(W, H, paths))

qr = open(os.path.join(HERE, "qr-reservar.svg")).read()
modules = re.search(r'<g transform="scale\(10\)">(.*)</g>', qr, re.S).group(1)
side = 41  # módulos del QR, con el margen
qr_group = (f'  <g transform="translate({qx} {qy}) scale({QR / side})">'
            f'{modules}</g>\n'
            f'  <rect x="{qx}" y="{qy}" width="{QR}" height="{QR}" fill="none" '
            f'stroke="#999" stroke-width="0.5" stroke-dasharray="3 2"/>\n')
write("horarios-puerta-reserva-montaje.svg", svg(W, H, paths, qr_group))
print("horarios-puerta-reserva:", W, "x", H, "mm; QR de", QR, "mm",
      file=sys.stderr)
