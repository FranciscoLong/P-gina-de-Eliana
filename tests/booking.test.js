const test = require("node:test");
const assert = require("node:assert/strict");

const {
  HORIZON_DAYS,
  SERVICES,
  dateRange,
  isBookableDate,
  slotsForDate,
  validateBooking
} = require("../lib/booking");
const { signEnvelope } = require("../lib/apps-script-client");

const NOW = new Date("2026-08-01T12:00:00-03:00");
const TODAY = "2026-08-01";

function validBooking(overrides = {}) {
  return {
    serviceCode: "consulta-notarial",
    start: "2026-08-03T09:30:00-03:00",
    name: "Ana Pérez",
    email: "ANA@EXAMPLE.COM",
    phone: "099 123 456",
    details: "Hola Eliana, soy Ana Pérez y quisiera hacer una consulta notarial.",
    consent: true,
    idempotencyKey: "abcdefghijklmnop",
    ...overrides
  };
}

test("mantiene la lista cerrada de trámites canónicos", () => {
  assert.equal(SERVICES["consulta-notarial"], "Consulta notarial");
  assert.equal(SERVICES.inventado, undefined);
});

test("el horizonte incluye exactamente el día 45 y excluye el 46", () => {
  assert.equal(HORIZON_DAYS, 45);
  assert.equal(isBookableDate("2026-09-14", "2026-07-31"), true);
  assert.equal(isBookableDate("2026-09-15", "2026-07-31"), false);
  assert.equal(dateRange("2026-07-31", "2026-09-15", "2026-07-31").length, 0);
});

test("rechaza rangos anteriores a hoy y fechas normalizadas inválidas", () => {
  assert.deepEqual(dateRange("2020-01-01", "2026-08-01", TODAY), []);
  assert.deepEqual(dateRange("2026-02-30", "2026-03-01", "2026-02-01"), []);
});

test("los slots respetan días hábiles, pausa y duración de 45 minutos", () => {
  const slots = slotsForDate("2026-08-03", TODAY);
  assert.equal(slots[0].start, "2026-08-03T09:30:00-03:00");
  assert.equal(slots.at(-1).end, "2026-08-03T18:45:00-03:00");
  assert.equal(slots.some((slot) => slot.start.includes("12:30")), false);
  assert.deepEqual(slotsForDate("2026-08-02", TODAY), []);
});

test("valida, acota y no acepta campos críticos ausentes", () => {
  const valid = validateBooking(validBooking(), NOW);
  assert.equal(valid.valid, true);
  assert.equal(valid.value.email, "ana@example.com");
  assert.equal(validateBooking({}, NOW).valid, false);
});

test("rechaza horarios pasados, fuera de la grilla y explicaciones mayores a 400", () => {
  assert.equal(validateBooking(validBooking({ start: "2026-08-01T09:30:00-03:00" }), NOW).valid, false);
  assert.equal(validateBooking(validBooking({ start: "2026-08-03T09:45:00-03:00" }), NOW).valid, false);
  const tooLong = validateBooking(validBooking({ details: "a".repeat(401) }), NOW);
  assert.equal(tooLong.valid, false);
  assert.equal(tooLong.errors.details, "La explicación no puede superar los 400 caracteres.");
});

test("la firma HMAC cubre acción, timestamp, nonce y payload", () => {
  const payload = { serviceCode: "consulta-notarial" };
  const signature = signEnvelope("availability", payload, "secret", "1", "nonce");
  assert.equal(signature, signEnvelope("availability", payload, "secret", "1", "nonce"));
  assert.notEqual(signature, signEnvelope("booking", payload, "secret", "1", "nonce"));
  assert.notEqual(signature, signEnvelope("availability", payload, "secret", "2", "nonce"));
});
