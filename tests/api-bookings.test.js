const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const { bookableDays, readRules } = require("../api/_lib/booking");

/*
  Reloj congelado: un lunes a las 8:00 de Montevideo, antes de que abra la
  agenda. Con 24 horas de anticipación el primer día con turnos es el martes,
  entero desde las 9:30. Así las pruebas y los handlers ven siempre la misma
  hora: con el reloj real fallaban según el momento en que se corrían.
*/
const MONDAY_8AM = Date.parse("2026-10-12T08:00:00-03:00");

const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const BASE_ENV = {
  BOOKING_ENABLED: "true",
  BOOKING_CALENDAR_ID: "esc.isbarbo@gmail.com",
  BOOKING_ALLOWED_ORIGINS: "https://www.escribaniaisbarbo.com.uy",
  BOOKING_EMAIL_FROM: "Turnos <turnos@escribaniaisbarbo.com.uy>",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: "turnos-web@proyecto.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" })
  }),
  RESEND_API_KEY: "re_test",
  TURNSTILE_SECRET_KEY: "secreto",
  TURNSTILE_SITE_KEY: "0x4AAAAAAAAAAAAAAAAAAAAA",
  VERCEL_ENV: "production"
};
const ORIGIN = "https://www.escribaniaisbarbo.com.uy";

/*
  Todas las salidas a la red pasan por este fetch falso. Cada prueba arma su
  escenario en `network` y después revisa qué se pidió.
*/
const network = { requests: [], busy: [], events: new Map(), allDay: [], turnstile: true, resendStatus: 200, googleDown: false };

function idFrom(url) {
  return decodeURIComponent(String(url).split("?")[0].split("/").pop());
}

function sentEmails() {
  return network.requests.filter((request) => request.url === "https://api.resend.com/emails");
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

globalThis.fetch = async (url, init = {}) => {
  network.requests.push({ url: String(url), init });
  if (url === "https://oauth2.googleapis.com/token") {
    return jsonResponse(200, { access_token: "token", expires_in: 3600 });
  }
  if (String(url).startsWith("https://challenges.cloudflare.com")) {
    return jsonResponse(200, network.turnstile
      ? { success: true, action: "booking", hostname: "www.escribaniaisbarbo.com.uy" }
      : { success: false });
  }
  if (url === "https://api.resend.com/emails") {
    return jsonResponse(network.resendStatus, { id: "email" });
  }
  if (network.googleDown) {
    return jsonResponse(500, { error: { status: "INTERNAL" } });
  }
  if (String(url).endsWith("/freeBusy")) {
    const body = JSON.parse(init.body);
    return jsonResponse(200, {
      calendars: Object.fromEntries(body.items.map(({ id }) => [id, { busy: network.busy }]))
    });
  }
  if (init.method === "DELETE") {
    const existing = network.events.get(idFrom(url));
    if (!existing) return jsonResponse(404, {});
    network.events.set(existing.id, { ...existing, status: "cancelled" });
    return new Response(null, { status: 204 });
  }
  if (init.method === "POST") {
    const event = JSON.parse(init.body);
    if (network.events.has(event.id)) return jsonResponse(409, { error: { errors: [{ reason: "duplicate" }] } });
    const created = { ...event, status: "confirmed", htmlLink: "https://calendar.google.com/event?eid=x" };
    network.events.set(event.id, created);
    return jsonResponse(200, created);
  }
  if (/\/events\?/.test(String(url))) {
    const active = [...network.events.values()].filter((event) => event.status !== "cancelled");
    return jsonResponse(200, { items: active.concat(network.allDay) });
  }
  const id = idFrom(url);
  return network.events.has(id) ? jsonResponse(200, network.events.get(id)) : jsonResponse(404, {});
};

const availability = require("../api/availability");
const cancelTurn = require("../api/anular-turno");
const bookings = require("../api/bookings");
const bookingConfig = require("../api/booking-config");

function call(handler, { method = "GET", body, origin = ORIGIN, query = {} } = {}) {
  return new Promise((resolve) => {
    const res = {
      headers: {},
      statusCode: 200,
      setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
      status(code) { this.statusCode = code; return this; },
      done(payload = "") { resolve({ status: this.statusCode, body: payload, headers: this.headers }); },
      json(payload) { this.done(payload); },
      send(payload) { this.done(payload); },
      end() { this.done(); }
    };
    Promise.resolve(handler({ method, headers: origin ? { origin } : {}, body, query }, res));
  });
}

function firstSlot() {
  return bookableDays(new Date(), readRules({}))[0].slots[0];
}

function bookingBody(overrides = {}) {
  return {
    service: "Sucesiones",
    start: firstSlot().start,
    name: "Ana Pérez",
    email: "ana@example.com",
    phone: "099 123 456",
    details: "Hola Eliana, quisiera consultar por una sucesión.",
    consent: true,
    turnstileToken: "token-turnstile",
    idempotencyKey: crypto.randomBytes(12).toString("hex"),
    ...overrides
  };
}

// Con t.mock, node:test descongela el reloj solo al terminar cada prueba.
test.beforeEach((t) => {
  t.mock.timers.enable({ apis: ["Date"], now: MONDAY_8AM });
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("BOOKING_") || key.startsWith("TURNSTILE_") || key === "VERCEL_ENV") delete process.env[key];
  }
  Object.assign(process.env, BASE_ENV);
  Object.assign(network, { requests: [], busy: [], events: new Map(), allDay: [], turnstile: true, resendStatus: 200, googleDown: false });
});

test("con el interruptor apagado no se toca Google y la configuración dice que no hay agenda", async () => {
  process.env.BOOKING_ENABLED = "false";
  assert.equal((await call(availability)).status, 503);
  assert.equal((await call(bookings, { method: "POST", body: bookingBody() })).status, 503);
  assert.deepEqual((await call(bookingConfig)).body, { enabled: false, turnstileSiteKey: "" });
  assert.equal(network.requests.length, 0);
});

test("si falta una credencial la agenda queda apagada aunque el interruptor esté prendido", async () => {
  delete process.env.RESEND_API_KEY;
  assert.equal((await call(bookingConfig)).body.enabled, false);
  assert.equal((await call(availability)).status, 503);
});

test("la disponibilidad marca ocupados sin revelar qué los ocupa", async () => {
  const slot = firstSlot();
  network.busy = [{ start: slot.start, end: slot.end }];
  const response = await call(availability);
  assert.equal(response.status, 200);
  assert.equal(response.headers["cache-control"], "public, max-age=0, s-maxage=10");
  const first = response.body.days[0].slots[0];
  assert.deepEqual(Object.keys(first).sort(), ["end", "start", "status"]);
  assert.equal(first.status, "unavailable");
  assert.equal(response.body.days[0].slots[1].status, "available");
});

test("los errores de disponibilidad no quedan guardados en la CDN", async () => {
  network.googleDown = true;
  const response = await call(availability);
  assert.equal(response.status, 503);
  assert.equal(response.headers["cache-control"], "private, no-store, max-age=0");
});

test("rechaza pedidos desde otro origen", async () => {
  assert.equal((await call(availability, { origin: "https://otro.example" })).status, 403);
  assert.equal((await call(bookings, { method: "POST", body: bookingBody(), origin: "https://otro.example" })).status, 403);
});

test("confirma el turno, crea el evento y manda los dos correos una sola vez", async () => {
  const body = bookingBody();
  const response = await call(bookings, { method: "POST", body });
  assert.equal(response.status, 201);
  assert.equal(response.body.status, "confirmed");
  assert.equal(response.body.emailSent, true);
  assert.equal(network.events.size, 1);

  const emails = sentEmails();
  assert.equal(emails.length, 2);
  const [client, office] = emails.map((request) => JSON.parse(request.init.body));
  assert.deepEqual(client.to, ["ana@example.com"]);
  assert.equal(client.reply_to, "esc.isbarbo@gmail.com");
  assert.deepEqual(office.to, ["esc.isbarbo@gmail.com"]);
  assert.equal(office.reply_to, "ana@example.com");
  assert.equal(emails[0].init.headers["idempotency-key"], `${body.idempotencyKey}-cliente`);
  assert.equal(client.attachments[0].filename, "turno.ics");
  assert.equal(office.attachments, undefined);

  const retry = await call(bookings, { method: "POST", body });
  assert.equal(retry.status, 200);
  assert.equal(network.events.size, 1);
  assert.equal(sentEmails().length, 2);
});

test("sin Turnstile válido no se consulta el calendario", async () => {
  network.turnstile = false;
  const response = await call(bookings, { method: "POST", body: bookingBody() });
  assert.equal(response.status, 403);
  assert.equal(network.requests.some((request) => request.url.includes("googleapis")), false);
});

test("un horario recién ocupado responde 409", async () => {
  await call(bookings, { method: "POST", body: bookingBody() });
  const second = await call(bookings, { method: "POST", body: bookingBody({ email: "otra@example.com" }) });
  assert.equal(second.status, 409);
  assert.equal(network.events.size, 1);
});

test("si el correo falla el turno sigue confirmado y la respuesta lo avisa", async () => {
  network.resendStatus = 500;
  const response = await call(bookings, { method: "POST", body: bookingBody() });
  assert.equal(response.status, 201);
  assert.equal(response.body.emailSent, false);
  assert.equal(network.events.size, 1);
});

test("si Google falla no se confirma nada", async () => {
  network.googleDown = true;
  const response = await call(bookings, { method: "POST", body: bookingBody() });
  assert.equal(response.status, 503);
  assert.equal(sentEmails().length, 0);
});

test("datos inválidos responden 400 con el detalle por campo y sin tocar la red", async () => {
  const response = await call(bookings, { method: "POST", body: bookingBody({ email: "no-es-correo", consent: false }) });
  assert.equal(response.status, 400);
  assert.deepEqual(Object.keys(response.body.fields).sort(), ["consent", "email"]);
  assert.equal(network.requests.length, 0);
});

test("una anticipación mal configurada apaga las reservas", async () => {
  process.env.BOOKING_MIN_NOTICE_HOURS = "dos días";
  assert.equal((await call(bookings, { method: "POST", body: bookingBody() })).status, 503);
  assert.equal((await call(availability)).status, 503);
});

test("un día marcado con un evento de todo el día aparece entero como no disponible", async () => {
  const date = firstSlot().start.slice(0, 10);
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  network.allDay = [{
    id: "ausencia",
    status: "confirmed",
    transparency: "transparent",
    start: { date },
    end: { date: next.toISOString().slice(0, 10) }
  }];
  const response = await call(availability);
  const day = response.body.days.find((entry) => entry.date === date);
  assert.ok(day.slots.every((slot) => slot.status === "unavailable"));
  assert.equal((await call(bookings, { method: "POST", body: bookingBody() })).status, 409);
});

function cancelLinkFromEmail() {
  const email = sentEmails()[0];
  const text = JSON.parse(email.init.body).text;
  const url = text.match(/https:\/\/\S+\/api\/anular-turno\?t=(\S+)/);
  return url[1];
}

test("el correo al cliente trae el enlace para anular, del mismo sitio donde reservó", async () => {
  await call(bookings, { method: "POST", body: bookingBody() });
  const email = sentEmails()[0];
  assert.match(JSON.parse(email.init.body).text, /https:\/\/www\.escribaniaisbarbo\.com\.uy\/api\/anular-turno\?t=/);
});

test("abrir el enlace no anula: solo muestra el turno y el botón", async () => {
  await call(bookings, { method: "POST", body: bookingBody() });
  const token = cancelLinkFromEmail();
  const response = await call(cancelTurn, { query: { t: token }, origin: null });
  assert.equal(response.status, 200);
  assert.match(response.body, /¿Anular este turno\?/);
  assert.match(response.body, /Sí, anular el turno/);
  assert.equal([...network.events.values()][0].status, "confirmed");
});

test("confirmar la anulación borra el evento, libera el horario y avisa a Eliana", async () => {
  const body = bookingBody();
  await call(bookings, { method: "POST", body });
  const token = cancelLinkFromEmail();
  const response = await call(cancelTurn, { method: "POST", body: { t: token } });
  assert.equal(response.status, 200);
  assert.match(response.body, /Turno anulado/);
  assert.equal([...network.events.values()][0].status, "cancelled");

  const notice = sentEmails().at(-1);
  assert.match(JSON.parse(notice.init.body).subject, /^Turno anulado: /);

  // El horario se puede volver a reservar.
  const again = await call(bookings, { method: "POST", body: bookingBody({ email: "otra@example.com" }) });
  assert.equal(again.status, 201);
});

test("un enlace alterado o de un turno ya anulado no anula nada", async () => {
  await call(bookings, { method: "POST", body: bookingBody() });
  const token = cancelLinkFromEmail();
  const tampered = `${token.slice(0, -2)}xx`;
  assert.equal((await call(cancelTurn, { method: "POST", body: { t: tampered } })).status, 400);

  await call(cancelTurn, { method: "POST", body: { t: token } });
  const second = await call(cancelTurn, { method: "POST", body: { t: token } });
  assert.equal(second.status, 410);
  assert.match(second.body, /ya no está activo/);
});

test("la anulación con el formulario exige venir del mismo sitio", async () => {
  await call(bookings, { method: "POST", body: bookingBody() });
  const token = cancelLinkFromEmail();
  const response = await call(cancelTurn, { method: "POST", body: { t: token }, origin: "https://otro.example" });
  assert.equal(response.status, 400);
  assert.equal([...network.events.values()][0].status, "confirmed");
});
