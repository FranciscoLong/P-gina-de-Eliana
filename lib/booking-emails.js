"use strict";

/*
  Correos de la reserva: la confirmación al cliente y el aviso a Eliana.

  Se envían con Resend (integración del Marketplace de Vercel, que carga
  RESEND_API_KEY). Van en texto plano: se leen bien en cualquier cliente y no
  hay HTML donde los datos que escribe el visitante puedan inyectar marcado.

  Variables:
  - BOOKING_EMAIL_FROM: remitente, de un dominio verificado en Resend.
  - BOOKING_NOTIFY_EMAIL: a quién avisar de cada turno (esc.isbarbo@gmail.com
    si no está).
*/

const { TIME_ZONE } = require("./booking");
const { OFFICE_ADDRESS } = require("./reservations");

const OFFICE_EMAIL = "esc.isbarbo@gmail.com";
const WHATSAPP_NUMBER = "59891048471";
const WHATSAPP_DISPLAY = "+598 91 048 471";
const MAPS_URL = "https://maps.app.goo.gl/rCgRTZrHCtpmQmU78";
const RESEND_URL = "https://api.resend.com/emails";

const DATE_PARTS = new Intl.DateTimeFormat("es-UY", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

// "martes 7 de octubre a las 10:15", sin la coma que agrega Intl tras el día.
function formatSlot(start) {
  const parts = Object.fromEntries(
    DATE_PARTS.formatToParts(new Date(start)).map((part) => [part.type, part.value])
  );
  return `${parts.weekday} ${parts.day} de ${parts.month} a las ${parts.hour}:${parts.minute}`;
}

function firstName(name) {
  return name.trim().split(/\s+/)[0];
}

function clientConfirmation(booking, durationMinutes) {
  const when = formatSlot(booking.slot.start);
  const whatsappText = `Hola Eliana, tengo un turno el ${when} y necesito cancelarlo o cambiarlo.`;

  return {
    to: booking.email,
    replyTo: OFFICE_EMAIL,
    subject: `Turno confirmado: ${when}`,
    text: [
      `Hola ${firstName(booking.name)}:`,
      "",
      "Tu turno quedó confirmado.",
      "",
      `Trámite: ${booking.service}`,
      `Día y hora: ${when} (duración estimada: ${durationMinutes} minutos)`,
      `Dirección: ${OFFICE_ADDRESS}`,
      `Cómo llegar: ${MAPS_URL}`,
      "",
      `Si necesitás cancelar o cambiar el horario, escribime por WhatsApp al ${WHATSAPP_DISPLAY}:`,
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`,
      "",
      "Eliana Isbarbo Gfeller",
      "Escribana Pública"
    ].join("\n")
  };
}

function officeNotification(booking, eventLink, env = process.env) {
  const when = formatSlot(booking.slot.start);

  return {
    to: env.BOOKING_NOTIFY_EMAIL || OFFICE_EMAIL,
    replyTo: booking.email,
    subject: `Nuevo turno: ${booking.service} · ${when}`,
    text: [
      "Se reservó un turno desde la página.",
      "",
      `Trámite: ${booking.service}`,
      `Día y hora: ${when}`,
      `Nombre: ${booking.name}`,
      `Teléfono: ${booking.phone}`,
      `Correo: ${booking.email}`,
      "",
      "Consulta:",
      booking.details,
      "",
      eventLink ? `Ver en Google Calendar: ${eventLink}` : "El turno ya está en Google Calendar.",
      "",
      "Respondiendo este correo le escribís directamente a quien reservó."
    ].join("\n")
  };
}

async function sendEmail(message, idempotencyKey, { env = process.env, fetchImpl = fetch } = {}) {
  if (!env.RESEND_API_KEY || !env.BOOKING_EMAIL_FROM) {
    throw Object.assign(new Error("Falta configurar el envío de correos."), { code: "NOT_CONFIGURED" });
  }

  const response = await fetchImpl(RESEND_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
      // Resend descarta un segundo envío con la misma clave durante 24 horas.
      "idempotency-key": idempotencyKey
    },
    body: JSON.stringify({
      from: env.BOOKING_EMAIL_FROM,
      to: [message.to],
      reply_to: message.replyTo,
      subject: message.subject,
      text: message.text
    }),
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw Object.assign(new Error("Resend rechazó el correo."), {
      code: "EMAIL_FAILED",
      status: response.status,
      reason: String(result?.name || "")
    });
  }
}

module.exports = {
  clientConfirmation,
  formatSlot,
  officeNotification,
  sendEmail
};
