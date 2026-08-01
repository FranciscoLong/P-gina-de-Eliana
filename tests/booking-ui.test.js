const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
const main = fs.readFileSync(require.resolve("../assets/main.js"), "utf8");
const styles = fs.readFileSync(require.resolve("../assets/styles.css"), "utf8");

test("la agenda está visiblemente desactivada con disabled real y explicación accesible", () => {
  const calendarChoice = html.match(/<button[\s\S]*?id="calendarChoice"[\s\S]*?<\/button>/)[0];
  assert.match(calendarChoice, /\sdisabled(?:\s|>)/);
  assert.match(calendarChoice, /aria-describedby="bookingCalendarUnavailable"/);
  assert.match(calendarChoice, /Temporalmente no disponible/);
  assert.match(html, /id="bookingCalendarUnavailable"/);
});

test("Elegir cómo reservar y WhatsApp siguen activos y preservan el trámite", () => {
  assert.match(html, /data-booking-open>[\s\S]*?Elegir cómo reservar/);
  assert.doesNotMatch(html, /data-booking-open[^>]*disabled/);
  assert.doesNotMatch(html.match(/<button class="booking-channel booking-channel-whatsapp"[\s\S]*?<\/button>/)[0], /disabled/);
  assert.match(main, /buildWhatsAppMessage\(selectedService\)/);
  assert.match(main, /link\.dataset\.service/);
  assert.match(main, /"Consulta notarial"/);
});

test("el fallback de WhatsApp tiene contraste y foco específicos sin cambiar btn-secondary global", () => {
  assert.match(styles, /\.booking-fallback-whatsapp\s*\{[\s\S]*?color:\s*var\(--green-950\)/);
  assert.match(styles, /\.booking-fallback-whatsapp:hover/);
  assert.match(styles, /\.booking-fallback-whatsapp:focus-visible/);
  assert.match(styles, /\.btn-secondary\s*\{[\s\S]*?color:\s*var\(--white\)/);
});
