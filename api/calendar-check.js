"use strict";

/*
  TEMPORAL, solo en Preview: lista los eventos del calendario de turnos de las
  próximas dos semanas sin títulos ni datos personales, para diagnosticar qué
  bloquea horarios. Se borra antes de pasar a producción.
*/

const { createCalendarClient } = require("../lib/google-calendar");
const { calendarIds, send } = require("./_security");

module.exports = async (req, res) => {
  if (process.env.VERCEL_ENV !== "preview") {
    return send(res, 404, { error: "No encontrado." });
  }

  const { calendarId } = calendarIds();
  const now = Date.now();
  try {
    const result = await createCalendarClient().listEvents(calendarId, {
      timeMin: new Date(now).toISOString(),
      timeMax: new Date(now + 14 * 86400000).toISOString()
    });
    return send(res, 200, {
      events: (result.items || []).map((event) => ({
        id: String(event.id || "").startsWith("turno") ? event.id : "(otro)",
        status: event.status,
        allDay: Boolean(event.start?.date),
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        transparency: event.transparency || "opaque",
        eventType: event.eventType,
        visibility: event.visibility || "default"
      }))
    });
  } catch (error) {
    return send(res, 200, { error: `${error.status} ${error.reason}: ${error.detail || error.message}` });
  }
};
