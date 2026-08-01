"use strict";

const { isValidService, dateRange } = require("../lib/booking");
const { assertAppsScriptWorkflow, callAppsScript } = require("../lib/apps-script-client");
const {
  BOOKING_UNAVAILABLE_MESSAGE,
  bookingEnabled,
  originAllowed,
  send
} = require("./_security");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return send(res, 405, { error: "Método no permitido." });
  }
  if (!bookingEnabled()) {
    return send(res, 503, { error: BOOKING_UNAVAILABLE_MESSAGE });
  }
  if (!originAllowed(req)) {
    return send(res, 403, { error: "Origen no autorizado." });
  }

  const { serviceCode, from, to } = req.query;
  if (!isValidService(serviceCode) || !dateRange(from, to).length) {
    return send(res, 400, { error: "Consulta de disponibilidad inválida." });
  }

  try {
    await assertAppsScriptWorkflow();
    const result = await callAppsScript("availability", { serviceCode, from, to });
    return send(res, 200, result.data);
  } catch (error) {
    return send(res, error.code === "NOT_CONFIGURED" ? 503 : 502, {
      error: error.message || "La agenda no está disponible temporalmente."
    });
  }
};
