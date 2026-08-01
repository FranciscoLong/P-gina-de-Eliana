const test = require("node:test");
const assert = require("node:assert/strict");

const { bookingEnabled, originAllowed, verifyTurnstile } = require("../api/_security");

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test("la agenda sólo puede habilitarse en Preview", () => {
  const previousEnabled = process.env.BOOKING_ENABLED;
  const previousEnvironment = process.env.VERCEL_ENV;
  process.env.BOOKING_ENABLED = "true";
  process.env.VERCEL_ENV = "production";
  assert.equal(bookingEnabled(), false);
  process.env.VERCEL_ENV = "preview";
  assert.equal(bookingEnabled(), true);
  restoreEnv("BOOKING_ENABLED", previousEnabled);
  restoreEnv("VERCEL_ENV", previousEnvironment);
});

test("la validación de origen falla cerrada y admite el host configurado", () => {
  const previous = process.env.BOOKING_ALLOWED_ORIGINS;
  delete process.env.BOOKING_ALLOWED_ORIGINS;
  assert.equal(originAllowed({ headers: { host: "www.escribaniaisbarbo.com.uy" } }), false);
  process.env.BOOKING_ALLOWED_ORIGINS = "https://www.escribaniaisbarbo.com.uy";
  assert.equal(originAllowed({ headers: { origin: "https://evil.example" } }), false);
  assert.equal(originAllowed({ headers: { host: "www.escribaniaisbarbo.com.uy" } }), true);
  if (previous === undefined) delete process.env.BOOKING_ALLOWED_ORIGINS;
  else process.env.BOOKING_ALLOWED_ORIGINS = previous;
});

test("Preview acepta únicamente los dominios exactos declarados por Vercel", () => {
  const names = ["BOOKING_ALLOWED_ORIGINS", "VERCEL_ENV", "VERCEL_URL", "VERCEL_BRANCH_URL"];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  delete process.env.BOOKING_ALLOWED_ORIGINS;
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_URL = "eliana-abc123.vercel.app";
  process.env.VERCEL_BRANCH_URL = "eliana-git-reservas.vercel.app";

  assert.equal(originAllowed({ headers: { origin: "https://eliana-abc123.vercel.app" } }), true);
  assert.equal(originAllowed({ headers: { origin: "https://eliana-git-reservas.vercel.app" } }), true);
  assert.equal(originAllowed({ headers: { origin: "https://otro-proyecto.vercel.app" } }), false);

  names.forEach((name) => restoreEnv(name, previous[name]));
});

test("Turnstile exige éxito, acción y hostname esperados", async () => {
  const previousSecret = process.env.TURNSTILE_SECRET_KEY;
  const previousOrigins = process.env.BOOKING_ALLOWED_ORIGINS;
  const previousTestMode = process.env.TURNSTILE_TEST_MODE;
  const previousFetch = global.fetch;
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  process.env.BOOKING_ALLOWED_ORIGINS = "https://www.escribaniaisbarbo.com.uy";
  delete process.env.TURNSTILE_TEST_MODE;

  global.fetch = async () => ({
    json: async () => ({
      success: true,
      action: "booking",
      hostname: "www.escribaniaisbarbo.com.uy"
    })
  });
  assert.equal(await verifyTurnstile("token", "127.0.0.1"), true);

  global.fetch = async () => ({
    json: async () => ({ success: true, action: "other", hostname: "evil.example" })
  });
  assert.equal(await verifyTurnstile("token", "127.0.0.1"), false);

  global.fetch = previousFetch;
  if (previousSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = previousSecret;
  if (previousOrigins === undefined) delete process.env.BOOKING_ALLOWED_ORIGINS;
  else process.env.BOOKING_ALLOWED_ORIGINS = previousOrigins;
  restoreEnv("TURNSTILE_TEST_MODE", previousTestMode);
});

test("las credenciales de prueba de Turnstile sólo se aceptan en Preview", async () => {
  const names = ["TURNSTILE_SECRET_KEY", "TURNSTILE_TEST_MODE", "VERCEL_ENV"];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const previousFetch = global.fetch;
  process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
  process.env.TURNSTILE_TEST_MODE = "true";
  global.fetch = async () => ({
    json: async () => ({
      success: true,
      hostname: "example.com",
      metadata: { result_with_testing_key: true }
    })
  });

  process.env.VERCEL_ENV = "production";
  assert.equal(await verifyTurnstile("XXXX.DUMMY.TOKEN.XXXX", "127.0.0.1"), false);
  process.env.VERCEL_ENV = "preview";
  assert.equal(await verifyTurnstile("XXXX.DUMMY.TOKEN.XXXX", "127.0.0.1"), true);

  global.fetch = previousFetch;
  names.forEach((name) => restoreEnv(name, previous[name]));
});
