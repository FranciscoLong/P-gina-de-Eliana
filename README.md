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

> **Estado temporal:** la agenda en línea está desactivada. El botón general sigue
> abriendo el modal para que WhatsApp permanezca disponible, pero la opción de
> agenda tiene `disabled` real. No se debe habilitar el frontend ni producción
> hasta completar la prueba controlada de Calendar, correo, aprobación, rechazo
> con nota y concurrencia.

La agenda propia distingue franjas disponibles y no disponibles dentro de los
próximos 45 días (09:30–12:30 y 15:00–19:00, `America/Montevideo`). El navegador no
recibe detalles de eventos existentes, ni guarda datos personales: sólo conserva
el código del trámite, la fecha, el horario y un identificador de reintento en la
pestaña actual. El texto de consulta se inicia con el saludo, el nombre y la frase
del trámite, se puede editar y admite hasta 400 caracteres.

El horario elegido queda bloqueado provisionalmente hasta 24 horas. Eliana recibe
un correo para aprobarlo o rechazarlo y puede agregar una nota al rechazo. El
cliente recibe por correo la decisión; no se lo agrega como invitado de Google
Calendar ni se le pide aceptar el evento.

Además de la desactivación visible, ambas APIs tienen un kill switch autoritativo
y fail-closed. `BOOKING_ENABLED` debe existir del lado servidor y valer exactamente
`true`; ausente, `false` o cualquier otro valor responde `503` con el mismo mensaje
público, antes de contactar Turnstile o Apps Script. Al finalizar esta entrega debe
quedar en `false` o sin configurar.

Cuando se realice la prueba controlada posterior, cargá en Vercel (sin subir
secretos): `BOOKING_ENABLED`, `APPS_SCRIPT_WEB_APP_URL`,
`APPS_SCRIPT_SHARED_SECRET`, `TURNSTILE_SECRET_KEY` y
`BOOKING_ALLOWED_ORIGINS`. Configurá también la site key pública de Turnstile en
`data-turnstile-site-key` de `index.html` (no es un secreto).

Para Apps Script, creá un proyecto con `google-apps-script/Code.js` y configurá
estas *Script properties* obligatorias:

- `APPS_SCRIPT_SHARED_SECRET`
- `BOOKING_CALENDAR_ID`
- `BOOKING_RATE_LIMIT_WINDOW_SECONDS`
- `BOOKING_RATE_LIMIT_MAX`
- `BOOKING_RATE_LIMIT_HMAC_SECRET`

El rate limit se ejecuta dentro de `LockService` y guarda únicamente una huella
HMAC en los buckets; si falta una de esas tres propiedades, crear una solicitud
falla cerrado. También admite `BOOKING_LOCATION`,
`BOOKING_BLOCKING_CALENDAR_IDS`, `BOOKING_DURATION_MINUTES` (45 por defecto),
`BOOKING_APPROVER_EMAIL` (por defecto `esc.isbarbo@gmail.com`),
`BOOKING_APPROVAL_HOLD_HOURS` (24 por defecto), `BOOKING_PUBLIC_URL` y
`BOOKING_WHATSAPP_URL`.

La propiedad `BOOKING_RETENTION_DAYS` centraliza la retención (30 días por
defecto). Después de enviar el correo de decisión se eliminan inmediatamente los
datos personales del registro de aprobación; el mantenimiento elimina luego las
decisiones finales, claves de idempotencia y buckets vencidos. Nunca elimina una
solicitud pendiente o una decisión todavía recuperable.

El flujo persiste y reanuda los estados `pending`, `approving`/`rejecting`,
`confirmed`/`rejected`, `notification_pending` y `notification_sent`. Calendar
se completa antes de encolar el correo al cliente. Un fallo de MailApp conserva
`notification_pending` y la página de Eliana no afirma que el correo fue enviado.

### Mantenimiento autónomo de Apps Script

Después de copiar y revisar el código en un proyecto de prueba:

1. Abrí el editor de Apps Script y seleccioná `installBookingMaintenanceTrigger`.
2. Ejecutala manualmente una sola vez y revisá los permisos solicitados.
3. Verificá en **Activadores** que exista un trigger horario para
   `maintainBookingWorkflow`.

La función de instalación es idempotente y no se ejecuta desde el sitio ni desde
este repositorio. `maintainBookingWorkflow` vence bloqueos, reanuda decisiones o
correos pendientes y aplica la retención aunque ningún visitante consulte la
disponibilidad. Los logs de fallos contienen sólo operación, estado, decisión y
tipo técnico de error; no incluyen correos, teléfonos, consultas ni cuerpos de
mensajes.

Desplegá el Web App ejecutado por la dueña del calendario únicamente durante la
prueba controlada. Usá primero un calendario de prueba y la URL de su deployment
en Preview de Vercel. La firma HMAC, timestamp, nonce, bloqueo e idempotencia se
verifican dentro del script. Si cambiás la duración, usá el mismo valor en Vercel
y en Apps Script.

Antes de producción falta aprobar y configurar explícitamente: anticipación
mínima, buffer entre consultas, máximo diario, excepciones de duración,
cancelación/reprogramación y calendarios bloqueantes. `45` minutos sólo es el
valor inicial configurable porque es la duración anunciada actualmente.

Validación local sin dependencias ni llamadas reales a Google o correo:

```bash
node --test tests/*.test.js
node --check assets/main.js
node --check assets/service-messages.js
node --check api/availability.js
node --check api/bookings.js
node --check api/_security.js
node --check lib/apps-script-client.js
node --check lib/booking.js
node --check google-apps-script/Code.js
git diff --check
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
