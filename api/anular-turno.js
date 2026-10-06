"use strict";

/*
  Anular un turno con el enlace del correo de confirmación.

  GET solo muestra el turno y un botón: los programas de correo abren los
  enlaces por su cuenta para revisarlos, y si el GET anulara, se perderían
  turnos verdaderos. La anulación ocurre con el POST del botón.

  La página reutiliza los estilos de la confirmación del turno en la agenda
  (styles.css) y la misma carga de fuentes que index.html.
*/

const { WHATSAPP_NUMBER, cancellationNotice, formatSlot, sendEmail } = require("../lib/booking-emails");
const { bookingService, findCancellableBooking } = require("../lib/reservations");
const { createCalendarClient } = require("../lib/google-calendar");
const { NO_STORE, bookingEnabled, calendarIds, originAllowed } = require("./_security");

const calendar = createCalendarClient();
const FONTS_URL = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&amp;family=Handlee&amp;family=Inter:wght@400;500;600;700&amp;display=swap";

const ERRORS = {
  invalid: {
    status: 400,
    title: "Este enlace no es válido",
    message: "Puede que el turno ya haya pasado o que el enlace esté incompleto."
  },
  inactive: {
    status: 410,
    title: "Este turno ya no está activo",
    message: "Ya fue anulado o Eliana lo modificó."
  },
  unavailable: {
    status: 503,
    title: "No pudimos anular el turno",
    message: "Probá de nuevo en unos minutos."
  }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function page(res, status, title, body) {
  res.setHeader("Cache-Control", NO_STORE);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(status).send(`<!DOCTYPE html>
<html lang="es-UY">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${escapeHtml(title)} | Eliana Isbarbo Gfeller</title>
  <link rel="icon" href="/assets/favicon.png" type="image/png">
  <link href="${FONTS_URL}" rel="stylesheet">
  <link rel="stylesheet" href="/assets/styles.css">
  <style>
    .cancel-page { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; background: var(--gray-100); }
    .cancel-card { width: min(100%, 520px); border-radius: var(--radius); background: var(--white); box-shadow: var(--shadow); }
    .cancel-card h2 { font-size: clamp(1.9rem, 6vw, 2.4rem); }
    .cancel-card form { margin-bottom: 18px; }
  </style>
</head>
<body>
  <main class="cancel-page">
    <div class="contact-dialog-panel booking-done cancel-card">
      <span class="contact-dialog-eyebrow">Turnos</span>
      <h2>${escapeHtml(title)}</h2>
      ${body}
    </div>
  </main>
</body>
</html>`);
}

function errorPage(res, kind) {
  const { status, title, message } = ERRORS[kind];
  return page(res, status, title, `<p>${message}</p>
      <p>Si necesitás ayuda, <a href="https://wa.me/${WHATSAPP_NUMBER}">escribime por WhatsApp</a>.</p>`);
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  }
  if (!bookingEnabled()) {
    return errorPage(res, "unavailable");
  }
  // El formulario tiene que venir del propio sitio; se verifica antes de consultar a Google.
  if (req.method === "POST" && !originAllowed(req)) {
    return errorPage(res, "invalid");
  }

  const token = req.method === "POST" ? req.body?.t : req.query?.t;
  const { calendarId } = calendarIds();
  let found;
  try {
    found = await findCancellableBooking(calendar, calendarId, token);
  } catch (error) {
    console.error("cancel lookup failed", { status: error.status, reason: error.reason });
    return errorPage(res, "unavailable");
  }
  if (found.state !== "active") {
    return errorPage(res, found.state);
  }

  const { event } = found;
  if (req.method === "GET") {
    const when = formatSlot(event.start.dateTime);
    return page(res, 200, "¿Anular este turno?", `<p class="booking-done-summary">
        <strong>${escapeHtml(bookingService(event))}</strong><br>
        ${escapeHtml(when.charAt(0).toUpperCase() + when.slice(1))}
      </p>
      <p>Si no hiciste esta reserva, anulala y el horario queda libre para otra persona. Eliana recibe un aviso.</p>
      <form method="post" action="/api/anular-turno">
        <input type="hidden" name="t" value="${escapeHtml(token)}">
        <button class="btn btn-dark" type="submit">Sí, anular el turno</button>
      </form>
      <p><a href="/">Volver a la página</a></p>`);
  }

  try {
    await calendar.deleteEvent(calendarId, event.id);
  } catch (error) {
    console.error("cancel delete failed", { status: error.status, reason: error.reason });
    return errorPage(res, "unavailable");
  }

  try {
    await sendEmail(cancellationNotice(event), `${event.id}-anulado`);
  } catch (error) {
    // El turno ya está anulado; el aviso a Eliana es secundario y queda en los logs.
    console.error("cancel notice failed", { code: error.code, status: error.status });
  }

  return page(res, 200, "Turno anulado", `<p>El horario quedó libre y le avisamos a Eliana. No vas a recibir más mensajes sobre este turno.</p>
      <p><a href="/">Ir a la página</a></p>`);
};
