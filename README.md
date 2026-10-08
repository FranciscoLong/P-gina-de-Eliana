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
│   ├── anular-turno.js              Página para anular un turno desde el correo
│   ├── _security.js                 Interruptor, origen y verificación de Turnstile
│   └── _lib/                        Código compartido; el guion bajo evita que se publique
│       ├── booking.js               Reglas: horario, duración, anticipación, trámites
│       ├── google-calendar.js       Cliente de Calendar con cuenta de servicio
│       ├── reservations.js          Creación y anulación del turno sin duplicados
│       ├── booking-emails.js        Correos de confirmación y aviso
│       └── client-calendar.js       Enlace de Google Calendar y archivo .ics
├── tests/                           Pruebas unitarias (Google y correo simulados)
├── carteles/                        QR de /reservar y aviso A4 para imprimir (no se publica)
├── CLAUDE.md                        Instrucciones para agentes (reseñas, reglas)
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
con el trámite y los datos del cliente, y mandan dos correos con
Resend: la confirmación al cliente (con dirección y enlace de WhatsApp para
cancelar) y un aviso a Eliana. Al cliente no se lo agrega como invitado del
evento.

La confirmación también trae un enlace para agregar el turno a Google Calendar
y un archivo `turno.ics` adjunto para iPhone, Outlook y otros calendarios. Es
una copia: si Eliana mueve o anula el turno, la del cliente no cambia.

Como cualquiera puede escribir un correo ajeno al reservar, la confirmación
dice que, si no reservaste ningún turno, ignores el mensaje, y trae un enlace
para anularlo (`/api/anular-turno`). El enlace lleva el id del evento y una
clave aleatoria que se guarda en el propio evento al crearlo: solo sirve para
ese turno y vence cuando el turno empieza. Abrirlo no anula nada; muestra el
turno y un botón, porque algunos programas de correo abren los enlaces solos
para revisarlos. Al confirmar se borra el evento, el horario queda libre y
Eliana recibe un aviso.

Reglas, centralizadas en `api/_lib/booking.js`:

- Lunes a viernes, de 9:30 a 12:30 y de 15:00 a 19:00, en turnos de 45 minutos.
- Hasta 45 días hacia adelante.
- **Anticipación mínima de 24 horas.** Para cambiarla, cargá
  `BOOKING_MIN_NOTICE_HOURS` en Vercel (por ejemplo, `48`) y volvé a desplegar.
- Un evento con horario bloquea los horarios que toca si está marcado como
  **Ocupado** (lo normal); si está como Disponible, no bloquea.
- Un evento **de todo el día** en el calendario de turnos bloquea el día entero,
  aunque Google lo marque como Disponible (lo hace por defecto). Así Eliana
  cierra un día (feriado, licencia, trámite fuera) con solo anotarlo. No
  bloquean los cumpleaños, la ubicación de trabajo ni las invitaciones que
  rechazó.

Dos personas no pueden tomar el mismo horario: cada turno usa un id de evento
fijo por horario y Google rechaza el segundo. Si un envío se reintenta, se
reconoce y no se duplica. Si Eliana borra o mueve un turno, el horario vuelve a
quedar libre.

### Enlace para carteles: `/reservar`

`www.escribaniaisbarbo.com.uy/reservar` lleva directo a la agenda. Está
**impreso en carteles con QR**, así que no se borra ni se le cambia el nombre:
si la página cambia, se ajusta la redirección y el cartel sigue sirviendo.

- `vercel.json` lo redirige (temporal, 307) a `/?reservar#contactar`.
- `assets/main.js` ve el parámetro, lo borra de la dirección y, si la agenda
  está prendida, abre la ventana en el paso de la agenda. Si está apagada, la
  página queda en la sección de reserva con WhatsApp.
- El QR está en `carteles/` en SVG (para imprenta, se agranda sin perder
  calidad), PDF y PNG de 2050 px. Es negro sobre blanco, con corrección de
  errores Q (aguanta un 25 % de daño) y el margen blanco que exige la norma: al
  armar el cartel no hay que recortarle el borde ni cambiarle los colores.
- El aviso para la puerta (A4) está en `carteles/aviso-reservas.html` y su
  PDF al lado. Después de editar el HTML, el PDF se regenera con Chrome:

  ```bash
  cd carteles
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
    --no-pdf-header-footer --virtual-time-budget=8000 \
    --print-to-pdf="$PWD/aviso-reservas.pdf" "file://$PWD/aviso-reservas.html"
  ```

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
cuenta de servicio (`turnos-web@escribania-turnos.iam.gserviceaccount.com`):

- El de los turnos, con **Hacer cambios (ver eventos privados como
  libre/ocupado)**. Es el permiso más acotado que permite reservar: la página
  no lee los detalles de los eventos privados de Eliana. Por eso los turnos se
  crean como eventos normales y no privados: con ese permiso Google rechaza los
  privados. Con "Ver solo libre/ocupado" la página muestra horarios pero no
  puede reservar.
- Los que solo bloquean horarios, con **Ver solo libre/ocupado**.

Compartir un calendario no se puede desde la app del celular: hay que usar
calendar.google.com (en el celular, en la versión para computadoras).

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
for f in assets/*.js api/*.js api/_lib/*.js; do node --check "$f"; done
```

Las pruebas no llaman a Google, Turnstile ni Resend: simulan sus respuestas.

## Avisos

Debajo de la presentación inicial aparece **Avisos** solo cuando hay al menos
un aviso activo y vigente. Sin avisos, el bloque no ocupa espacio. No agrega
enlaces al menú ni necesita una API o base de datos.

Además, la primera vez que alguien entra, el aviso se abre en una **ventana**
con el mismo diseño, a los 0,7 segundos. El navegador recuerda el `id` de los
avisos ya mostrados (clave `avisos-vistos`), así que la ventana sale una sola
vez por aviso; un aviso nuevo, con otro `id`, vuelve a abrirla. No se abre a
quien llega desde `/reservar` (el QR del cartel), que va directo a la agenda.
Si la cierran sin leer, el aviso sigue en la sección.

Cada aviso sigue el diseño del cartel impreso (`carteles/aviso-reservas.html`):
etiqueta roja "Aviso", una línea previa, el título con la parte clave en rojo,
el detalle en gris y un botón. El fondo continúa el crema del hero.

El contenido se administra en `assets/notices-data.js`. Cada entrada tiene
`id`, `active`, `title`, `paragraphs` (lista de párrafos), y opcionalmente
`lead` (la línea sobre el título), `highlight` (la segunda línea del título,
en rojo) y `link: { label, href }`. En los párrafos, `**texto**` va en
negrita. El enlace puede ser una ruta local o una URL HTTPS. Se muestra en el
orden de la lista, con el mismo formato en móvil y escritorio.

- `active: false` permite retirar un aviso sin borrarlo.
- `startsOn` y `endsOn` son opcionales (`null` si no hay límite), en formato
  `AAAA-MM-DD`. Ambos días se incluyen, según la fecha de Uruguay. Estas fechas
  controlan **cuándo se publica el aviso**, no cuándo empieza el cambio anunciado.
- Para ocultarlos todos, dejar `window.SiteNotices = [];`.
- Los avisos futuros, vencidos, incompletos o con fechas inválidas se omiten.
  La vigencia se comprueba al cargar y cada minuto mientras la página está abierta.

Después de editar el contenido, renovar el `?v=` de `notices-data.js` en
`index.html` y publicar mediante el despliegue habitual. Los avisos son públicos:
no cargar información privada. Si JavaScript no está disponible, el bloque
permanece oculto y el resto de la página sigue funcionando.

## Opiniones

La sección **Opiniones**, antes del pie, muestra reseñas del Perfil de Empresa
de Google copiadas a mano, tal cual las escribió cada persona, con el nombre y
la inicial del apellido. Tiene un botón para dejar una reseña
(`g.page/r/…/review`) y otro para ver todas en Google Maps. Los pasos para
actualizarlas están en `CLAUDE.md`, sección "Actualizar las reseñas". No llevan
datos estructurados: Google no admite reseñas propias publicadas en el sitio
para mostrar estrellas.

## Pendientes de contenido

- [ ] Cargar coordenadas verificadas y el Perfil de Empresa oficial en los datos
      estructurados.
- [ ] Armar una plantilla prolija (HTML) para los correos de la agenda, con la
      versión en texto plano como alternativa.

## Datos de la escribanía

- **Dirección:** Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay
- **Teléfono / WhatsApp:** +598 91 048 471
- **Correo:** esc.isbarbo@gmail.com
- **Horario:** lunes a viernes, de 9:30 a 12:30 y de 15:00 a 19:00
