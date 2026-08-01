"use strict";

const { bookingEnabled, send } = require("./_security");

const SITE_KEY_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

module.exports = (req, res) => {
  if (req.method !== "GET") {
    return send(res, 405, { error: "Método no permitido." });
  }

  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  const siteKey = String(process.env.TURNSTILE_SITE_KEY || "").trim();
  const enabled = bookingEnabled() && SITE_KEY_PATTERN.test(siteKey);

  return send(res, 200, {
    enabled,
    turnstileSiteKey: enabled ? siteKey : ""
  });
};
