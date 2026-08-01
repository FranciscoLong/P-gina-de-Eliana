"use strict";

const TURNSTILE_ACTION = "booking";
const BOOKING_UNAVAILABLE_MESSAGE = "La agenda en línea está temporalmente no disponible.";

function bookingEnabled() {
  return process.env.VERCEL_ENV === "preview"
    && process.env.BOOKING_ENABLED === "true";
}

function allowedOrigins() {
  return (process.env.BOOKING_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function originAllowed(req) {
  const allowed = allowedOrigins();
  const previewHosts = previewHostnames();

  const origin = req.headers.origin;
  if (origin) {
    if (allowed.includes(origin)) {
      return true;
    }
    try {
      const parsed = new URL(origin);
      return parsed.protocol === "https:" && previewHosts.includes(parsed.host);
    } catch (_error) {
      return false;
    }
  }

  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const host = String(forwardedHost || req.headers.host || "").toLowerCase();
  return previewHosts.includes(host) || allowed.some((value) => {
    try {
      return new URL(value).host === host;
    } catch (_error) {
      return false;
    }
  });
}

function previewHostnames() {
  if (process.env.VERCEL_ENV !== "preview") {
    return [];
  }
  return [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function send(res, status, body) {
  res.status(status).json(body);
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || typeof token !== "string" || !token || token.length > 2048) {
    return false;
  }

  const form = new URLSearchParams({ secret, response: token });
  if (ip) {
    form.set("remoteip", String(ip).split(",")[0].trim());
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(8000)
  });
  const result = await response.json();
  if (process.env.VERCEL_ENV === "preview" && process.env.TURNSTILE_TEST_MODE === "true") {
    return result.success === true
      && result.metadata?.result_with_testing_key === true;
  }

  const allowedHosts = allowedOrigins().flatMap((value) => {
    try {
      return [new URL(value).hostname];
    } catch (_error) {
      return [];
    }
  }).concat(previewHostnames());

  return result.success === true
    && result.action === TURNSTILE_ACTION
    && allowedHosts.includes(result.hostname);
}

module.exports = {
  BOOKING_UNAVAILABLE_MESSAGE,
  TURNSTILE_ACTION,
  bookingEnabled,
  originAllowed,
  previewHostnames,
  send,
  verifyTurnstile
};
