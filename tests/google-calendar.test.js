const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const { createCalendarClient, signJwt } = require("../api/_lib/google-calendar");

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const PRIVATE_PEM = privateKey.export({ type: "pkcs8", format: "pem" });
const ENV = {
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    client_email: "turnos-web@proyecto.iam.gserviceaccount.com",
    private_key: PRIVATE_PEM
  })
};

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function fakeGoogle(handlers) {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url, init });
    if (url === "https://oauth2.googleapis.com/token") {
      return jsonResponse(200, { access_token: "token-1", expires_in: 3600 });
    }
    return handlers(url, init);
  };
  return { fetchImpl, requests };
}

test("firma el JWT de la cuenta de servicio con RS256 y los scopes mínimos", () => {
  const jwt = signJwt({ clientEmail: "sa@example.com", privateKey: PRIVATE_PEM }, 1000);
  const [header, claims, signature] = jwt.split(".");
  const payload = JSON.parse(Buffer.from(claims, "base64url"));
  assert.equal(JSON.parse(Buffer.from(header, "base64url")).alg, "RS256");
  assert.equal(payload.iss, "sa@example.com");
  assert.equal(payload.exp, 4600);
  assert.equal(
    payload.scope,
    "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy"
  );
  assert.equal(
    crypto.verify("RSA-SHA256", Buffer.from(`${header}.${claims}`), publicKey, Buffer.from(signature, "base64url")),
    true
  );
});

test("reutiliza el token mientras no esté por vencer", async () => {
  const google = fakeGoogle(() => jsonResponse(200, { calendars: { cal: { busy: [] } } }));
  const client = createCalendarClient({ env: ENV, fetchImpl: google.fetchImpl });
  await client.busyIntervals(["cal"], "a", "b");
  await client.busyIntervals(["cal"], "a", "b");
  assert.equal(google.requests.filter((request) => request.url.includes("oauth2")).length, 1);
  assert.equal(google.requests[1].init.headers.authorization, "Bearer token-1");
});

test("un calendario no compartido con la cuenta de servicio corta en vez de parecer libre", async () => {
  const google = fakeGoogle(() => jsonResponse(200, {
    calendars: { cal: { errors: [{ domain: "global", reason: "notFound" }], busy: [] } }
  }));
  const client = createCalendarClient({ env: ENV, fetchImpl: google.fetchImpl });
  await assert.rejects(client.busyIntervals(["cal"], "a", "b"), { code: "CALENDAR_UNREADABLE", reason: "notFound" });
});

test("crea eventos sin enviar invitaciones y devuelve null para un id inexistente", async () => {
  const google = fakeGoogle((url, init) => {
    if (init.method === "POST") return jsonResponse(200, { id: "turno1", status: "confirmed" });
    return jsonResponse(404, { error: { errors: [{ reason: "notFound" }] } });
  });
  const client = createCalendarClient({ env: ENV, fetchImpl: google.fetchImpl });
  await client.insertEvent("esc.isbarbo@gmail.com", { id: "turno1" });
  assert.equal(
    google.requests[1].url,
    "https://www.googleapis.com/calendar/v3/calendars/esc.isbarbo%40gmail.com/events?sendUpdates=none"
  );
  assert.equal(await client.getEvent("esc.isbarbo@gmail.com", "turno2"), null);
});

test("expone el estado 409 de Google para resolver el conflicto de ids", async () => {
  const google = fakeGoogle(() => jsonResponse(409, { error: { errors: [{ reason: "duplicate" }] } }));
  const client = createCalendarClient({ env: ENV, fetchImpl: google.fetchImpl });
  await assert.rejects(client.insertEvent("cal", { id: "turno1" }), { status: 409, reason: "duplicate" });
});

test("sin credenciales no llama a Google", async () => {
  const google = fakeGoogle(() => jsonResponse(200, {}));
  const client = createCalendarClient({ env: {}, fetchImpl: google.fetchImpl });
  await assert.rejects(client.busyIntervals(["cal"], "a", "b"), { code: "NOT_CONFIGURED" });
  assert.equal(google.requests.length, 0);
});
