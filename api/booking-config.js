"use strict";

/*
  Le dice al navegador si ofrecer la agenda y el formulario de consultas, y le
  pasa la site key pública de Turnstile. No consulta a Google: si la agenda está prendida pero Google falla,
  /api/availability responde el error y la página ofrece WhatsApp.
*/

const { bookingEnabled, contactEnabled, send } = require("./_security");

const SITE_KEY_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

module.exports = (req, res) => {
  if (req.method !== "GET") {
    return send(res, 405, { error: "Método no permitido." });
  }

  const siteKey = String(process.env.TURNSTILE_SITE_KEY || "").trim();
  const validKey = SITE_KEY_PATTERN.test(siteKey);
  const enabled = bookingEnabled() && validKey;
  // El formulario de consultas va aparte de la agenda: puede andar con la agenda apagada.
  const contact = contactEnabled() && validKey;
  return send(res, 200, {
    enabled,
    contactEnabled: contact,
    turnstileSiteKey: enabled || contact ? siteKey : ""
  });
};
