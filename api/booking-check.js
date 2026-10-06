"use strict";

/*
  TEMPORAL: chequeo de configuración de la agenda, solo en Preview. Confirma
  que Google acepta la cuenta de servicio y puede leer el calendario, y que
  Resend acepta la clave, sin crear turnos ni mandar correos. Se borra antes
  de pasar a producción.
*/

const { createCalendarClient } = require("../lib/google-calendar");
const { bookingEnabled, calendarIds, send } = require("./_security");

module.exports = async (req, res) => {
  if (process.env.VERCEL_ENV !== "preview") {
    return send(res, 404, { error: "No encontrado." });
  }

  const result = { bookingEnabled: bookingEnabled() };

  try {
    const now = Date.now();
    await createCalendarClient().busyIntervals(
      calendarIds().blockingCalendarIds,
      new Date(now).toISOString(),
      new Date(now + 86400000).toISOString()
    );
    result.google = "ok";
  } catch (error) {
    result.google = `${error.code || "error"}: ${error.reason || error.message}`;
  }

  try {
    // Envío vacío: con una clave válida Resend responde 422 por los campos faltantes y no manda nada.
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY || ""}`,
        "content-type": "application/json"
      },
      body: "{}",
      signal: AbortSignal.timeout(8000)
    });
    const body = await response.json().catch(() => ({}));
    result.resend = { status: response.status, name: body.name, message: body.message };
  } catch (error) {
    result.resend = { error: error.message };
  }

  return send(res, 200, result);
};
