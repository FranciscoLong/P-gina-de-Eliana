const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  SITE_HOURS,
  periodFor,
  sentence,
  rangeText,
  openingHours
} = require("../assets/hours.js");
const { SCHEDULES } = require("../api/_lib/booking.js");

test("la agenda toma sus tramos de assets/hours.js, la única fuente", () => {
  // Que los valores coincidan no alcanza: tiene que leerlos de ahí y no tener una copia propia.
  const source = fs.readFileSync(path.join(__dirname, "..", "api", "_lib", "booking.js"), "utf8");
  assert.match(source, /require\("\.\.\/\.\.\/assets\/hours\.js"\)/);
  assert.doesNotMatch(source, /\["\d{2}:\d{2}", "\d{2}:\d{2}"\]/, "booking.js tiene horarios escritos");
  assert.deepEqual(
    SCHEDULES.map(({ from, windows, withGap }) => ({ from, windows, withGap })),
    SITE_HOURS.map(({ from, windows, withGap }) => ({ from, windows, withGap }))
  );
  for (const period of SITE_HOURS) assert.equal(typeof period.withGap, "boolean", period.from);
});

test("los tramos de la agenda no cambian aunque se toque SITE_HOURS", () => {
  assert.ok(Object.isFrozen(SCHEDULES[0].windows) && Object.isFrozen(SCHEDULES[0].windows[0]));
  assert.notEqual(SCHEDULES[0].windows, SITE_HOURS[0].windows);
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

test("los datos para Google dicen cada tramo con su vigencia: desde diciembre abre a las 9:00", () => {
  const specs = openingHours();
  const december = specs.filter((spec) => spec.validFrom === "2026-12-01");
  assert.deepEqual(december.map(({ opens, closes }) => [opens, closes]), [["09:00", "12:30"], ["15:00", "19:00"]]);
  assert.ok(december.every((spec) => !("validThrough" in spec)));
  const closure = specs.filter((spec) => spec.validFrom === "2026-11-02");
  assert.deepEqual(closure.map(({ opens, closes, validThrough }) => [opens, closes, validThrough]), [["15:00", "19:00", "2026-11-23"]]);
  assert.ok(specs.filter((spec) => !("validFrom" in spec)).every((spec) => spec.validThrough === "2026-11-01"));
});

test("los datos estructurados de index.html son los de assets/hours.js", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const data = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(([, text]) => JSON.parse(text))
    .filter((block) => "openingHoursSpecification" in block);
  assert.equal(data.length, 1);
  const expected = openingHours();
  assert.deepEqual(
    data[0].openingHoursSpecification,
    expected,
    `El horario de los datos estructurados no coincide con assets/hours.js. Pegá esto en index.html:\n"openingHoursSpecification": ${JSON.stringify(expected, null, 2)}`
  );
});

/*
  Traídas del PR #21. El aviso (notices-data.js) y el horario escrito en
  index.html para quien no tiene JavaScript son texto a mano: que no nombren
  una hora que la agenda no tiene.
*/
const allowedTimes = new Set(
  SITE_HOURS.flatMap(({ windows }) => windows.flat()).map((hhmm) => hhmm.replace(/^0/, ""))
);

test("el aviso solo nombra horas de apertura o cierre de la agenda", () => {
  const notices = fs.readFileSync(path.join(__dirname, "..", "assets", "notices-data.js"), "utf8");
  for (const [time] of notices.matchAll(/\b\d{1,2}:\d{2}\b/g)) {
    assert.ok(allowedTimes.has(time), `el aviso dice ${time}`);
  }
});

test("el horario escrito en index.html es el de algún tramo, con su formato", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const plain = (text) => text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const topbar = plain(html.match(/<span data-hours="topbar">([\s\S]*?)<\/span>/)[1]);
  const location = plain(html.match(/<li data-hours="location">\s*<span>Horario<\/span>([\s\S]*?)<\/li>/)[1]);
  const list = [...html.match(/<ul data-hours="list">([\s\S]*?)<\/ul>/)[1].matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map(([, text]) => plain(text));
  assert.ok(
    SITE_HOURS.some((period) =>
      topbar === sentence(period, "topbar") &&
      location === sentence(period, "location") &&
      JSON.stringify(list) === JSON.stringify(period.windows.map(([from, to], index) => rangeText(from, to, period.notes?.[index])))
    ),
    `franja: ${topbar} | Dónde encontrarme: ${location} | pie: ${list.join(" / ")}`
  );
});
