# Vinilo de corte con los horarios para el vidrio de la puerta, en vinilo
# blanco. La hoja se ajusta al texto, con margen alrededor. Genera el SVG con el texto convertido a curvas (en
# mm), que es lo que pide la imprenta. Necesita fonttools y la fuente Inter:
#   python3 carteles/horarios-puerta.py carteles/horarios-puerta.svg
# El PDF se arma con Chrome a partir del SVG, con la medida que imprime.
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

out = sys.argv[1]
fill = sys.argv[2] if len(sys.argv) > 2 else "#000"
font = TTFont("/usr/share/fonts/opentype/inter/Inter-Bold.otf")
gs, cmap, upm = font.getGlyphSet(), font.getBestCmap(), font["head"].unitsPerEm
cap = font["OS/2"].sCapHeight

# (texto, altura de mayúscula en mm, espacio arriba en mm)
lines = [("HORARIOS", 34, 0), ("LUNES A VIERNES", 17, 12),
         ("Solo con agenda: 9:00 a 12:30 hs", 22, 20),
         ("Atención normal: 15:00 a 19:00 hs", 22, 20)]
MARGIN = 30  # mm a cada lado del texto

def width(t, s): return sum(gs[cmap[ord(c)]].width for c in t) * s

total = sum(h + g for _, h, g in lines) + 5  # 5 mm para la cola de la "g"
widest = max(width(t, h / cap) for t, h, _ in lines)
W = int(-(-(widest + 2 * MARGIN) // 10) * 10)  # redondeado al centímetro
H = int(-(-(total + 2 * MARGIN) // 10) * 10)
y = (H - total) / 2
paths = []
for t, h, g in lines:
    s = h / cap
    y += g + h  # línea de base
    x = (W - width(t, s)) / 2
    for c in t:
        gl = gs[cmap[ord(c)]]
        pen = SVGPathPen(gs)
        gl.draw(TransformPen(pen, (s, 0, 0, -s, x, y)))
        if pen.getCommands():
            paths.append(pen.getCommands())
        x += gl.width * s
    print(t, round(width(t, s)), "mm de ancho", file=sys.stderr)
print("alto del texto", round(total), "mm; hoja", W, "x", H, "mm", file=sys.stderr)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">
  <path fill="{fill}" d="{' '.join(paths)}"/>
</svg>
'''
open(out, "w").write(svg)
