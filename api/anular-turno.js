"use strict";

/*
  Anular un turno con el enlace del correo de confirmación.

  GET solo muestra el turno y un botón: los programas de correo abren los
  enlaces por su cuenta para revisarlos, y si el GET anulara, se perderían
  turnos verdaderos. La anulación ocurre con el POST del botón.
*/

const { formatSlot, cancellationNotice, sendEmail } = require("../lib/booking-emails");
const { readCancelToken } = require("../lib/booking-links");
const { createCalendarClient } = require("../lib/google-calendar");
const { bookingEnabled, calendarIds, originAllowed } = require("./_security");

const calendar = createCalendarClient();
const WHATSAPP_URL = "https://wa.me/59891048471";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function page(res, status, { title, body }) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(status).send(`<!DOCTYPE html>
<html lang="es-UY">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${escapeHtml(title)} | Eliana Isbarbo Gfeller</title>
  <link rel="icon" href="/assets/favicon.png" type="image/png">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&amp;family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/styles.css">
  <style>
    .cancel-page { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; background: var(--gray-100); }
    .cancel-card { width: min(100%, 520px); padding: 34px 30px; border: 1px solid var(--gray-200); border-radius: var(--radius); background: var(--white); box-shadow: var(--shadow); }
    .cancel-card h1 { margin: 6px 0 14px; font-size: clamp(1.9rem, 6vw, 2.4rem); }
    .cancel-card p { margin-bottom: 14px; color: var(--gray-700); }
    .cancel-card form { margin: 22px 0 12px; }
    .cancel-card .btn { width: 100%; }
    .cancel-card a.cancel-link { color: var(--green-900); font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
  </style>
</head>
<body>
  <main class="cancel-page">
    <div class="cancel-card">
      <span class="contact-dialog-eyebrow">Turnos</span>
      ${body}
    </div>
  </main>
</body>
</html>`);
}

function helpLine() {
  return `<p>Si necesitás ayuda, <a class="cancel-link" href="${WHATSAPP_URL}">escribime por WhatsApp</a>.</p>`;
}

function invalidLink(res) {
  return page(res, 400, {
    title: "Enlace no válido",
    body: `<h1>Este enlace no es válido</h1>
      <p>Puede que el turno ya haya pasado o que el enlace esté incompleto.</p>
      ${helpLine()}`
  });
}

function notActive(res) {
  return page(res, 410, {
    title: "Turno no activo",
    body: `<h1>Este turno ya no está activo</h1>
      <p>Ya fue anulado o Eliana lo modificó.</p>
      ${helpLine()}`
  });
}

function unavailable(res) {
  return page(res, 503, {
    title: "No disponible",
    body: `<h1>No pudimos anular el turno</h1>
      <p>Probá de nuevo en unos minutos.</p>
      ${helpLine()}`
  });
}

// El evento tiene que ser un turno de la página y seguir en el horario del enlace.
async function findBooking(link) {
  const event = await calendar.getEvent(calendarIds().calendarId, link.eventId);
  const active = event
    && event.status !== "cancelled"
    && event.extendedProperties?.private?.source === "web"
    && Date.parse(event.start?.dateTime) === Date.parse(link.start);
  return active ? event : null;
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  }
  if (!bookingEnabled()) {
    return unavailable(res);
  }

  const token = req.method === "POST" ? req.body?.t : req.query?.t;
  const link = readCancelToken(token);
  if (!link) {
    return invalidLink(res);
  }

  let event;
  try {
    event = await findBooking(link);
  } catch (error) {
    console.error("cancel lookup failed", { status: error.status, reason: error.reason });
    return unavailable(res);
  }
  if (!event) {
    return notActive(res);
  }

  const when = formatSlot(event.start.dateTime);
  const service = String(event.summary || "").replace(/^Turno: /, "").split(" · ")[0];

  if (req.method === "GET") {
    return page(res, 200, {
      title: "Anular turno",
      body: `<h1>¿Anular este turno?</h1>
        <p><strong>${escapeHtml(service)}</strong><br>${escapeHtml(when.charAt(0).toUpperCase() + when.slice(1))}</p>
        <p>Si no hiciste esta reserva, anulala y el horario queda libre para otra persona. Eliana recibe un aviso.</p>
        <form method="post" action="/api/anular-turno">
          <input type="hidden" name="t" value="${escapeHtml(token)}">
          <button class="btn btn-dark" type="submit">Sí, anular el turno</button>
        </form>
        <p><a class="cancel-link" href="/">Volver a la página</a></p>`
    });
  }

  if (!originAllowed(req)) {
    return invalidLink(res);
  }

  try {
    await calendar.deleteEvent(calendarIds().calendarId, link.eventId);
  } catch (error) {
    console.error("cancel delete failed", { status: error.status, reason: error.reason });
    return unavailable(res);
  }

  try {
    await sendEmail(cancellationNotice(event), `${link.eventId}-anulado`);
  } catch (error) {
    // El turno ya está anulado; el aviso a Eliana es secundario y queda en los logs.
    console.error("cancel notice failed", { code: error.code, status: error.status });
  }

  return page(res, 200, {
    title: "Turno anulado",
    body: `<h1>Turno anulado</h1>
      <p>El horario quedó libre y le avisamos a Eliana. No vas a recibir más mensajes sobre este turno.</p>
      <p><a class="cancel-link" href="/">Ir a la página</a></p>`
  });
};
