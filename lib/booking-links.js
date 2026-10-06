"use strict";

/*
  Enlaces firmados para anular un turno desde el correo de confirmación.

  El enlace lleva el id del evento y su horario, firmados con HMAC-SHA256 y
  BOOKING_LINK_SECRET: no se puede adivinar ni fabricar para otro turno. Vence
  cuando empieza el turno. No hace falta guardar nada: la firma es la prueba.
*/

const crypto = require("node:crypto");

function secret(env) {
  const value = env.BOOKING_LINK_SECRET || "";
  if (value.length < 32) {
    throw Object.assign(new Error("Falta BOOKING_LINK_SECRET."), { code: "NOT_CONFIGURED" });
  }
  return value;
}

function sign(payload, env) {
  return crypto.createHmac("sha256", secret(env)).update(payload).digest("base64url");
}

function createCancelToken({ eventId, start }, env = process.env) {
  const payload = Buffer.from(JSON.stringify({ e: eventId, s: start })).toString("base64url");
  return `${payload}.${sign(payload, env)}`;
}

// Devuelve { eventId, start } o null si la firma no coincide o el turno ya empezó.
function readCancelToken(token, { env = process.env, now = new Date() } = {}) {
  if (typeof token !== "string" || token.length > 600) {
    return null;
  }
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) {
    return null;
  }

  const expected = Buffer.from(sign(payload, env));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const { e: eventId, s: start } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof eventId !== "string" || !/^turno[a-v0-9]+$/.test(eventId) || Number.isNaN(Date.parse(start))) {
      return null;
    }
    return Date.parse(start) > now.getTime() ? { eventId, start } : null;
  } catch (_error) {
    return null;
  }
}

module.exports = { createCancelToken, readCancelToken };
