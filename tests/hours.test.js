const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  SITE_HOURS,
  periodFor,
  sentence,
  rangeText,
  openingHours,
  updateStructuredData
} = require("../assets/hours.js");
const { SCHEDULES } = require("../api/_lib/booking.js");

test("la agenda toma sus tramos de assets/hours.js, la única fuente", () => {
  assert.deepEqual(
    SCHEDULES.map(({ from, windows, withGap }) => ({ from, windows, withGap })),
    SITE_HOURS.map(({ from, windows, withGap }) => ({ from, windows, withGap }))
  );
  for (const period of SITE_HOURS) assert.equal(typeof period.withGap, "boolean", period.from);
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

test("los datos para Google llevan el horario del día: desde diciembre abre a las 9:00", () => {
  assert.deepEqual(
    openingHours(periodFor("2026-12-01").windows).map(({ opens, closes }) => [opens, closes]),
    [["09:00", "12:30"], ["15:00", "19:00"]]
  );
  assert.deepEqual(
    openingHours(periodFor("2026-11-10").windows).map(({ opens, closes }) => [opens, closes]),
    [["15:00", "19:00"]]
  );
});

test("se reescribe el horario de los datos estructurados de index.html, y nada más", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const scripts = blocks.map(([, text]) => ({ textContent: text }));
  const doc = { querySelectorAll: () => scripts };
  const before = scripts.map((script) => JSON.parse(script.textContent));
  updateStructuredData(doc, periodFor("2026-12-01").windows);
  const after = scripts.map((script) => JSON.parse(script.textContent));
  const withHours = after.filter((data) => "openingHoursSpecification" in data);
  assert.equal(withHours.length, 1);
  assert.equal(withHours[0].openingHoursSpecification[0].opens, "09:00");
  const { openingHoursSpecification: _, ...restAfter } = withHours[0];
  const { openingHoursSpecification: __, ...restBefore } = before[after.indexOf(withHours[0])];
  assert.deepEqual(restAfter, restBefore);
  assert.deepEqual(after.filter((data) => !("openingHoursSpecification" in data)), before.filter((data) => !("openingHoursSpecification" in data)));
});
