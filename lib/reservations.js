"use strict";

/*
  Creación del turno en Google Calendar sin base de datos.

  El evento de cada horario usa un id determinístico ("turno" + fecha + hora +
  "v" + n). Google rechaza con 409 un id que ya existe en el calendario, así que
  si dos personas confirman el mismo horario a la vez, solo una inserción
  prospera: el calendario hace de candado.

  El sufijo n existe porque un id borrado sigue ocupado en Google: si Eliana
  cancela o mueve un turno, el horario vuelve a quedar libre y el siguiente se
  crea con n + 1. La clave de idempotencia del navegador viaja en las
  propiedades privadas del evento y permite reconocer un reintento del mismo
  envío sin duplicar el turno.
*/

const { overlaps } = require("./booking");

const MAX_ID_SUFFIX = 20;
const OFFICE_ADDRESS = "Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay";

class SlotTakenError extends Error {
  constructor() {
    super("Ese horario acaba de ocuparse.");
    this.name = "SlotTakenError";
    this.status = 409;
  }
}

function eventIdFor(slot, suffix) {
  // "2026-10-07T09:30:00-03:00" → "turno202610070930v0" (solo a-v y 0-9).
  return `turno${slot.start.slice(0, 10).replace(/-/g, "")}${slot.start.slice(11, 16).replace(":", "")}v${suffix}`;
}

function occupiesSlot(event, slot) {
  return Boolean(event)
    && event.status !== "cancelled"
    && Date.parse(event.start?.dateTime) === Date.parse(slot.start);
}

function describeBooking(booking, bookedAt) {
  return [
    `Trámite: ${booking.service}`,
    `Nombre: ${booking.name}`,
    `Teléfono: ${booking.phone}`,
    `Correo: ${booking.email}`,
    "",
    "Consulta:",
    booking.details,
    "",
    `Reservado desde escribaniaisbarbo.com.uy el ${bookedAt}.`
  ].join("\n");
}

/*
  El evento no se marca como privado: Google le prohíbe a la cuenta de servicio
  crear eventos privados cuando solo ve los privados como libre/ocupado, que es
  el permiso más acotado. El calendario de Eliana no es público ni está
  compartido con otras personas, así que los datos del cliente solo los ve ella.
*/
function buildEvent(id, booking, bookedAt) {
  return {
    id,
    summary: `Turno: ${booking.service} · ${booking.name}`,
    description: describeBooking(booking, bookedAt),
    location: OFFICE_ADDRESS,
    start: { dateTime: booking.slot.start, timeZone: "America/Montevideo" },
    end: { dateTime: booking.slot.end, timeZone: "America/Montevideo" },
    transparency: "opaque",
    extendedProperties: {
      private: { source: "web", bookingKey: booking.idempotencyKey }
    }
  };
}

async function findOwnEvent(calendar, calendarId, booking) {
  for (let suffix = 0; suffix < MAX_ID_SUFFIX; suffix += 1) {
    const event = await calendar.getEvent(calendarId, eventIdFor(booking.slot, suffix));
    if (!event) {
      return null;
    }
    if (occupiesSlot(event, booking.slot)
      && event.extendedProperties?.private?.bookingKey === booking.idempotencyKey) {
      return event;
    }
  }
  return null;
}

/*
  Devuelve { event, created }. created es false cuando el mismo envío ya había
  creado el turno (por ejemplo, se cortó la conexión antes de la respuesta):
  en ese caso no se vuelven a mandar los correos.
*/
async function reserveSlot({ calendar, calendarId, blockingCalendarIds, booking, bookedAt }) {
  const busy = await calendar.busyIntervals(blockingCalendarIds, booking.slot.start, booking.slot.end);

  if (busy.some((interval) => overlaps(booking.slot, interval))) {
    const own = await findOwnEvent(calendar, calendarId, booking);
    if (own) {
      return { event: own, created: false };
    }
    throw new SlotTakenError();
  }

  for (let suffix = 0; suffix < MAX_ID_SUFFIX; suffix += 1) {
    const id = eventIdFor(booking.slot, suffix);
    try {
      const event = await calendar.insertEvent(calendarId, buildEvent(id, booking, bookedAt));
      return { event, created: true };
    } catch (error) {
      if (error.status !== 409) {
        throw error;
      }
    }

    const existing = await calendar.getEvent(calendarId, id);
    if (occupiesSlot(existing, booking.slot)) {
      if (existing.extendedProperties?.private?.bookingKey === booking.idempotencyKey) {
        return { event: existing, created: false };
      }
      throw new SlotTakenError();
    }
    // Id ocupado por un turno cancelado o movido: se prueba el siguiente.
  }

  throw new SlotTakenError();
}

module.exports = {
  MAX_ID_SUFFIX,
  OFFICE_ADDRESS,
  SlotTakenError,
  buildEvent,
  eventIdFor,
  reserveSlot
};
