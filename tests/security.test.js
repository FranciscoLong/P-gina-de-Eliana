const test = require("node:test");
const assert = require("node:assert/strict");

const { originAllowed, verifyTurnstile } = require("../api/_security");

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

test("Turnstile exige éxito, acción y hostname esperados", async () => {
  const previousSecret = process.env.TURNSTILE_SECRET_KEY;
  const previousOrigins = process.env.BOOKING_ALLOWED_ORIGINS;
  const previousFetch = global.fetch;
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  process.env.BOOKING_ALLOWED_ORIGINS = "https://www.escribaniaisbarbo.com.uy";

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
});
