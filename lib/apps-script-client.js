"use strict";

const crypto = require("node:crypto");

function signEnvelope(action, payload, secret, timestamp, nonce) {
  const payloadJson = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto
    .createHmac("sha256", secret)
    .update(`${action}.${timestamp}.${nonce}.${payloadJson}`)
    .digest("hex");
}

async function callAppsScript(action, payload) {
  const url = process.env.APPS_SCRIPT_WEB_APP_URL;
  const secret = process.env.APPS_SCRIPT_SHARED_SECRET;

  if (!url || !secret) {
    const error = new Error("La agenda en línea aún no está configurada.");
    error.code = "NOT_CONFIGURED";
    throw error;
  }

  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(18).toString("base64url");
  const payloadJson = JSON.stringify(payload);
  const signature = signEnvelope(action, payloadJson, secret, timestamp, nonce);
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, payloadJson, timestamp, nonce, signature }),
    signal: AbortSignal.timeout(10000)
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.ok) {
    const error = new Error(result.message || "No se pudo conectar con la agenda.");
    error.status = result.status || response.status;
    throw error;
  }

  return result;
}

module.exports = { signEnvelope, callAppsScript };
