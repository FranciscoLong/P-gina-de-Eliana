const test = require("node:test");
const assert = require("node:assert/strict");

const { createCancelToken, readCancelToken } = require("../lib/booking-links");

const ENV = { BOOKING_LINK_SECRET: "x".repeat(40) };
const BEFORE = { env: ENV, now: new Date("2026-10-06T12:00:00-03:00") };
const LINK = { eventId: "turno202610070930v0", start: "2026-10-07T09:30:00-03:00" };

test("un enlace firmado se lee de vuelta con su turno", () => {
  const token = createCancelToken(LINK, ENV);
  assert.deepEqual(readCancelToken(token, BEFORE), LINK);
});

test("no acepta enlaces modificados, de otra clave ni incompletos", () => {
  const token = createCancelToken(LINK, ENV);
  const [payload, signature] = token.split(".");
  const otherTurn = Buffer.from(JSON.stringify({ e: "turno202610071015v0", s: "2026-10-07T10:15:00-03:00" })).toString("base64url");
  assert.equal(readCancelToken(`${otherTurn}.${signature}`, BEFORE), null);
  assert.equal(readCancelToken(createCancelToken(LINK, { BOOKING_LINK_SECRET: "y".repeat(40) }), BEFORE), null);
  assert.equal(readCancelToken(payload, BEFORE), null);
  assert.equal(readCancelToken(`${token}.extra`, BEFORE), null);
  assert.equal(readCancelToken(undefined, BEFORE), null);
});

test("el enlace vence cuando empieza el turno", () => {
  const token = createCancelToken(LINK, ENV);
  assert.equal(readCancelToken(token, { env: ENV, now: new Date("2026-10-07T09:30:00-03:00") }), null);
});

test("sin una clave larga no firma ni lee enlaces", () => {
  assert.throws(() => createCancelToken(LINK, { BOOKING_LINK_SECRET: "corta" }), { code: "NOT_CONFIGURED" });
});
