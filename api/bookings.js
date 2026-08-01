"use strict";

const { validateBooking } = require("../lib/booking");
const { callAppsScript } = require("../lib/apps-script-client");
const { originAllowed, send, verifyTurnstile } = require("./_security");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Método no permitido." });
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

  try {
    const result = await callAppsScript("booking", checked.value);
    return send(res, result.created ? 201 : 200, result.data);
  } catch (error) {
    const status = error.status === 409
      ? 409
      : error.code === "NOT_CONFIGURED"
        ? 503
        : 502;
    return send(res, status, { error: error.message || "No se pudo confirmar la reserva." });
  }
};
