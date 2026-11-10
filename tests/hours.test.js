const test = require("node:test");
const assert = require("node:assert/strict");
const { SITE_HOURS, periodFor, sentence, rangeText } = require("../assets/hours.js");
const { SCHEDULES } = require("../api/_lib/booking.js");

test("el horario de la página es el mismo que el de la agenda, tramo por tramo", () => {
  assert.deepEqual(
    SITE_HOURS.map(({ from, windows }) => ({ from, windows })),
    SCHEDULES.map(({ from, windows }) => ({ from, windows }))
  );
});

test("cada tramo rige desde su día hasta que empieza el siguiente", () => {
  const windows = (ymd) => periodFor(ymd).windows;
  assert.deepEqual(windows("2026-11-01"), [["09:30", "12:30"], ["15:00", "19:00"]]);
  assert.deepEqual(windows("2026-11-02"), [["15:00", "19:00"]]);
  assert.deepEqual(windows("2026-11-23"), [["15:00", "19:00"]]);
  assert.deepEqual(windows("2026-11-24"), [["09:30", "12:30"], ["15:00", "19:00"]]);
  assert.deepEqual(windows("2026-12-01"), [["09:00", "12:30"], ["15:00", "19:00"]]);
});

test("los textos de la franja y de «Dónde encontrarme» llevan «hs»", () => {
  const usual = periodFor("2026-11-24");
  assert.equal(sentence(usual, "topbar"), "Lunes a viernes de 9:30 a 12:30 hs y de 15:00 a 19:00 hs");
  assert.equal(sentence(usual, "location"), "Lunes a viernes, de 9:30 a 12:30 hs y de 15:00 a 19:00 hs.");
  assert.equal(sentence(periodFor("2026-11-10"), "topbar"), "Lunes a viernes de 15:00 a 19:00 hs");
  assert.equal(rangeText("15:00", "19:00"), "15:00 a 19:00 hs");
});

test("desde el 1 de diciembre la mañana es solo con agenda y la tarde, atención normal", () => {
  const december = periodFor("2026-12-01");
  assert.equal(
    sentence(december, "topbar"),
    "Lunes a viernes de 9:00 a 12:30 hs (solo con agenda) y de 15:00 a 19:00 hs (atención normal)"
  );
  assert.equal(
    sentence(december, "location"),
    "Lunes a viernes, de 9:00 a 12:30 hs (solo con agenda) y de 15:00 a 19:00 hs (atención normal)."
  );
  assert.equal(rangeText("09:00", "12:30", "solo con agenda"), "9:00 a 12:30 hs (solo con agenda)");
  assert.equal(periodFor("2026-11-24").notes, undefined);
});
