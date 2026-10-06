const test = require("node:test");
const assert = require("node:assert/strict");

const { cancellationNotice, clientConfirmation, formatSlot, officeNotification } = require("../lib/booking-emails");

const BOOKING = {
  service: "Sucesiones",
  slot: { start: "2026-10-07T10:15:00-03:00", end: "2026-10-07T11:00:00-03:00" },
  name: "Ana María Pérez",
  email: "ana@example.com",
  phone: "099 123 456",
  details: "Quisiera consultar por la sucesión de mi padre.",
  idempotencyKey: "abcdefghijklmnop"
};

test("escribe la fecha como se dice, en hora de Montevideo", () => {
  assert.equal(formatSlot("2026-10-07T10:15:00-03:00"), "miércoles 7 de octubre a las 10:15");
  assert.equal(formatSlot("2026-10-12T18:00:00-03:00"), "lunes 12 de octubre a las 18:00");
});

test("la confirmación al cliente trae trámite, fecha, dirección y cómo cancelar", () => {
  const message = clientConfirmation(BOOKING, {
    durationMinutes: 45,
    cancelUrl: "https://www.escribaniaisbarbo.com.uy/api/anular-turno?t=abc",
    eventId: "turno202610071015v0"
  });
  assert.equal(message.to, "ana@example.com");
  assert.equal(message.replyTo, "esc.isbarbo@gmail.com");
  assert.equal(message.subject, "Turno confirmado: miércoles 7 de octubre a las 10:15");
  assert.match(message.text, /^Hola Ana:/);
  assert.match(message.text, /Trámite: Sucesiones/);
  assert.match(message.text, /duración estimada: 45 minutos/);
  assert.match(message.text, /Sarandí 294 esquina 18 de Julio/);
  assert.match(message.text, /https:\/\/wa\.me\/59891048471\?text=Hola%20Eliana%2C%20tengo%20un%20turno/);
  assert.doesNotMatch(message.text, /099 123 456|sucesión de mi padre/);
  assert.match(message.text, /Si no reservaste ningún turno, ignorá por completo este mensaje\./);
  assert.match(message.text, /https:\/\/www\.escribaniaisbarbo\.com\.uy\/api\/anular-turno\?t=abc/);
});

test("el aviso a Eliana trae los datos de contacto y se responde directo al cliente", () => {
  const message = officeNotification(BOOKING, "https://calendar.google.com/event?eid=x", {});
  assert.equal(message.to, "esc.isbarbo@gmail.com");
  assert.equal(message.replyTo, "ana@example.com");
  assert.equal(message.subject, "Nuevo turno: Sucesiones · miércoles 7 de octubre a las 10:15");
  assert.match(message.text, /Teléfono: 099 123 456/);
  assert.match(message.text, /sucesión de mi padre/);
  assert.match(message.text, /Ver en Google Calendar: https:\/\/calendar\.google\.com/);
  assert.equal(officeNotification(BOOKING, "", { BOOKING_NOTIFY_EMAIL: "otra@example.com" }).to, "otra@example.com");
});

test("el aviso de anulación le dice a Eliana qué turno se liberó y por qué", () => {
  const message = cancellationNotice({
    summary: "Turno: Sucesiones · Ana María Pérez",
    description: "Trámite: Sucesiones\nTeléfono: 099 123 456",
    start: { dateTime: "2026-10-07T10:15:00-03:00" }
  }, {});
  assert.equal(message.to, "esc.isbarbo@gmail.com");
  assert.equal(message.subject, "Turno anulado: Sucesiones · Ana María Pérez · miércoles 7 de octubre a las 10:15");
  assert.match(message.text, /indicó que no hizo esta reserva/);
  assert.match(message.text, /Teléfono: 099 123 456/);
});

test("la confirmación permite agregar el turno al calendario: enlace de Google y archivo .ics", () => {
  const message = clientConfirmation(
    BOOKING,
    { durationMinutes: 45, cancelUrl: "https://ejemplo/anular", eventId: "turno202610071015v0" },
    new Date("2026-10-06T12:00:00Z")
  );
  const google = new URL(message.text.match(/Google Calendar: (\S+)/)[1]);
  assert.equal(google.searchParams.get("action"), "TEMPLATE");
  assert.equal(google.searchParams.get("dates"), "20261007T131500Z/20261007T140000Z");
  assert.equal(google.searchParams.get("text"), "Turno con la escribana Eliana Isbarbo Gfeller");
  assert.match(google.searchParams.get("details"), /Trámite: Sucesiones/);
  assert.match(message.text, /abrí el archivo turno\.ics adjunto/);

  const [attachment] = message.attachments;
  assert.equal(attachment.filename, "turno.ics");
  const ics = Buffer.from(attachment.content, "base64").toString("utf8");
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /\r\nUID:turno202610071015v0@escribaniaisbarbo\.com\.uy\r\n/);
  assert.match(ics, /\r\nDTSTART:20261007T131500Z\r\nDTEND:20261007T140000Z\r\n/);
  assert.match(ics, /\r\nDTSTAMP:20261006T120000Z\r\n/);
  // Comas escapadas y ninguna línea de más de 75 bytes.
  assert.match(ics.replace(/\r\n /g, ""), /LOCATION:Sarandí 294 esquina 18 de Julio\\, Rosario\\, Colonia\\, Uruguay/);
  assert.ok(ics.split("\r\n").every((line) => Buffer.byteLength(line) <= 75));
  // El aviso a Eliana no lleva adjunto.
  assert.equal(officeNotification(BOOKING, "", {}).attachments, undefined);
});
