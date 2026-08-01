"use strict";

const { validateBooking } = require("../lib/booking");
const { callAppsScript } = require("../lib/apps-script-client");
const {
  BOOKING_UNAVAILABLE_MESSAGE,
  bookingEnabled,
  originAllowed,
  send,
  verifyTurnstile
} = require("./_security");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Método no permitido." });
  }
  if (!bookingEnabled()) {
    return send(res, 503, { error: BOOKING_UNAVAILABLE_MESSAGE });
  }
  if (!originAllowed(req)) {
    return send(res, 403, { error: "Origen no autorizado." });
  }

  const checked = validateBooking(req.body);
  if (!checked.valid) {
    return send(res, 400, { error: "Revisá los datos ingresados.", fields: checked.errors });
  }

  let human = false;
  try {
    human = await verifyTurnstile(req.body.turnstileToken, req.headers["x-forwarded-for"]);
  } catch (_error) {
    return send(res, 503, {
      error: "La verificación de seguridad no está disponible. Reintentá en unos minutos."
    });
  }

  if (!human) {
    return send(res, 403, {
      error: "No pudimos verificar que seas una persona. Actualizá el control y reintentá."
    });
  }

  checked.value.rateLimitSubject = String(req.headers["x-forwarded-for"] || "unknown")
    .split(",")[0]
    .trim()
    .slice(0, 128);

  try {
    const result = await callAppsScript("booking", checked.value);
    const status = result.data?.status === "pending" ? 202 : result.created ? 201 : 200;
    return send(res, status, result.data);
  } catch (error) {
    console.error("Apps Script booking failed", {
      status: error.status,
      code: error.code,
      message: error.message
    });
    const status = [409, 429, 503].includes(error.status)
      ? error.status
      : error.code === "NOT_CONFIGURED"
        ? 503
        : 502;
    return send(res, status, { error: error.message || "No se pudo enviar la solicitud." });
  }
};
