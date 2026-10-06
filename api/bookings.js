"use strict";

/*
  Confirma un turno: valida los datos, verifica Turnstile, crea el evento en
  el calendario de Eliana y manda los dos correos.

  El turno queda confirmado en cuanto existe el evento. Si después falla un
  correo, la respuesta lo dice (emailSent: false) para que la página le pida
  al cliente que anote los datos, pero el turno no se deshace.
*/

const { readRules, validateBooking } = require("../lib/booking");
const { createCalendarClient } = require("../lib/google-calendar");
const { SlotTakenError, cancelToken, reserveSlot } = require("../lib/reservations");
const { clientConfirmation, officeNotification, sendEmail } = require("../lib/booking-emails");
const {
  UNAVAILABLE_MESSAGE,
  bookingEnabled,
  calendarIds,
  clientIp,
  originAllowed,
  requestOrigin,
  send,
  verifyTurnstile
} = require("./_security");

const calendar = createCalendarClient();

// "5/10/2026 a las 22:10", en hora de Montevideo.
function bookedAtLabel(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.day}/${parts.month}/${parts.year} a las ${parts.hour}:${parts.minute}`;
}

// El enlace apunta al mismo sitio desde el que se reservó (producción o Preview); el origen ya está validado.
function cancelUrlFor(req, event) {
  return `${requestOrigin(req)}/api/anular-turno?t=${cancelToken(event)}`;
}

async function sendBookingEmails(booking, event, rules, cancelUrl) {
  const results = await Promise.allSettled([
    sendEmail(
      clientConfirmation(booking, { durationMinutes: rules.durationMinutes, cancelUrl, eventId: event.id }),
      `${booking.idempotencyKey}-cliente`
    ),
    sendEmail(officeNotification(booking, event.htmlLink), `${booking.idempotencyKey}-oficina`)
  ]);

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("booking email failed", {
        recipient: index === 0 ? "client" : "office",
        code: result.reason?.code,
        status: result.reason?.status,
        reason: result.reason?.reason
      });
    }
  });
  return results[0].status === "fulfilled";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Método no permitido." });
  }
  if (!bookingEnabled()) {
    return send(res, 503, { error: UNAVAILABLE_MESSAGE });
  }
  if (!originAllowed(req)) {
    return send(res, 403, { error: "Origen no autorizado." });
  }

  let rules;
  try {
    rules = readRules();
  } catch (error) {
    console.error("booking rules invalid", { code: error.code, message: error.message });
    return send(res, 503, { error: UNAVAILABLE_MESSAGE });
  }

  const now = new Date();
  const checked = validateBooking(req.body, now, rules);
  if (!checked.valid) {
    const status = checked.errors.start && Object.keys(checked.errors).length === 1 ? 409 : 400;
    return send(res, status, { error: "Revisá los datos ingresados.", fields: checked.errors });
  }

  let human = false;
  try {
    human = await verifyTurnstile(req.body.turnstileToken, clientIp(req));
  } catch (_error) {
    return send(res, 503, { error: "La verificación de seguridad no respondió. Probá de nuevo en unos minutos." });
  }
  if (!human) {
    return send(res, 403, { error: "No pudimos verificar que seas una persona. Completá la verificación de nuevo." });
  }

  const booking = checked.value;
  let reservation;
  try {
    reservation = await reserveSlot({
      calendar,
      ...calendarIds(),
      booking,
      bookedAt: bookedAtLabel(now)
    });
  } catch (error) {
    if (error instanceof SlotTakenError) {
      return send(res, 409, { error: "Ese horario acaba de ocuparse. Elegí otro." });
    }
    console.error("booking calendar failed", {
      code: error.code,
      status: error.status,
      reason: error.reason,
      detail: error.detail
    });
    return send(res, 503, { error: UNAVAILABLE_MESSAGE });
  }

  const emailSent = reservation.created
    ? await sendBookingEmails(booking, reservation.event, rules, cancelUrlFor(req, reservation.event))
    : true;

  return send(res, reservation.created ? 201 : 200, {
    status: "confirmed",
    service: booking.service,
    start: booking.slot.start,
    end: booking.slot.end,
    email: booking.email,
    emailSent
  });
};
