# Vinilo de corte con los horarios para el vidrio de la puerta: 45 x 22 cm, se
# corta en vinilo blanco. Genera el SVG con el texto convertido a curvas (en
# mm), que es lo que pide la imprenta. Necesita fonttools y la fuente Inter:
#   python3 carteles/horarios-puerta.py carteles/horarios-puerta.svg
# El PDF se arma con Chrome a partir del SVG, en una hoja de 450 x 220 mm.
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

out = sys.argv[1]
fill = sys.argv[2] if len(sys.argv) > 2 else "#000"
W, H = 450, 220
font = TTFont("/usr/share/fonts/opentype/inter/Inter-Bold.otf")
gs, cmap, upm = font.getGlyphSet(), font.getBestCmap(), font["head"].unitsPerEm
cap = font["OS/2"].sCapHeight

# (texto, altura de mayúscula en mm, espacio arriba en mm)
lines = [("HORARIOS", 34, 0), ("LUNES A VIERNES", 17, 12),
         ("MAÑANA  9:00 a 12:30 hs", 22, 20), ("solo con agenda", 19, 9),
         ("TARDE  15:00 a 19:00 hs", 22, 20)]

def width(t, s): return sum(gs[cmap[ord(c)]].width for c in t) * s

total = sum(h + g for _, h, g in lines) + 5  # 5 mm para la cola de la "g"
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
print("alto del texto", round(total), "mm", file=sys.stderr)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">
  <path fill="{fill}" d="{' '.join(paths)}"/>
</svg>
'''
open(out, "w").write(svg)
