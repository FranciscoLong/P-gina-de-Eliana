const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const BASE_ENV = {
  BOOKING_ALLOWED_ORIGINS: "https://www.escribaniaisbarbo.com.uy",
  BOOKING_EMAIL_FROM: "Turnos <turnos@escribaniaisbarbo.com.uy>",
  RESEND_API_KEY: "re_test",
  TURNSTILE_SECRET_KEY: "secreto",
  TURNSTILE_SITE_KEY: "0x4AAAAAAAAAAAAAAAAAAAAA",
  VERCEL_ENV: "production"
};
const ORIGIN = "https://www.escribaniaisbarbo.com.uy";

// Todas las salidas a la red pasan por este fetch falso.
const network = { requests: [], turnstileAction: "consulta", turnstile: true, resendStatus: 200 };

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

globalThis.fetch = async (url, init = {}) => {
  network.requests.push({ url: String(url), init });
  if (String(url).startsWith("https://challenges.cloudflare.com")) {
    return jsonResponse(200, network.turnstile
      ? { success: true, action: network.turnstileAction, hostname: "www.escribaniaisbarbo.com.uy" }
      : { success: false });
  }
  if (url === "https://api.resend.com/emails") {
    return jsonResponse(network.resendStatus, { id: "email" });
  }
  return jsonResponse(404, {});
};

const consultas = require("../api/consultas");
const bookingConfig = require("../api/booking-config");

function call(handler, { method = "POST", body, origin = ORIGIN } = {}) {
  return new Promise((resolve) => {
    const res = {
      headers: {},
      statusCode: 200,
      setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload }); }
    };
    Promise.resolve(handler({ method, headers: origin ? { origin } : {}, body, query: {} }, res));
  });
}

function contactBody(overrides = {}) {
  return {
    service: "Sucesiones",
    name: "Ana Pérez",
    email: "Ana@Example.com",
    message: "Hola Eliana, quisiera consultar por la sucesión de mi padre.",
    turnstileToken: "token-turnstile",
    idempotencyKey: crypto.randomBytes(12).toString("hex"),
    ...overrides
  };
}

function sentEmails() {
  return network.requests
    .filter((request) => request.url === "https://api.resend.com/emails")
    .map((request) => ({ ...JSON.parse(request.init.body), key: request.init.headers["idempotency-key"] }));
}

test.beforeEach(() => {
  for (const key of Object.keys(process.env)) {
    if (/^(BOOKING_|TURNSTILE_|CONTACT_|RESEND_)/.test(key) || key === "VERCEL_ENV") delete process.env[key];
  }
  Object.assign(process.env, BASE_ENV);
  Object.assign(network, { requests: [], turnstileAction: "consulta", turnstile: true, resendStatus: 200 });
});

test("la consulta le llega a Eliana con «Responder a» = el correo de la persona", async () => {
  const response = await call(consultas, { body: contactBody() });
  assert.equal(response.status, 201);
  assert.deepEqual(response.body, { status: "sent", email: "ana@example.com" });

  const [email] = sentEmails();
  assert.equal(sentEmails().length, 1, "un solo correo: a la persona no se le manda copia");
  assert.deepEqual(email.to, ["esc.isbarbo@gmail.com"]);
  assert.equal(email.reply_to, "ana@example.com");
  assert.equal(email.subject, "Consulta desde la página: Sucesiones · Ana Pérez");
  assert.match(email.text, /quisiera consultar por la sucesión de mi padre/);
  assert.match(email.key, /^consulta-/);
});

test("sin trámite elegido, el asunto dice «Consulta notarial»", async () => {
  await call(consultas, { body: contactBody({ service: "" }) });
  assert.equal(sentEmails()[0].subject, "Consulta desde la página: Consulta notarial · Ana Pérez");
});

test("la consulta admite 2000 caracteres y rechaza 2001 sin mandar nada", async () => {
  assert.equal((await call(consultas, { body: contactBody({ message: "a".repeat(2000) }) })).status, 201);
  network.requests = [];
  const tooLong = await call(consultas, { body: contactBody({ message: "a".repeat(2001) }) });
  assert.equal(tooLong.status, 400);
  assert.match(tooLong.body.fields.message, /2000 caracteres/);
  assert.equal(network.requests.length, 0);
});

test("datos inválidos responden 400 por campo, sin tocar la red", async () => {
  const response = await call(consultas, {
    body: contactBody({ name: "A", email: "ana@", message: "  ", service: "Cualquier cosa" })
  });
  assert.equal(response.status, 400);
  assert.deepEqual(Object.keys(response.body.fields).sort(), ["email", "message", "name", "service"]);
  assert.equal(network.requests.length, 0);
});

test("sin Turnstile válido, o con un token de la agenda, no se manda nada", async () => {
  network.turnstile = false;
  assert.equal((await call(consultas, { body: contactBody() })).status, 403);
  network.turnstile = true;
  network.turnstileAction = "booking";
  assert.equal((await call(consultas, { body: contactBody() })).status, 403);
  assert.equal(sentEmails().length, 0);
});

test("rechaza pedidos desde otro origen y métodos que no son POST", async () => {
  assert.equal((await call(consultas, { body: contactBody(), origin: "https://otro.example" })).status, 403);
  assert.equal((await call(consultas, { method: "GET" })).status, 405);
  assert.equal(network.requests.length, 0);
});

test("si Resend falla, la respuesta lo dice para ofrecer WhatsApp", async () => {
  network.resendStatus = 500;
  assert.equal((await call(consultas, { body: contactBody() })).status, 502);
});

test("CONTACT_FORM_ENABLED=false o una credencial que falta lo apagan", async () => {
  process.env.CONTACT_FORM_ENABLED = "false";
  assert.equal((await call(consultas, { body: contactBody() })).status, 503);
  assert.equal((await call(bookingConfig, { method: "GET" })).body.contactEnabled, false);
  delete process.env.CONTACT_FORM_ENABLED;
  delete process.env.RESEND_API_KEY;
  assert.equal((await call(consultas, { body: contactBody() })).status, 503);
  assert.deepEqual((await call(bookingConfig, { method: "GET" })).body, {
    enabled: false,
    contactEnabled: false,
    turnstileSiteKey: ""
  });
  assert.equal(network.requests.length, 0);
});
