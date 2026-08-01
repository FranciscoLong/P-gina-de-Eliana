"use strict";

const TIME_ZONE = "America/Montevideo";
const HORIZON_DAYS = 45;
const configuredDuration = Number(process.env.BOOKING_DURATION_MINUTES || 45);
const DEFAULT_DURATION_MINUTES = Number.isInteger(configuredDuration) && configuredDuration > 0
  ? configuredDuration
  : 45;

const SERVICE_DEFINITIONS = [
  ["consulta-notarial", "Consulta notarial"],
  ["compromiso-compraventa", "Compromiso de compraventa"],
  ["titulo-automotor", "Título automotor"],
  ["carta-poder", "Carta Poder"],
  ["prenda", "Prenda"],
  ["leasing", "Leasing"],
  ["promesas-cesiones", "Promesas y cesiones"],
  ["compraventas-antecedentes", "Compraventas y estudio de antecedentes"],
  ["hipotecas-cancelacion", "Hipotecas y/o Cancelación"],
  ["arrendamientos-garantias", "Arrendamientos y garantías"],
  ["sucesiones", "Sucesiones"],
  ["testamentos", "Testamentos"],
  ["particiones", "Particiones"],
  ["cesion-derechos-hereditarios", "Cesión de Derechos Hereditarios"],
  ["certificacion-firmas", "Certificación de firmas"],
  ["certificacion-situaciones-juridicas", "Certificación de situaciones jurídicas"],
  ["poderes", "Poderes"],
  ["declaraciones-juradas", "Declaraciones juradas"],
  ["minuta-notarial-bps", "Minuta notarial BPS"],
  ["constitucion-sociedades", "Constitución de sociedades"],
  ["contratos-civiles-comerciales", "Contratos civiles y comerciales"],
  ["certificados-societarios", "Certificados y documentación societaria"],
  ["tramites-organismos", "Trámites ante organismos públicos y/o privados"],
  ["tasaciones", "Tasaciones"]
];

const SERVICES = Object.freeze(Object.fromEntries(SERVICE_DEFINITIONS));

function isoDateInTimeZone(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return null;
  }

  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function isBookableDate(dateString, today = isoDateInTimeZone()) {
  const date = parseDate(dateString);
  const start = parseDate(today);

  if (!date || !start) {
    return false;
  }

  const day = date.getUTCDay();
  const diff = Math.round((date - start) / 86400000);
  return day >= 1 && day <= 5 && diff >= 0 && diff <= HORIZON_DAYS;
}

function dateRange(from, to, today = isoDateInTimeZone()) {
  const start = parseDate(from);
  const end = parseDate(to);
  const minimum = parseDate(today);

  if (!start || !end || !minimum || start > end || start < minimum) {
    return [];
  }

  const maximum = addDays(minimum, HORIZON_DAYS);
  if (end > maximum) {
    return [];
  }

  const values = [];
  for (let date = start; date <= end; date = addDays(date, 1)) {
    values.push(date.toISOString().slice(0, 10));
  }
  return values;
}

function isValidService(value) {
  return Object.hasOwn(SERVICES, value);
}

function cleanText(value, max) {
  return typeof value === "string"
    ? value.trim().replace(/[\u0000-\u001f]/g, " ").slice(0, max)
    : "";
}

function slotsForDate(date, today = isoDateInTimeZone()) {
  if (!isBookableDate(date, today)) {
    return [];
  }

  const slots = [];
  const windows = [["09:30", "12:30"], ["15:00", "19:00"]];

  for (const [start, end] of windows) {
    const firstMinute = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
    const lastMinute = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));

    for (
      let minutes = firstMinute;
      minutes + DEFAULT_DURATION_MINUTES <= lastMinute;
      minutes += DEFAULT_DURATION_MINUTES
    ) {
      const endMinutes = minutes + DEFAULT_DURATION_MINUTES;
      const startTime = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
      slots.push({
        start: `${date}T${startTime}:00-03:00`,
        end: `${date}T${endTime}:00-03:00`
      });
    }
  }

  return slots;
}

function validateBooking(input, now = new Date()) {
  const value = input || {};
  const errors = {};
  const serviceCode = cleanText(value.serviceCode, 80);
  const start = cleanText(value.start, 40);
  const name = cleanText(value.name, 120);
  const email = cleanText(value.email, 254).toLowerCase();
  const phone = cleanText(value.phone, 40);
  const details = cleanText(value.details, 400);
  const idempotencyKey = cleanText(value.idempotencyKey, 128);
  const today = isoDateInTimeZone(now);

  if (!isValidService(serviceCode)) {
    errors.serviceCode = "Trámite inválido.";
  }

  const isRfc3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(start);
  const matchesSlot = isRfc3339 && slotsForDate(start.slice(0, 10), today)
    .some((slot) => slot.start === start);
  const startDate = isRfc3339 ? new Date(start) : null;

  if (!matchesSlot || !startDate || Number.isNaN(startDate.getTime()) || startDate <= now) {
    errors.start = "Horario inválido o ya transcurrido.";
  }

  if (name.length < 2) errors.name = "Ingresá tu nombre.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Ingresá un correo válido.";
  if (phone.length < 6) errors.phone = "Ingresá un teléfono válido.";
  if (!details) errors.details = "Contanos brevemente qué necesitás consultar.";
  else if (typeof value.details === "string" && value.details.trim().length > 400) {
    errors.details = "La explicación no puede superar los 400 caracteres.";
  }
  if (value.consent !== true) errors.consent = "Necesitamos tu consentimiento para reservar.";
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
    errors.idempotencyKey = "Intento de reserva inválido.";
  }

  return {
    valid: !Object.keys(errors).length,
    errors,
    value: { serviceCode, start, name, email, phone, details, consent: true, idempotencyKey }
  };
}

module.exports = {
  TIME_ZONE,
  HORIZON_DAYS,
  DEFAULT_DURATION_MINUTES,
  SERVICES,
  isoDateInTimeZone,
  isBookableDate,
  dateRange,
  isValidService,
  validateBooking,
  slotsForDate
};
