# Escribana Eliana Isbarbo Gfeller

Sitio web de la escribana **Eliana Isbarbo Gfeller**, en Rosario, departamento
de Colonia (Uruguay). Landing de una sola página con información de servicios
notariales, agenda en línea de Google Calendar, contacto por WhatsApp, ubicación y
preguntas frecuentes.

🔗 **En línea:** https://www.escribaniaisbarbo.com.uy/

---

## Tecnología

HTML, CSS y JavaScript puro. **Sin frameworks, sin dependencias y sin paso de
compilación** — se abre directamente en el navegador.

## Estructura

```
.
├── index.html                      Página completa (contenido y datos estructurados)
├── robots.txt                      Reglas de rastreo y ubicación del sitemap
├── sitemap.xml                     URL canónica enviada a buscadores
├── vercel.json                     Redirección del dominio sin www al host canónico
├── .vercelignore                   Exclusiones del despliegue público
├── assets/
│   ├── styles.css                  Todos los estilos
│   ├── main.js                     Menú móvil, modal de turnos, copiar dirección
│   ├── logo-isbarbo-gfeller.webp   Logo definitivo optimizado
│   ├── eliana-isbarbo-gfeller.webp Retrato optimizado de la escribana
│   ├── *.webp                      Fotografías optimizadas de la oficina
│   └── favicon.png                 Ícono de la pestaña y dispositivos
├── api/                            Funciones Vercel: disponibilidad y reservas
├── lib/                            Reglas compartidas y cliente firmado de Apps Script
├── google-apps-script/             Código versionado para el calendario
├── tests/                          Pruebas unitarias de mensajes y reservas
├── MEJORAS-SEO-PREVIO-PUBLICACION.md Seguimiento de mejoras SEO
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

El sitio se publica automáticamente con **Vercel** desde la rama `main`. Cada
`git push` inicia un nuevo despliegue.

El host canónico es `www.escribaniaisbarbo.com.uy`. La redirección permanente
desde el dominio sin `www` se configura en `vercel.json` y conserva la ruta y
los parámetros. Los documentos de trabajo y las pruebas quedan fuera del
despliegue mediante `.vercelignore`.

## Reservas en línea

La agenda propia distingue franjas disponibles y no disponibles dentro de los
próximos 45 días (09:30–12:30 y 15:00–19:00, `America/Montevideo`). El navegador no
recibe detalles de eventos existentes, ni guarda datos personales: sólo conserva
el código del trámite, la fecha, el horario y un identificador de reintento en la
pestaña actual. El texto de consulta se inicia con el saludo, el nombre y la frase
del trámite, se puede editar y admite hasta 400 caracteres.

El flujo queda cerrado por seguridad hasta configurar Turnstile y Apps Script;
en ese estado informa el motivo y mantiene WhatsApp como alternativa. Cargá en
Vercel (sin subir secretos): `APPS_SCRIPT_WEB_APP_URL`,
`APPS_SCRIPT_SHARED_SECRET`, `TURNSTILE_SECRET_KEY` y
`BOOKING_ALLOWED_ORIGINS`. Configurá también la site key pública de Turnstile en
`data-turnstile-site-key` de `index.html` (no es un secreto).

Para Apps Script, creá un proyecto con `google-apps-script/Code.js`, configurá
en *Script properties* `APPS_SCRIPT_SHARED_SECRET`, `BOOKING_CALENDAR_ID`,
`BOOKING_LOCATION` (opcional), `BOOKING_BLOCKING_CALENDAR_IDS` (opcional) y
`BOOKING_DURATION_MINUTES` (opcional, 45 por defecto), y
desplegalo como Web App ejecutada por la dueña del calendario. Usá primero un
calendario de prueba y la URL de su deployment en Preview de Vercel. La firma
HMAC, timestamp, nonce, bloqueo y idempotencia se verifican dentro del script.
Si cambiás la duración, usá el mismo valor en Vercel y en Apps Script.

Antes de producción falta aprobar y configurar explícitamente: anticipación
mínima, buffer entre consultas, máximo diario, excepciones de duración,
cancelación/reprogramación y calendarios bloqueantes. `45` minutos sólo es el
valor inicial configurable porque es la duración anunciada actualmente.

Validación local sin dependencias:

```bash
node --test tests/*.test.js
node --check assets/main.js && node --check api/availability.js && node --check api/bookings.js
```

## Pendientes de contenido

- [x] Conectar la agenda de turnos de Google Calendar.
- [ ] Cargar coordenadas verificadas y el Perfil de Empresa oficial en los datos
      estructurados.

## Contacto de la escribanía

- **Dirección:** Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay
- **Teléfono / WhatsApp:** +598 91 048 471
- **Correo:** esc.isbarbo@gmail.com
- **Horario:** lunes a viernes, de 9:30 a 12:30 y de 15:00 a 19:00
