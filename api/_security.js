"use strict";

const TURNSTILE_ACTION = "booking";
const BOOKING_UNAVAILABLE_MESSAGE = "La agenda en línea está temporalmente no disponible.";

function bookingEnabled() {
  return process.env.BOOKING_ENABLED === "true";
}

function allowedOrigins() {
  return (process.env.BOOKING_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function originAllowed(req) {
  const allowed = allowedOrigins();
  if (!allowed.length) {
    return false;
  }

  const origin = req.headers.origin;
  if (origin) {
    return allowed.includes(origin);
  }

  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const host = forwardedHost || req.headers.host;
  return allowed.some((value) => {
    try {
      return new URL(value).host === host;
    } catch (_error) {
      return false;
    }
  });
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
  const allowedHosts = allowedOrigins().flatMap((value) => {
    try {
      return [new URL(value).hostname];
    } catch (_error) {
      return [];
    }
  });

  return result.success === true
    && result.action === TURNSTILE_ACTION
    && allowedHosts.includes(result.hostname);
}

module.exports = {
  BOOKING_UNAVAILABLE_MESSAGE,
  TURNSTILE_ACTION,
  bookingEnabled,
  originAllowed,
  send,
  verifyTurnstile
};
