"use strict";

/*
  Controles comunes de las funciones de reserva. Los archivos de api/ que
  empiezan con guion bajo no se publican como rutas.

  Interruptor general: BOOKING_ENABLED debe valer exactamente "true" y tienen
  que estar todas las credenciales. Si falta algo, las funciones responden 503
  sin tocar Google ni Resend, y la página ofrece WhatsApp.

  El formulario de consultas (api/consultas.js) va aparte: no usa Google, así
  que sigue andando aunque la agenda esté apagada. Se prende solo cuando están
  Turnstile y Resend; CONTACT_FORM_ENABLED="false" lo apaga.
*/

const TURNSTILE_ACTION = "booking";
const CONTACT_TURNSTILE_ACTION = "consulta";
const UNAVAILABLE_MESSAGE = "La agenda en línea no está disponible en este momento.";
const REQUIRED_SETTINGS = [
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "BOOKING_CALENDAR_ID",
  "TURNSTILE_SECRET_KEY",
  "TURNSTILE_SITE_KEY",
  "RESEND_API_KEY",
  "BOOKING_EMAIL_FROM"
];
const CONTACT_UNAVAILABLE_MESSAGE = "El formulario de consultas no está disponible en este momento.";
const CONTACT_REQUIRED_SETTINGS = [
  "TURNSTILE_SECRET_KEY",
  "TURNSTILE_SITE_KEY",
  "RESEND_API_KEY",
  "BOOKING_EMAIL_FROM"
];
const NO_STORE = "private, no-store, max-age=0";

function bookingEnabled(env = process.env) {
  return env.BOOKING_ENABLED === "true" && REQUIRED_SETTINGS.every((key) => Boolean(env[key]));
}

function contactEnabled(env = process.env) {
  return env.CONTACT_FORM_ENABLED !== "false" && CONTACT_REQUIRED_SETTINGS.every((key) => Boolean(env[key]));
}

function calendarIds(env = process.env) {
  const main = env.BOOKING_CALENDAR_ID;
  const extra = String(env.BOOKING_BLOCKING_CALENDAR_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return { calendarId: main, blockingCalendarIds: [...new Set([main, ...extra])] };
}

function allowedOrigins(env = process.env) {
  return String(env.BOOKING_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

// En Preview se acepta además la URL propia del despliegue y la de la rama.
function previewHosts(env = process.env) {
  if (env.VERCEL_ENV !== "preview") {
    return [];
  }
  return [env.VERCEL_URL, env.VERCEL_BRANCH_URL]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function hostOf(value) {
  try {
    return new URL(value).host.toLowerCase();
  } catch (_error) {
    return "";
  }
}

// Host al que llegó el pedido; detrás del proxy de Vercel viene en x-forwarded-host.
function requestHost(req) {
  return String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim().toLowerCase();
}

// Sitio desde el que se hizo el pedido: el encabezado Origin o, si no viene, el host.
function requestOrigin(req) {
  return req.headers.origin || `https://${requestHost(req)}`;
}

function originAllowed(req, env = process.env) {
  const allowedHosts = allowedOrigins(env).map(hostOf).filter(Boolean).concat(previewHosts(env));
  const origin = req.headers.origin;

  if (origin) {
    return allowedOrigins(env).includes(origin)
      || (origin.startsWith("https://") && previewHosts(env).includes(hostOf(origin)));
  }

  // Los GET del mismo origen pueden llegar sin Origin: se usa el host pedido.
  return allowedHosts.includes(requestHost(req));
}

function send(res, status, body, cacheControl = NO_STORE) {
  res.setHeader("Cache-Control", cacheControl);
  res.status(status).json(body);
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
}

// action dice desde qué formulario se pidió el token: uno de la agenda no sirve para una consulta.
async function verifyTurnstile(
  token,
  ip,
  { env = process.env, fetchImpl = fetch, action = TURNSTILE_ACTION } = {}
) {
  if (typeof token !== "string" || !token || token.length > 2048) {
    return false;
  }

  const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  if (ip) {
    form.set("remoteip", ip);
  }

  const response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(8000)
  });
  const result = await response.json();

  // Las claves de prueba de Cloudflare solo se aceptan en Preview y a propósito.
  if (env.VERCEL_ENV === "preview" && env.TURNSTILE_TEST_MODE === "true") {
    return result.success === true && result.metadata?.result_with_testing_key === true;
  }

  const allowedHostnames = allowedOrigins(env)
    .map((value) => hostOf(value).split(":")[0])
    .filter(Boolean)
    .concat(previewHosts(env));

  return result.success === true
    && result.action === action
    && allowedHostnames.includes(result.hostname);
}

module.exports = {
  CONTACT_TURNSTILE_ACTION,
  CONTACT_UNAVAILABLE_MESSAGE,
  NO_STORE,
  REQUIRED_SETTINGS,
  TURNSTILE_ACTION,
  UNAVAILABLE_MESSAGE,
  bookingEnabled,
  calendarIds,
  clientIp,
  contactEnabled,
  originAllowed,
  requestOrigin,
  send,
  verifyTurnstile
};
