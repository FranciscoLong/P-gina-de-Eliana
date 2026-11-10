"use strict";

/*
  Recibe una consulta del formulario de la página: valida los datos, verifica
  Turnstile y le manda el correo a Eliana (ver api/_lib/contact.js).
*/

const { officeContactMessage, validateContact } = require("./_lib/contact");
const { sendEmail } = require("./_lib/booking-emails");
const {
  CONTACT_TURNSTILE_ACTION,
  CONTACT_UNAVAILABLE_MESSAGE,
  clientIp,
  contactEnabled,
  originAllowed,
  send,
  verifyTurnstile
} = require("./_security");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Método no permitido." });
  }
  if (!contactEnabled()) {
    return send(res, 503, { error: CONTACT_UNAVAILABLE_MESSAGE });
  }
  if (!originAllowed(req)) {
    return send(res, 403, { error: "Origen no autorizado." });
  }

  const checked = validateContact(req.body);
  if (!checked.valid) {
    return send(res, 400, { error: "Revisá los datos ingresados.", fields: checked.errors });
  }

  let human = false;
  try {
    human = await verifyTurnstile(req.body.turnstileToken, clientIp(req), { action: CONTACT_TURNSTILE_ACTION });
  } catch (_error) {
    return send(res, 503, { error: "La verificación de seguridad no respondió. Probá de nuevo en unos minutos." });
  }
  if (!human) {
    return send(res, 403, { error: "No pudimos verificar que seas una persona. Completá la verificación de nuevo." });
  }

  const contact = checked.value;
  try {
    // Resend descarta un reenvío con la misma clave: un doble toque no duplica el correo.
    await sendEmail(officeContactMessage(contact), `consulta-${contact.idempotencyKey}`);
  } catch (error) {
    console.error("contact email failed", { code: error.code, status: error.status, reason: error.reason });
    return send(res, 502, { error: "No pudimos enviar tu consulta." });
  }

  return send(res, 201, { status: "sent", email: contact.email });
};
