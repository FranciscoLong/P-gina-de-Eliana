"use strict";

/*
  Consultas por correo desde la página. La persona deja su nombre, su correo,
  el trámite (opcional) y su consulta; a Eliana le llega un correo con
  «Responder a» = el correo de la persona. El correo de Eliana no aparece en la
  página: la persona lo ve recién cuando Eliana le contesta.

  A la persona no se le manda copia: cualquiera podría poner el correo de otro
  y usar el formulario para mandarle correos.
*/

const { DEFAULT_SERVICE, SERVICES, cleanText } = require("./booking");
const { officeInbox } = require("./booking-emails");

const CONTACT_LIMITS = Object.freeze({ name: 120, email: 254, message: 2000 });
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContact(input) {
  const value = input && typeof input === "object" ? input : {};
  const errors = {};
  const service = cleanText(value.service, 120);
  const name = cleanText(value.name, CONTACT_LIMITS.name);
  const email = cleanText(value.email, CONTACT_LIMITS.email).toLowerCase();
  const message = cleanText(value.message, CONTACT_LIMITS.message + 1, { multiline: true });
  const idempotencyKey = cleanText(value.idempotencyKey, 128);

  // El trámite es opcional: vacío vale; si viene, tiene que ser uno de la lista.
  if (service && !SERVICES.includes(service)) errors.service = "Elegí un trámite de la lista.";
  if (name.length < 2) errors.name = "Escribí tu nombre y apellido.";
  if (!EMAIL_PATTERN.test(email)) errors.email = "Revisá el correo, parece incompleto (por ejemplo, nombre@gmail.com).";
  if (!message) errors.message = "Escribí tu consulta.";
  else if (message.length > CONTACT_LIMITS.message) {
    errors.message = `La consulta no puede superar los ${CONTACT_LIMITS.message} caracteres.`;
  }
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
    errors.idempotencyKey = "No se pudo enviar la consulta. Volvé a intentar.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: { service: service || DEFAULT_SERVICE, name, email, message, idempotencyKey }
  };
}

// El correo que le llega a Eliana. Texto plano, como los de la agenda.
function officeContactMessage(contact, env = process.env) {
  return {
    to: officeInbox(env),
    replyTo: contact.email,
    subject: `Consulta desde la página: ${contact.service} · ${contact.name}`,
    text: [
      "Llegó una consulta desde la página.",
      "",
      `Trámite: ${contact.service}`,
      `Nombre: ${contact.name}`,
      `Correo: ${contact.email}`,
      "",
      "Consulta:",
      contact.message,
      "",
      "Respondiendo este correo le escribís directamente a quien hizo la consulta."
    ].join("\n")
  };
}

module.exports = { CONTACT_LIMITS, officeContactMessage, validateContact };
