const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  HORIZON_DAYS,
  SERVICES,
  bookableDays,
  findBookableSlot,
  overlaps,
  readRules,
  slotsForDate,
  validateBooking
} = require("../api/_lib/booking");

const RULES = { durationMinutes: 45, minNoticeHours: 24, gapMinutes: 10 };
// Lunes 5 de octubre de 2026, 10:00 en Montevideo.
const NOW = new Date("2026-10-05T10:00:00-03:00");

function validInput(overrides = {}) {
  return {
    service: "Sucesiones",
    start: "2026-10-07T09:30:00-03:00",
    name: "Ana Pérez",
    email: "ANA@EXAMPLE.COM",
    phone: "099 123 456",
    details: "Hola Eliana, soy Ana y quisiera consultar por una sucesión.",
    consent: true,
    idempotencyKey: "abcdefghijklmnop",
    ...overrides
  };
}

test("la grilla de un día hábil arranca al abrir cada franja y no invade la pausa", () => {
  const starts = slotsForDate("2026-10-07", RULES).map((slot) => slot.start.slice(11, 16));
  assert.deepEqual(starts, ["09:30", "10:15", "11:00", "11:45", "15:00", "15:45", "16:30", "17:15", "18:00"]);
  assert.equal(slotsForDate("2026-10-07", RULES).at(-1).end, "2026-10-07T18:45:00-03:00");
});

test("del 2 al 23 de noviembre de 2026 no hay turnos por la mañana y el 24 vuelven", () => {
  const starts = (ymd) => slotsForDate(ymd, RULES).map((slot) => slot.start.slice(11, 16));
  const afternoon = ["15:00", "15:45", "16:30", "17:15", "18:00"];
  const fullDay = ["09:30", "10:15", "11:00", "11:45", ...afternoon];
  assert.deepEqual(starts("2026-10-30"), fullDay);
  assert.deepEqual(starts("2026-11-02"), afternoon);
  assert.deepEqual(starts("2026-11-23"), afternoon);
  assert.deepEqual(starts("2026-11-24"), fullDay);
  const now = new Date("2026-10-22T10:00:00-03:00");
  assert.equal(findBookableSlot("2026-11-10T09:30:00-03:00", now, RULES), null);
  assert.equal(findBookableSlot("2026-11-10T15:00:00-03:00", now, RULES)?.end, "2026-11-10T15:45:00-03:00");
});

test("hasta el 30 de noviembre de 2026 los turnos siguen seguidos desde las 9:30", () => {
  const starts = slotsForDate("2026-11-30", RULES).map((slot) => slot.start.slice(11, 16));
  assert.deepEqual(starts, ["09:30", "10:15", "11:00", "11:45", "15:00", "15:45", "16:30", "17:15", "18:00"]);
});

test("desde el 1 de diciembre de 2026 la mañana arranca a las 9:00 y queda un margen entre turnos", () => {
  const slots = slotsForDate("2026-12-01", RULES);
  assert.deepEqual(
    slots.map((slot) => `${slot.start.slice(11, 16)}-${slot.end.slice(11, 16)}`),
    [
      "09:00-09:45", "09:55-10:40", "10:50-11:35", "11:45-12:30",
      "15:00-15:45", "15:55-16:40", "16:50-17:35", "17:45-18:30"
    ]
  );
});

test("el margen se cambia con BOOKING_GAP_MINUTES y 0 deja los turnos seguidos", () => {
  const startsWith = (gap) => slotsForDate("2026-12-01", readRules({ BOOKING_GAP_MINUTES: gap }))
    .map((slot) => slot.start.slice(11, 16));
  assert.deepEqual(startsWith("15"), ["09:00", "10:00", "11:00", "15:00", "16:00", "17:00", "18:00"]);
  assert.deepEqual(startsWith("0"), ["09:00", "09:45", "10:30", "11:15", "15:00", "15:45", "16:30", "17:15", "18:00"]);
});

test("desde el 1 de diciembre no se acepta un horario de la grilla anterior", () => {
  const now = new Date("2026-11-20T10:00:00-03:00");
  assert.equal(findBookableSlot("2026-12-01T09:30:00-03:00", now, RULES), null);
  assert.equal(findBookableSlot("2026-12-01T10:15:00-03:00", now, RULES), null);
  assert.equal(findBookableSlot("2026-12-01T09:55:00-03:00", now, RULES)?.end, "2026-12-01T10:40:00-03:00");
});

test("sábados y domingos no tienen horarios", () => {
  assert.deepEqual(slotsForDate("2026-10-10", RULES), []);
  assert.deepEqual(slotsForDate("2026-10-11", RULES), []);
});

test("con 24 horas de anticipación, hoy no aparece y mañana arranca en el primer horario desde esa hora", () => {
  const days = bookableDays(NOW, RULES);
  assert.equal(days[0].date, "2026-10-06");
  assert.equal(days[0].slots[0].start, "2026-10-06T10:15:00-03:00");
});

test("si al día siguiente le queda un solo horario, ese día se ofrece igual", () => {
  // Jueves 15 a las 17:30: con 24 horas de anticipación al viernes solo le queda el de las 18:00.
  const days = bookableDays(new Date("2026-10-15T17:30:00-03:00"), RULES);
  assert.equal(days[0].date, "2026-10-16");
  assert.deepEqual(days[0].slots.map((slot) => slot.start), ["2026-10-16T18:00:00-03:00"]);
});

test("la anticipación se cambia con BOOKING_MIN_NOTICE_HOURS", () => {
  const rules = readRules({ BOOKING_MIN_NOTICE_HOURS: "48" });
  assert.equal(rules.minNoticeHours, 48);
  assert.equal(bookableDays(NOW, rules)[0].slots[0].start, "2026-10-07T10:15:00-03:00");
  assert.deepEqual(readRules({}), { durationMinutes: 45, minNoticeHours: 24, gapMinutes: 10 });
});

test("un valor de configuración inválido apaga la agenda en vez de adivinar", () => {
  assert.throws(() => readRules({ BOOKING_MIN_NOTICE_HOURS: "48h" }), { code: "INVALID_CONFIG" });
  assert.throws(() => readRules({ BOOKING_DURATION_MINUTES: "0" }), { code: "INVALID_CONFIG" });
  assert.throws(() => readRules({ BOOKING_GAP_MINUTES: "10m" }), { code: "INVALID_CONFIG" });
});

test("el horizonte llega exactamente hasta el día 45", () => {
  const days = bookableDays(NOW, RULES);
  assert.equal(days.at(-1).date, "2026-11-19");
  assert.equal(HORIZON_DAYS, 45);
  assert.equal(findBookableSlot("2026-11-19T15:00:00-03:00", NOW, RULES)?.start, "2026-11-19T15:00:00-03:00");
  assert.equal(findBookableSlot("2026-11-20T15:00:00-03:00", NOW, RULES), null);
});

test("detecta superposición parcial y respeta los bordes exactos", () => {
  const slot = { start: "2026-10-07T09:30:00-03:00", end: "2026-10-07T10:15:00-03:00" };
  assert.equal(overlaps(slot, { start: "2026-10-07T12:00:00Z", end: "2026-10-07T12:31:00Z" }), true);
  assert.equal(overlaps(slot, { start: "2026-10-07T13:15:00Z", end: "2026-10-07T14:00:00Z" }), false);
  assert.equal(overlaps(slot, { start: "2026-10-07T11:00:00Z", end: "2026-10-07T12:30:00Z" }), false);
});

test("valida y normaliza una reserva correcta", () => {
  const checked = validateBooking(validInput(), NOW, RULES);
  assert.equal(checked.valid, true);
  assert.equal(checked.value.email, "ana@example.com");
  assert.deepEqual(checked.value.slot, {
    start: "2026-10-07T09:30:00-03:00",
    end: "2026-10-07T10:15:00-03:00"
  });
});

test("rechaza trámites fuera de la lista y horarios fuera de la grilla o sin anticipación", () => {
  assert.equal(validateBooking(validInput({ service: "Otro" }), NOW, RULES).errors.service !== undefined, true);
  assert.ok(validateBooking(validInput({ start: "2026-10-07T09:45:00-03:00" }), NOW, RULES).errors.start);
  assert.ok(validateBooking(validInput({ start: "2026-10-06T09:30:00-03:00" }), NOW, RULES).errors.start);
});

test("exige consentimiento, teléfono con al menos 8 dígitos y explicación de hasta 400 caracteres", () => {
  const checked = validateBooking(validInput({ consent: "true", phone: "123", details: "a".repeat(401) }), NOW, RULES);
  assert.deepEqual(Object.keys(checked.errors).sort(), ["consent", "details", "phone"]);
  assert.equal(validateBooking(validInput({ details: "a".repeat(400) }), NOW, RULES).valid, true);
});

test("los saltos de línea solo se conservan en la consulta", () => {
  const checked = validateBooking(validInput({ name: "Ana\nPérez", details: "Línea 1\nLínea 2" }), NOW, RULES);
  assert.equal(checked.value.name, "Ana Pérez");
  assert.equal(checked.value.details, "Línea 1\nLínea 2");
});

test("la lista de trámites del servidor coincide con los enlaces de Servicios", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const fromHtml = [...html.matchAll(/data-service="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(fromHtml)].sort(), SERVICES.filter((s) => s !== "Consulta notarial").sort());
});
