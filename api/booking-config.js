"use strict";

const { bookingEnabled, send } = require("./_security");
const { assertAppsScriptWorkflow } = require("../lib/apps-script-client");

const SITE_KEY_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return send(res, 405, { error: "Método no permitido." });
  }

  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  const siteKey = String(process.env.TURNSTILE_SITE_KEY || "").trim();
  let enabled = bookingEnabled() && SITE_KEY_PATTERN.test(siteKey);
  if (enabled) {
    try {
      await assertAppsScriptWorkflow();
    } catch (_error) {
      enabled = false;
    }
  }

  return send(res, 200, {
    enabled,
    turnstileSiteKey: enabled ? siteKey : ""
  });
};
