"use strict";

/*
  Reglas de la agenda en línea. El servidor es el único que decide qué
  horarios se ofrecen y cuáles se aceptan: el navegador solo muestra lo que
  devuelve /api/availability.

  Dos reglas se cambian sin tocar código, con variables de entorno de Vercel
  (después hay que volver a desplegar para que tomen efecto):

  - BOOKING_MIN_NOTICE_HOURS: anticipación mínima para reservar, en horas.
  - BOOKING_DURATION_MINUTES: duración de cada turno, en minutos.

  Si la variable no existe se usa el valor por defecto. Si existe pero no es un
  entero válido, la agenda se apaga (503) y el error queda en los logs: es
  preferible a ofrecer horarios con una regla que nadie eligió.
*/

const TIME_ZONE = "America/Montevideo";
// Uruguay no usa horario de verano desde 2015: el desfase es fijo.
const UTC_OFFSET = "-03:00";
const HORIZON_DAYS = 45;
const OPENING_WINDOWS = Object.freeze([
  ["09:30", "12:30"],
  ["15:00", "19:00"]
]);
const DEFAULT_MIN_NOTICE_HOURS = 24;
const DEFAULT_DURATION_MINUTES = 45;
const DEFAULT_SERVICE = "Consulta notarial";

// Debe coincidir con los data-service de index.html (lo verifica una prueba).
const SERVICES = Object.freeze([
  DEFAULT_SERVICE,
  "Compromiso de compraventa",
  "Título automotor",
  "Carta Poder",
  "Prenda",
  "Leasing",
  "Promesas y cesiones",
  "Compraventas y estudio de antecedentes",
  "Hipotecas y/o Cancelación",
  "Arrendamientos y garantías",
  "Sucesiones",
  "Testamentos",
  "Particiones",
  "Cesión de Derechos Hereditarios",
  "Certificación de firmas",
  "Certificación de situaciones jurídicas",
  "Poderes",
  "Declaraciones juradas",
  "Minuta notarial BPS",
  "Constitución de sociedades",
  "Contratos civiles y comerciales",
  "Certificados y documentación societaria",
  "Trámites ante organismos públicos y/o privados",
  "Tasaciones"
]);

const LIMITS = Object.freeze({ name: 120, email: 254, phone: 40, details: 400 });

function readWholeNumber(env, key, fallback, max) {
  const raw = env[key];
  if (raw === undefined || raw === "") {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > max) {
    const error = new Error(`${key} debe ser un entero entre 0 y ${max}.`);
    error.code = "INVALID_CONFIG";
    throw error;
  }
  return value;
}

function readRules(env = process.env) {
  const durationMinutes = readWholeNumber(
    env,
    "BOOKING_DURATION_MINUTES",
    DEFAULT_DURATION_MINUTES,
    180
  );
  if (durationMinutes === 0) {
    const error = new Error("BOOKING_DURATION_MINUTES no puede ser 0.");
    error.code = "INVALID_CONFIG";
    throw error;
  }

  return {
    durationMinutes,
    minNoticeHours: readWholeNumber(
      env,
      "BOOKING_MIN_NOTICE_HOURS",
      DEFAULT_MIN_NOTICE_HOURS,
      24 * HORIZON_DAYS
    )
  };
}

function todayInMontevideo(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

function addDays(ymd, days) {
  const date = new Date(`${ymd}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isWeekday(ymd) {
  const day = new Date(`${ymd}T12:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

function toMinutes(hhmm) {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
}

function toHhmm(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// Grilla fija del día: los turnos arrancan al abrir cada franja y se suceden sin huecos.
function slotsForDate(ymd, rules) {
  if (!isWeekday(ymd)) {
    return [];
  }

  const slots = [];
  for (const [open, close] of OPENING_WINDOWS) {
    const last = toMinutes(close);
    for (let minute = toMinutes(open); minute + rules.durationMinutes <= last; minute += rules.durationMinutes) {
      slots.push({
        start: `${ymd}T${toHhmm(minute)}:00${UTC_OFFSET}`,
        end: `${ymd}T${toHhmm(minute + rules.durationMinutes)}:00${UTC_OFFSET}`
      });
    }
  }
  return slots;
}

/*
  Días y horarios que se pueden ofrecer ahora: dentro del horizonte y con la
  anticipación mínima cumplida. Los días sin ningún horario reservable no se
  devuelven, para no mostrar fechas enteras tachadas por la anticipación.
*/
function bookableDays(now, rules) {
  const today = todayInMontevideo(now);
  const earliest = now.getTime() + rules.minNoticeHours * 3600000;
  const days = [];

  for (let offset = 0; offset <= HORIZON_DAYS; offset += 1) {
    const date = addDays(today, offset);
    const slots = slotsForDate(date, rules).filter((slot) => Date.parse(slot.start) >= earliest);
    if (slots.length) {
      days.push({ date, slots });
    }
  }
  return days;
}

function findBookableSlot(start, now, rules) {
  if (typeof start !== "string") {
    return null;
  }

  for (const day of bookableDays(now, rules)) {
    const slot = day.slots.find((candidate) => candidate.start === start);
    if (slot) {
      return slot;
    }
  }
  return null;
}

function overlaps(slot, busy) {
  return Date.parse(slot.start) < Date.parse(busy.end) && Date.parse(busy.start) < Date.parse(slot.end);
}

// Solo la consulta admite saltos de línea; en los demás campos cualquier control pasa a espacio.
function cleanText(value, max, { multiline = false } = {}) {
  if (typeof value !== "string") {
    return "";
  }
  const controls = multiline ? /[\u0000-\u0008\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g;
  return value.replace(controls, " ").trim().slice(0, max);
}

function validateBooking(input, now, rules) {
  const value = input && typeof input === "object" ? input : {};
  const errors = {};
  const service = cleanText(value.service, 120);
  const name = cleanText(value.name, LIMITS.name);
  const email = cleanText(value.email, LIMITS.email).toLowerCase();
  const phone = cleanText(value.phone, LIMITS.phone);
  const details = cleanText(value.details, LIMITS.details + 1, { multiline: true });
  const idempotencyKey = cleanText(value.idempotencyKey, 128);
  const slot = findBookableSlot(value.start, now, rules);

  if (!SERVICES.includes(service)) errors.service = "Elegí el motivo de la consulta.";
  if (!slot) errors.start = "Ese horario ya no se puede reservar. Elegí otro.";
  if (name.length < 2) errors.name = "Ingresá tu nombre.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Ingresá un correo válido.";
  if ((phone.match(/\d/g) || []).length < 8) errors.phone = "Ingresá un teléfono válido.";
  if (!details) errors.details = "Contanos brevemente qué necesitás consultar.";
  else if (details.length > LIMITS.details) {
    errors.details = `La explicación no puede superar los ${LIMITS.details} caracteres.`;
  }
  if (value.consent !== true) errors.consent = "Necesitamos tu consentimiento para reservar.";
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
    errors.idempotencyKey = "Intento de reserva inválido.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: { service, slot, name, email, phone, details, idempotencyKey }
  };
}

module.exports = {
  DEFAULT_MIN_NOTICE_HOURS,
  DEFAULT_DURATION_MINUTES,
  DEFAULT_SERVICE,
  HORIZON_DAYS,
  LIMITS,
  SERVICES,
  TIME_ZONE,
  UTC_OFFSET,
  bookableDays,
  findBookableSlot,
  overlaps,
  readRules,
  slotsForDate,
  todayInMontevideo,
  validateBooking
};
