# Escribana Eliana Isbarbo Gfeller

Sitio web de la escribana **Eliana Isbarbo Gfeller**, en Rosario, departamento
de Colonia (Uruguay). Landing de una sola página con información de servicios
notariales, formulario de reserva de turnos (vía WhatsApp), ubicación y
preguntas frecuentes.

🔗 **En línea:** https://franciscolong.github.io/P-gina-de-Eliana/
(dominio propio en preparación: `www.escribaniaisbarbo.com.uy`)

---

## Tecnología

HTML, CSS y JavaScript puro. **Sin frameworks, sin dependencias y sin paso de
compilación** — se abre directamente en el navegador.

## Estructura

```
.
├── index.html                      Página completa (contenido y datos estructurados)
├── assets/
│   ├── styles.css                  Todos los estilos
│   ├── main.js                     Menú móvil, formulario de turnos, copiar dirección
│   ├── logo-isbarbo-gfeller.svg    Logo (placeholder — reemplazar por el real)
│   └── favicon.svg                 Ícono de la pestaña
├── CNAME                           Dominio propio para GitHub Pages
├── CONFIGURAR-DOMINIO.md           Guía para apuntar el dominio en NIC Uruguay
└── README.md
```

## Ver el sitio localmente

No necesita instalar nada. Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Luego abrir http://localhost:8000 en el navegador.

> Se recomienda servirlo así (y no abriendo el `index.html` con doble clic),
> porque algunas funciones —como el ícono de WhatsApp o el mapa— se comportan
> mejor sobre `http://` que sobre `file://`.

## Publicación

El sitio se publica automáticamente con **GitHub Pages** desde la rama `main`.
Cada `git push` actualiza la versión en línea en uno o dos minutos.

Para activar el dominio propio, ver **[CONFIGURAR-DOMINIO.md](CONFIGURAR-DOMINIO.md)**.

## Pendientes de contenido

- [ ] Reemplazar el logo placeholder por el real (`assets/logo-isbarbo-gfeller.svg`).
- [ ] Subir imagen para compartir en redes: `assets/og-isbarbo-gfeller.jpg`
      (JPG o PNG de 1200×630 px; WhatsApp y Facebook no muestran SVG).
- [ ] Reemplazar las fotos provisorias (de Unsplash) por las reales de la
      oficina y de la escribana.
- [ ] Completar el enlace real de Google Calendar en `assets/main.js`
      (constante `CALENDAR_BOOKING_URL`).
- [ ] Cargar las coordenadas del local en los datos estructurados (`geo`).

## Contacto de la escribanía

- **Dirección:** Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay
- **Teléfono / WhatsApp:** +598 91 048 471
- **Correo:** esc.isbarbo@gmail.com
- **Horario:** lunes a viernes, de 9:30 a 12:30 y de 15:00 a 19:00
