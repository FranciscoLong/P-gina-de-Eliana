"use strict";

/*
  El turno para el calendario del cliente: un enlace que abre Google Calendar
  con el evento ya cargado y un archivo .ics (iCalendar) para iPhone, Outlook
  y los demás. Es una copia: si Eliana mueve o anula el turno, la copia del
  cliente no se actualiza.
*/

const EVENT_TITLE = "Turno con la escribana Eliana Isbarbo Gfeller";
const SITE_URL = "https://www.escribaniaisbarbo.com.uy/";

// "2026-10-07T10:15:00-03:00" → "20261007T131500Z", el formato UTC de los dos.
function utcStamp(value) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function eventDetails({ service, whatsappDisplay, whatsappNumber }) {
  return `Trámite: ${service}.\nPara cancelar o cambiar el horario: WhatsApp ${whatsappDisplay} (https://wa.me/${whatsappNumber}).`;
}

function googleCalendarUrl({ slot, service, location, whatsappDisplay, whatsappNumber }) {
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: EVENT_TITLE,
    dates: `${utcStamp(slot.start)}/${utcStamp(slot.end)}`,
    details: eventDetails({ service, whatsappDisplay, whatsappNumber }),
    location
  });
  return `https://calendar.google.com/calendar/render?${query}`;
}

// Texto de iCalendar: barras, comas, punto y coma y saltos de línea van escapados.
function icsText(value) {
  return String(value).replace(/[\\,;]/g, (char) => `\\${char}`).replace(/\r?\n/g, "\\n");
}

// Las líneas de iCalendar no pasan de 75 bytes; las siguientes empiezan con un espacio.
function foldLine(line) {
  const parts = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length ? 74 : 75;
    if (Buffer.byteLength(current + char) > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function icsFile({ uid, slot, service, location, whatsappDisplay, whatsappNumber }, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eliana Isbarbo Gfeller//Agenda web//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(slot.start)}`,
    `DTEND:${utcStamp(slot.end)}`,
    `SUMMARY:${icsText(EVENT_TITLE)}`,
    `LOCATION:${icsText(location)}`,
    `DESCRIPTION:${icsText(eventDetails({ service, whatsappDisplay, whatsappNumber }))}`,
    `URL:${SITE_URL}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

module.exports = { EVENT_TITLE, googleCalendarUrl, icsFile };
