const test = require("node:test");
const assert = require("node:assert/strict");

const { SlotTakenError, eventIdFor, reserveSlot } = require("../lib/reservations");

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
  ocupado, freeBusy ignora los cancelados y una inserción con id repetido da 409.
*/
function fakeCalendar({ events = [], extraBusy = [] } = {}) {
  const store = new Map(events.map((event) => [event.id, event]));
  const calls = { inserts: 0 };

  return {
    store,
    calls,
    async busyIntervals() {
      const own = [...store.values()]
        .filter((event) => event.status !== "cancelled")
        .map((event) => ({ start: event.start.dateTime, end: event.end.dateTime }));
      return own.concat(extraBusy);
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

test("crea un evento privado con el trámite, los datos y la clave de idempotencia", async () => {
  const calendar = fakeCalendar();
  const { event, created } = await reserve(calendar);
  assert.equal(created, true);
  assert.equal(event.summary, "Turno: Sucesiones · Ana Pérez");
  assert.equal(event.visibility, "private");
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
