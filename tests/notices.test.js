const test = require("node:test");
const assert = require("node:assert/strict");
const { uruguayDay, activeNotices, safeHref, richTextParts } = require("../assets/notices.js");

const notice = { active: true, title: "Horario especial", paragraphs: ["Solo con reserva."] };

test("la vigencia incluye ambos días y omite futuros, vencidos e inactivos", () => {
  const entries = [
    { ...notice, id: "sin-limites" },
    { ...notice, id: "hoy", startsOn: "2026-12-01", endsOn: "2026-12-01" },
    { ...notice, id: "futuro", startsOn: "2026-12-02" },
    { ...notice, id: "vencido", endsOn: "2026-11-30" },
    { ...notice, id: "inactivo", active: false }
  ];
  assert.deepEqual(activeNotices(entries, "2026-12-01").map((entry) => entry.id), ["sin-limites", "hoy"]);
  assert.deepEqual(activeNotices([], "2026-12-01"), []);
});

test("usa la fecha de Uruguay aunque en UTC ya sea el día siguiente", () => {
  assert.equal(uruguayDay(new Date("2026-12-02T02:59:59Z")), "2026-12-01");
  assert.equal(uruguayDay(new Date("2026-12-02T03:00:00Z")), "2026-12-02");
});

test("contenido incompleto y fechas imposibles no se publican", () => {
  const entries = [null, { ...notice, startsOn: "2026-02-30" },
    { ...notice, endsOn: "mañana" }, { ...notice, title: " " },
    { ...notice, paragraphs: [] }, { ...notice, startsOn: "2026-12-03", endsOn: "2026-12-01" }];
  assert.deepEqual(activeNotices(entries, "2026-12-02"), []);
  assert.deepEqual(activeNotices(undefined), []);
});

test("los enlaces admiten rutas locales y HTTPS, sin protocolos ejecutables", () => {
  assert.equal(safeHref("/reservar"), "/reservar");
  assert.equal(safeHref("#contactar"), "#contactar");
  assert.equal(safeHref("https://example.com/aviso"), "https://example.com/aviso");
  for (const href of ["javascript:alert(1)", "//example.com", "/\\example.com", "https://user:secret@example.com", undefined]) {
    assert.equal(safeHref(href), null);
  }
});

test("**texto** marca la negrita y lo demás queda como texto común", () => {
  assert.deepEqual(richTextParts("De lunes a viernes, de **9:30 a 12:30**, con turno."), [
    { text: "De lunes a viernes, de ", strong: false },
    { text: "9:30 a 12:30", strong: true },
    { text: ", con turno.", strong: false }
  ]);
  assert.deepEqual(richTextParts("**Cerrado**"), [{ text: "Cerrado", strong: true }]);
  assert.deepEqual(richTextParts("Sin marcas ** sueltas"), [{ text: "Sin marcas ** sueltas", strong: false }]);
});
