const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SlotTakenError,
  bookingService,
  cancelToken,
  eventIdFor,
  findCancellableBooking,
  reserveSlot
} = require("../lib/reservations");

const SLOT = { start: "2026-10-07T09:30:00-03:00", end: "2026-10-07T10:15:00-03:00" };

function booking(key = "clave-de-prueba-0001") {
  return {
    service: "Sucesiones",
    slot: SLOT,
    name: "Ana Pérez",
    email: "ana@example.com",
    phone: "099 123 456",
    details: "Consulta",
    idempotencyKey: key
  };
}

/*
  Calendario en memoria que imita a Google: el id de un evento borrado sigue
  ocupado, freeBusy ignora los cancelados, los de todo el día y los marcados
  como disponibles, y una inserción con id repetido da 409.
*/
function fakeCalendar({ events = [], extraBusy = [] } = {}) {
  const store = new Map(events.map((event) => [event.id, event]));
  const calls = { inserts: 0 };

  return {
    store,
    calls,
    async busyIntervals() {
      const own = [...store.values()]
        .filter((event) => event.status !== "cancelled" && event.start.dateTime && event.transparency !== "transparent")
        .map((event) => ({ start: event.start.dateTime, end: event.end.dateTime }));
      return own.concat(extraBusy);
    },
    async listEvents() {
      return { items: [...store.values()].filter((event) => event.status !== "cancelled") };
    },
    async insertEvent(_calendarId, event) {
      calls.inserts += 1;
      if (store.has(event.id)) {
        throw Object.assign(new Error("duplicate"), { status: 409 });
      }
      const created = { ...event, status: "confirmed", htmlLink: `https://calendar/${event.id}` };
      store.set(event.id, created);
      return created;
    },
    async getEvent(_calendarId, id) {
      return store.get(id) || null;
    }
  };
}

function reserve(calendar, key) {
  return reserveSlot({
    calendar,
    calendarId: "eliana@example.com",
    blockingCalendarIds: ["eliana@example.com"],
    booking: booking(key),
    bookedAt: "5/10/26 10:00"
  });
}

test("el id del evento solo usa caracteres base32hex", () => {
  assert.equal(eventIdFor(SLOT, 0), "turno202610070930v0");
  assert.match(eventIdFor(SLOT, 12), /^[a-v0-9]{5,1024}$/);
});

test("crea el evento con el trámite, los datos y la clave de idempotencia, sin invitados", async () => {
  const calendar = fakeCalendar();
  const { event, created } = await reserve(calendar);
  assert.equal(created, true);
  assert.equal(event.summary, "Turno: Sucesiones · Ana Pérez");
  // Privado lo rechaza Google con el permiso acotado de la cuenta de servicio.
  assert.equal(event.visibility, undefined);
  assert.equal(event.attendees, undefined);
  assert.match(event.description, /Teléfono: 099 123 456/);
  assert.equal(event.extendedProperties.private.bookingKey, "clave-de-prueba-0001");
});

test("un reintento del mismo envío devuelve el turno existente sin duplicarlo", async () => {
  const calendar = fakeCalendar();
  await reserve(calendar);
  const retry = await reserve(calendar);
  assert.equal(retry.created, false);
  assert.equal(calendar.store.size, 1);
});

test("otra persona no puede tomar un horario ya reservado", async () => {
  const calendar = fakeCalendar();
  await reserve(calendar, "primera-persona-0001");
  await assert.rejects(reserve(calendar, "segunda-persona-0002"), SlotTakenError);
});

test("dos confirmaciones simultáneas del mismo horario dejan un solo turno", async () => {
  const calendar = fakeCalendar();
  // Ambas pasan freeBusy antes de que exista el evento.
  const results = await Promise.allSettled([
    reserve(calendar, "primera-persona-0001"),
    reserve(calendar, "segunda-persona-0002")
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.ok(results.some((result) => result.reason instanceof SlotTakenError));
  assert.equal(calendar.store.size, 1);
});

test("un evento ajeno superpuesto bloquea el horario", async () => {
  const calendar = fakeCalendar({
    extraBusy: [{ start: "2026-10-07T12:00:00Z", end: "2026-10-07T13:00:00Z" }]
  });
  await assert.rejects(reserve(calendar), SlotTakenError);
  assert.equal(calendar.calls.inserts, 0);
});

test("si Eliana canceló el turno anterior, el horario se vuelve a reservar con otro id", async () => {
  const calendar = fakeCalendar({
    events: [{
      id: "turno202610070930v0",
      status: "cancelled",
      start: { dateTime: SLOT.start },
      end: { dateTime: SLOT.end }
    }]
  });
  const { event } = await reserve(calendar);
  assert.equal(event.id, "turno202610070930v1");
});

test("si Eliana movió el turno anterior a otro horario, este queda libre", async () => {
  const calendar = fakeCalendar({
    events: [{
      id: "turno202610070930v0",
      status: "confirmed",
      start: { dateTime: "2026-10-08T15:00:00-03:00" },
      end: { dateTime: "2026-10-08T15:45:00-03:00" }
    }]
  });
  const { event } = await reserve(calendar);
  assert.equal(event.id, "turno202610070930v1");
});

test("un error de Google que no es conflicto se propaga sin reintentos", async () => {
  const calendar = fakeCalendar();
  calendar.insertEvent = async () => {
    throw Object.assign(new Error("quota"), { status: 403 });
  };
  await assert.rejects(reserve(calendar), (error) => error.status === 403);
});

function allDay(id, date, extra = {}) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return {
    id,
    status: "confirmed",
    transparency: "transparent",
    start: { date },
    end: { date: next.toISOString().slice(0, 10) },
    ...extra
  };
}

test("un evento de todo el día bloquea el día aunque Google lo marque como disponible", async () => {
  const calendar = fakeCalendar({ events: [allDay("ausencia", "2026-10-07")] });
  await assert.rejects(reserve(calendar), SlotTakenError);
  assert.equal(calendar.calls.inserts, 0);
});

test("si Eliana pasa un turno a todo el día, ese día deja de ofrecerse", async () => {
  const calendar = fakeCalendar({ events: [allDay("turno202610070930v0", "2026-10-07")] });
  await assert.rejects(reserve(calendar), SlotTakenError);
});

test("cumpleaños, ubicación de trabajo e invitaciones rechazadas de todo el día no bloquean", async () => {
  const calendar = fakeCalendar({
    events: [
      allDay("cumple", "2026-10-07", { eventType: "birthday" }),
      allDay("oficina", "2026-10-07", { eventType: "workingLocation" }),
      allDay("invitacion", "2026-10-07", { attendees: [{ self: true, responseStatus: "declined" }] })
    ]
  });
  const { created } = await reserve(calendar);
  assert.equal(created, true);
});

test("un evento con horario marcado como disponible no bloquea", async () => {
  const calendar = fakeCalendar({
    events: [{
      id: "recordatorio",
      status: "confirmed",
      transparency: "transparent",
      start: { dateTime: SLOT.start },
      end: { dateTime: SLOT.end }
    }]
  });
  const { created } = await reserve(calendar);
  assert.equal(created, true);
});

test("un evento de todo el día de otra fecha no bloquea", async () => {
  const calendar = fakeCalendar({ events: [allDay("ayer", "2026-10-06"), allDay("manana", "2026-10-08")] });
  const { created } = await reserve(calendar);
  assert.equal(created, true);
});

test("el evento guarda el trámite y una clave aleatoria para el enlace de anular", async () => {
  const { event } = await reserve(fakeCalendar());
  assert.equal(event.extendedProperties.private.service, "Sucesiones");
  assert.match(event.extendedProperties.private.cancelKey, /^[A-Za-z0-9_-]{24}$/);
  assert.equal(cancelToken(event), `${event.id}.${event.extendedProperties.private.cancelKey}`);
  assert.equal(bookingService(event), "Sucesiones");
  assert.equal(bookingService({ summary: "Turno: Poderes · Ana" }), "Poderes");
});

const BEFORE = new Date("2026-10-06T12:00:00-03:00");

test("el enlace encuentra el turno solo con su clave y antes de que empiece", async () => {
  const calendar = fakeCalendar();
  const { event } = await reserve(calendar);
  const token = cancelToken(event);

  assert.equal((await findCancellableBooking(calendar, "cal", token, BEFORE)).state, "active");
  assert.equal((await findCancellableBooking(calendar, "cal", `${event.id}.otra-clave`, BEFORE)).state, "invalid");
  assert.equal((await findCancellableBooking(calendar, "cal", token, new Date(SLOT.start))).state, "invalid");
  for (const malformed of [undefined, "", "sin-punto", `${token}.extra`, "IDMAYUSC.clave", "x".repeat(300)]) {
    assert.equal((await findCancellableBooking(calendar, "cal", malformed, BEFORE)).state, "invalid", malformed);
  }
});

test("un turno anulado o pasado a todo el día ya no se puede anular", async () => {
  const calendar = fakeCalendar();
  const { event } = await reserve(calendar);
  const token = cancelToken(event);

  calendar.store.set(event.id, { ...event, start: { date: "2026-10-07" }, end: { date: "2026-10-08" } });
  assert.equal((await findCancellableBooking(calendar, "cal", token, BEFORE)).state, "inactive");

  calendar.store.set(event.id, { ...event, status: "cancelled" });
  assert.equal((await findCancellableBooking(calendar, "cal", token, BEFORE)).state, "inactive");
});

test("un evento que no es de la página no se puede anular aunque se adivine el id", async () => {
  const calendar = fakeCalendar({
    events: [{ id: "turno202610070930v0", status: "confirmed", start: { dateTime: SLOT.start }, end: { dateTime: SLOT.end } }]
  });
  assert.equal((await findCancellableBooking(calendar, "cal", "turno202610070930v0.clave", BEFORE)).state, "invalid");
});
