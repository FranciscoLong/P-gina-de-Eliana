const test = require("node:test");
const assert = require("node:assert/strict");

const availabilityHandler = require("../api/availability");
const bookingHandler = require("../api/bookings");

function responseRecorder() {
  return {
    statusCode: 0,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test("ambas APIs desactivan la agenda por defecto sin llamar servicios externos", async () => {
  const previousEnabled = process.env.BOOKING_ENABLED;
  const previousFetch = global.fetch;
  let fetchCalls = 0;
  delete process.env.BOOKING_ENABLED;
  global.fetch = async () => { fetchCalls += 1; throw new Error("unexpected fetch"); };

  const availabilityResponse = responseRecorder();
  await availabilityHandler({ method: "GET", headers: {}, query: {} }, availabilityResponse);
  const bookingResponse = responseRecorder();
  await bookingHandler({ method: "POST", headers: {}, body: {} }, bookingResponse);

  assert.equal(availabilityResponse.statusCode, 503);
  assert.equal(bookingResponse.statusCode, 503);
  assert.equal(availabilityResponse.body.error, "La agenda en línea está temporalmente no disponible.");
  assert.equal(bookingResponse.body.error, availabilityResponse.body.error);
  assert.equal(fetchCalls, 0);

  global.fetch = previousFetch;
  restoreEnv("BOOKING_ENABLED", previousEnabled);
});

test("el kill switch sólo habilita con el valor exacto true", async () => {
  const previousEnabled = process.env.BOOKING_ENABLED;
  process.env.BOOKING_ENABLED = "TRUE";
  const response = responseRecorder();
  await availabilityHandler({ method: "GET", headers: {}, query: {} }, response);
  assert.equal(response.statusCode, 503);
  restoreEnv("BOOKING_ENABLED", previousEnabled);
});

test("/api/bookings propaga el 429 de Apps Script", async () => {
  const names = [
    "BOOKING_ENABLED",
    "BOOKING_ALLOWED_ORIGINS",
    "TURNSTILE_SECRET_KEY",
    "APPS_SCRIPT_WEB_APP_URL",
    "APPS_SCRIPT_SHARED_SECRET"
  ];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const previousFetch = global.fetch;
  const previousConsoleError = console.error;
  process.env.BOOKING_ENABLED = "true";
  process.env.BOOKING_ALLOWED_ORIGINS = "https://www.escribaniaisbarbo.com.uy";
  process.env.TURNSTILE_SECRET_KEY = "turnstile-secret";
  process.env.APPS_SCRIPT_WEB_APP_URL = "https://script.example/exec";
  process.env.APPS_SCRIPT_SHARED_SECRET = "apps-script-secret";

  global.fetch = async (url) => {
    if (String(url).includes("turnstile")) {
      return {
        json: async () => ({
          success: true,
          action: "booking",
          hostname: "www.escribaniaisbarbo.com.uy"
        })
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: false, status: 429, message: "Demasiados intentos." })
    };
  };
  console.error = () => {};

  const response = responseRecorder();
  await bookingHandler({
    method: "POST",
    headers: {
      origin: "https://www.escribaniaisbarbo.com.uy",
      "x-forwarded-for": "203.0.113.10"
    },
    body: {
      serviceCode: "consulta-notarial",
      start: "2026-08-03T09:30:00-03:00",
      name: "Ana Pérez",
      email: "ana@example.com",
      phone: "099 123 456",
      details: "Consulta notarial general.",
      consent: true,
      turnstileToken: "token",
      idempotencyKey: "abcdefghijklmnop"
    }
  }, response);

  assert.equal(response.statusCode, 429);
  assert.equal(response.body.error, "Demasiados intentos.");

  global.fetch = previousFetch;
  console.error = previousConsoleError;
  names.forEach((name) => restoreEnv(name, previous[name]));
});
