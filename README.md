# Escribana Eliana Isbarbo Gfeller

Sitio web de la escribana **Eliana Isbarbo Gfeller**, en Rosario, departamento
de Colonia (Uruguay). Landing de una sola página con información de servicios
notariales, reserva de turnos conectada a Google Calendar, contacto por
WhatsApp, ubicación y preguntas frecuentes.

🔗 **En línea:** https://www.escribaniaisbarbo.com.uy/

## Tecnología

HTML, CSS y JavaScript puro. **Sin frameworks, sin dependencias y sin paso de
compilación**. La agenda usa funciones de Vercel en `api/` (Node.js, también
sin dependencias).

## Estructura

```text
.
├── index.html                       Página completa y datos estructurados
├── robots.txt                       Reglas de rastreo y ubicación del sitemap
├── sitemap.xml                      URL canónica enviada a buscadores
├── vercel.json                      Redirección al dominio canónico
├── assets/
│   ├── styles.css                   Estilos del sitio
│   ├── main.js                      Navegación, reserva, contacto y copia de dirección
│   ├── service-messages.js          Mensajes contextuales por trámite
│   └── imágenes y favicons
├── api/                             Funciones de Vercel de la agenda
│   ├── booking-config.js            Si la agenda está prendida y la clave de Turnstile
│   ├── availability.js              Horarios libres y ocupados
│   ├── bookings.js                  Confirmación del turno
│   └── _security.js                 Interruptor, origen y verificación de Turnstile
├── lib/
│   ├── booking.js                   Reglas: horario, duración, anticipación, trámites
│   ├── google-calendar.js           Cliente de Calendar con cuenta de servicio
│   ├── reservations.js              Creación del turno sin duplicados
│   └── booking-emails.js            Correos de confirmación y aviso
├── tests/                           Pruebas unitarias (Google y correo simulados)
└── README.md
```

## Ver el sitio localmente

Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Luego abrir http://localhost:8000 en el navegador.

## Convenciones visuales

**Filos de color.** El filo lateral de 4px se reserva para elementos que
aparecen repetidos en lista: las tarjetas de **Servicios** (verde) y las
**preguntas frecuentes** (rojo). Ahí funciona como pauta vertical y se lee como
sistema.

No se usa en bloques únicos, como las tarjetas de **Contacto** y **Ubicación**:
en móvil las columnas se apilan y cada tarjeta queda sola en pantalla, donde un
filo sin hermanos al lado parece un borde a medio pintar en vez de una marca de
familia. Esas tarjetas se distinguen por su título y su contenido.

La regla vive comentada en `assets/styles.css`, bajo `FILOS DE COLOR`.

## Reserva y contacto desde la página

La sección **Reserva** ofrece dos vías:

- **Reservar turno** en la agenda en línea.
- **WhatsApp** al +598 91 048 471, con el mensaje preparado según el trámite.

Al elegir un servicio, la página abre una ventana con ambas vías. Si el turno
se pide desde un trámite de Servicios, la agenda lo muestra fijo; si se entra
desde el botón general, pide el motivo con un select. El enlace de WhatsApp
funciona aunque JavaScript no esté disponible.

## Agenda en línea

El turno se **confirma al instante**. Las funciones de Vercel consultan el
calendario de Eliana con una cuenta de servicio de Google, crean el evento
privado con el trámite y los datos del cliente, y mandan dos correos con
Resend: la confirmación al cliente (con dirección y enlace de WhatsApp para
cancelar) y un aviso a Eliana. Al cliente no se lo agrega como invitado del
evento.

Reglas, centralizadas en `lib/booking.js`:

- Lunes a viernes, de 9:30 a 12:30 y de 15:00 a 19:00, en turnos de 45 minutos.
- Hasta 45 días hacia adelante.
- **Anticipación mínima de 24 horas.** Para cambiarla, cargá
  `BOOKING_MIN_NOTICE_HOURS` en Vercel (por ejemplo, `48`) y volvé a desplegar.
- Cualquier evento marcado como **Ocupado** en el calendario bloquea los
  horarios que toca. Para cerrar un día entero (feriados, licencia), alcanza con
  un evento de todo el día marcado como Ocupado.

Dos personas no pueden tomar el mismo horario: cada turno usa un id de evento
fijo por horario y Google rechaza el segundo. Si un envío se reintenta, se
reconoce y no se duplica. Si Eliana borra o mueve un turno, el horario vuelve a
quedar libre.

### Configuración en Vercel

| Variable | Contenido |
| --- | --- |
| `BOOKING_ENABLED` | `true` para prender la agenda. Cualquier otro valor la apaga. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON completo de la clave de la cuenta de servicio. |
| `BOOKING_CALENDAR_ID` | Calendario donde se crean los turnos: `esc.isbarbo@gmail.com`. |
| `BOOKING_BLOCKING_CALENDAR_IDS` | Opcional: otros calendarios que bloquean horarios, separados por coma. |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Claves de Cloudflare Turnstile. |
| `RESEND_API_KEY` | La carga la integración de Resend del Marketplace. |
| `BOOKING_EMAIL_FROM` | Remitente con dominio verificado en Resend. |
| `BOOKING_NOTIFY_EMAIL` | Opcional: a quién avisar de cada turno (por defecto, el correo de Eliana). |
| `BOOKING_ALLOWED_ORIGINS` | `https://www.escribaniaisbarbo.com.uy` |
| `BOOKING_MIN_NOTICE_HOURS` | Opcional: anticipación mínima en horas (24 por defecto). |
| `BOOKING_DURATION_MINUTES` | Opcional: duración del turno (45 por defecto). |

Cada calendario de la tabla tiene que estar compartido con el correo de la
cuenta de servicio: el de los turnos con permiso **Hacer cambios en eventos**;
los que solo bloquean, con **Ver solo disponibilidad**.

Si falta cualquiera de las obligatorias, o si `BOOKING_ENABLED` no vale `true`,
la agenda se apaga sola: las funciones responden 503 sin tocar Google y la
página oculta **Reservar turno** y deja WhatsApp. Es la forma de apagarla ante
un problema sin tocar el código.

En Preview se pueden usar las claves de prueba de Turnstile con
`TURNSTILE_TEST_MODE=true`; en Production ese modo se ignora.

## Publicación

El sitio se publica automáticamente con **Vercel** desde la rama `main`. Cada
`git push` inicia un nuevo despliegue.

El host canónico es `www.escribaniaisbarbo.com.uy`. La redirección permanente
desde el dominio sin `www` se configura en `vercel.json` y conserva la ruta y
los parámetros. Los documentos de trabajo y las pruebas quedan fuera del
despliegue mediante `.vercelignore`.

## Validación local

```bash
node --test tests/*.test.js
for f in assets/*.js api/*.js lib/*.js; do node --check "$f"; done
```

Las pruebas no llaman a Google, Turnstile ni Resend: simulan sus respuestas.

## Pendientes de contenido

- [ ] Cargar coordenadas verificadas y el Perfil de Empresa oficial en los datos
      estructurados.

## Datos de la escribanía

- **Dirección:** Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay
- **Teléfono / WhatsApp:** +598 91 048 471
- **Correo:** esc.isbarbo@gmail.com
- **Horario:** lunes a viernes, de 9:30 a 12:30 y de 15:00 a 19:00
