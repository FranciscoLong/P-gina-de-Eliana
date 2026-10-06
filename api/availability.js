"use strict";

/*
  Horarios de los próximos 45 días. Cada horario va como "available" o
  "unavailable"; nunca se devuelve qué evento lo ocupa.

  La respuesta correcta se guarda 30 segundos en la CDN de Vercel: así una
  ráfaga de visitas no agota la cuota de Google. Que un horario figure libre
  unos segundos de más no confirma nada, porque /api/bookings vuelve a
  consultar Google antes de crear el turno.
*/

const { TIME_ZONE, bookableDays, overlaps, readRules } = require("../lib/booking");
const { createCalendarClient } = require("../lib/google-calendar");
const { blockedIntervals } = require("../lib/reservations");
const { UNAVAILABLE_MESSAGE, bookingEnabled, calendarIds, originAllowed, send } = require("./_security");

const calendar = createCalendarClient();
const SHARED_CACHE = "public, max-age=0, s-maxage=30, stale-while-revalidate=30";

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return send(res, 405, { error: "Método no permitido." });
  }
  if (!bookingEnabled()) {
    return send(res, 503, { error: UNAVAILABLE_MESSAGE });
  }
  if (!originAllowed(req)) {
    return send(res, 403, { error: "Origen no autorizado." });
  }

  try {
    const days = bookableDays(new Date(), readRules());
    if (!days.length) {
      return send(res, 200, { timeZone: TIME_ZONE, days: [] }, SHARED_CACHE);
    }

    const busy = await blockedIntervals(
      calendar,
      calendarIds(),
      days[0].slots[0].start,
      days.at(-1).slots.at(-1).end
    );

    return send(res, 200, {
      timeZone: TIME_ZONE,
      days: days.map((day) => ({
        date: day.date,
        slots: day.slots.map((slot) => ({
          start: slot.start,
          end: slot.end,
          status: busy.some((interval) => overlaps(slot, interval)) ? "unavailable" : "available"
        }))
      }))
    }, SHARED_CACHE);
  } catch (error) {
    console.error("booking availability failed", {
      code: error.code,
      status: error.status,
      reason: error.reason,
      detail: error.detail
    });
    return send(res, 503, { error: UNAVAILABLE_MESSAGE });
  }
};
