/* Deploy this folder as an Apps Script web app, executing as the calendar owner. */
var BOOKING_TIME_ZONE = "America/Montevideo";
var DEFAULT_DURATION_MINUTES = 45; // Fallback until the business decision is approved.
var OPENING_WINDOWS = [["09:30", "12:30"], ["15:00", "19:00"]];
var HORIZON_DAYS = 45;

function doPost(e) {
  try {
    var envelope = JSON.parse(e.postData.contents || "{}"), request = envelope.payload || {};
    var action = envelope.action;
    validateSignedRequest_(envelope, request);
    if (action === "availability") return json_({ ok: true, data: availability_(request) });
    if (action === "booking") return json_(book_(request));
    return json_({ ok: false, status: 400, message: "Acción inválida." });
  } catch (error) { return json_({ ok: false, status: error.status || 502, message: safeMessage_(error) }); }
}

function availability_(request) {
  validateService_(request.serviceCode); validateRange_(request.from, request.to);
  var days = [], from = dateFromYmd_(request.from), to = dateFromYmd_(request.to);
  var rangeEnd = Utilities.formatDate(addDays_(to, 1), BOOKING_TIME_ZONE, "yyyy-MM-dd") + "T00:00:00-03:00";
  var blockingEvents = eventsBetween_(request.from + "T00:00:00-03:00", rangeEnd);
  for (var day = from; day <= to; day = addDays_(day, 1)) {
    var date = Utilities.formatDate(day, BOOKING_TIME_ZONE, "yyyy-MM-dd");
    if (!isBookableDate_(date)) continue;
    var slots = slotsForDate_(date).map(function (slot) {
      var unavailable = new Date(slot.start) <= new Date() || overlapsEvents_(slot.start, slot.end, blockingEvents);
      return { start: slot.start, end: slot.end, status: unavailable ? "unavailable" : "available" };
    });
    days.push({ date: date, slots: slots });
  }
  return { timeZone: BOOKING_TIME_ZONE, days: days };
}

function book_(request) {
  validateBooking_(request);
  var stored = getIdempotency_(request.idempotencyKey, request); if (stored) return { ok: true, created: false, data: stored };
  var lock = LockService.getScriptLock(); if (!lock.tryLock(10000)) throw statusError_(503, "La agenda está ocupada. Reintentá en unos segundos.");
  try {
    stored = getIdempotency_(request.idempotencyKey, request); if (stored) return { ok: true, created: false, data: stored };
    var end = endFor_(request.start); if (overlapsAny_(request.start, end)) throw statusError_(409, "Ese horario acaba de ocuparse. Elegí otro.");
    var event = CalendarApp.getCalendarById(requiredProperty_("BOOKING_CALENDAR_ID")).createEvent(
      "Consulta notarial — " + SERVICES_()[request.serviceCode],
      new Date(request.start),
      new Date(end),
      {
        description: privateDescription_(request),
        location: getProperty_("BOOKING_LOCATION") || "",
        guests: request.email,
        sendInvites: true
      }
    );
    event.setVisibility(CalendarApp.Visibility.PRIVATE); event.setGuestsCanInviteOthers(false); event.setGuestsCanModify(false);
    var response = { bookingId: event.getId(), start: request.start, end: end, serviceCode: request.serviceCode };
    putIdempotency_(request.idempotencyKey, request, response); return { ok: true, created: true, data: response };
  } finally { lock.releaseLock(); }
}

function validateSignedRequest_(envelope, payload) {
  var timestamp = envelope.timestamp, nonce = envelope.nonce, signature = envelope.signature;
  if (!timestamp || !nonce || !signature || Math.abs(Date.now() - Number(timestamp)) > 300000) throw statusError_(403, "Solicitud vencida.");
  var cache = CacheService.getScriptCache(); if (cache.get("nonce:" + nonce)) throw statusError_(403, "Solicitud repetida.");
  var body = String(envelope.action) + "." + String(timestamp) + "." + nonce + "." + JSON.stringify(payload);
  var expected = bytesToHex_(Utilities.computeHmacSha256Signature(body, requiredProperty_("APPS_SCRIPT_SHARED_SECRET")));
  if (!safeEqual_(expected, signature)) throw statusError_(403, "Firma inválida."); cache.put("nonce:" + nonce, "1", 300);
}

function eventsBetween_(start, end) { return calendarIds_().reduce(function (events, id) { return events.concat(CalendarApp.getCalendarById(id).getEvents(new Date(start), new Date(end)).map(function (event) { return { start: event.getStartTime(), end: event.getEndTime() }; })); }, []); }
function overlapsEvents_(start, end, events) { var slotStart = new Date(start), slotEnd = new Date(end); return events.some(function (event) { return event.start < slotEnd && event.end > slotStart; }); }
function overlapsAny_(start, end) { return overlapsEvents_(start, end, eventsBetween_(start, end)); }
function calendarIds_() { return [requiredProperty_("BOOKING_CALENDAR_ID")].concat((getProperty_("BOOKING_BLOCKING_CALENDAR_IDS") || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean)); }
function slotsForDate_(date) { var duration = durationMinutes_(), slots = []; OPENING_WINDOWS.forEach(function (window) { var current = minutes_(window[0]), last = minutes_(window[1]); for (; current + duration <= last; current += duration) { var time = pad_(Math.floor(current / 60)) + ":" + pad_(current % 60); var end = current + duration; slots.push({ start: date + "T" + time + ":00-03:00", end: date + "T" + pad_(Math.floor(end / 60)) + ":" + pad_(end % 60) + ":00-03:00" }); } }); return slots; }
function validateBooking_(r) { validateService_(r.serviceCode); if (!r.name || r.name.length > 120 || !r.email || r.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email) || !r.phone || r.phone.length > 40 || !r.details || r.details.length > 400 || r.consent !== true || !/^[A-Za-z0-9_-]{16,128}$/.test(r.idempotencyKey || "")) throw statusError_(400, "Datos de reserva inválidos."); if (!isBookableDate_(r.start.slice(0, 10)) || new Date(r.start) <= new Date() || !slotsForDate_(r.start.slice(0, 10)).some(function (slot) { return slot.start === r.start; })) throw statusError_(400, "Horario inválido o ya transcurrido."); }
function validateService_(code) { if (!SERVICES_()[code]) throw statusError_(400, "Trámite inválido."); }
function validateRange_(from, to) { var today = dateFromYmd_(Utilities.formatDate(new Date(), BOOKING_TIME_ZONE, "yyyy-MM-dd")); if (!validYmd_(from) || !validYmd_(to) || dateFromYmd_(from) < today || dateFromYmd_(from) > dateFromYmd_(to) || addDays_(today, HORIZON_DAYS) < dateFromYmd_(to)) throw statusError_(400, "Rango inválido."); }
function isBookableDate_(ymd) { var date = dateFromYmd_(ymd), today = dateFromYmd_(Utilities.formatDate(new Date(), BOOKING_TIME_ZONE, "yyyy-MM-dd")); return date >= today && date <= addDays_(today, HORIZON_DAYS) && date.getDay() > 0 && date.getDay() < 6; }
function endFor_(start) { return new Date(new Date(start).getTime() + durationMinutes_() * 60000).toISOString(); }
function privateDescription_(r) { return "Nombre: " + r.name + "\nTeléfono: " + r.phone + "\nTrámite: " + SERVICES_()[r.serviceCode] + "\nConsulta: " + r.details + "\nID interno: " + r.idempotencyKey; }
function bookingFingerprint_(r) { return bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify({ serviceCode: r.serviceCode, start: r.start, name: r.name, email: r.email, phone: r.phone, details: r.details }))); }
function getIdempotency_(key, request) { var value = PropertiesService.getScriptProperties().getProperty("booking:" + key); if (!value) return null; var stored = JSON.parse(value); if (stored.fingerprint !== bookingFingerprint_(request)) throw statusError_(409, "El intento de reserva corresponde a otros datos. Elegí nuevamente el horario."); return stored.data; }
function putIdempotency_(key, request, value) { PropertiesService.getScriptProperties().setProperty("booking:" + key, JSON.stringify({ fingerprint: bookingFingerprint_(request), data: value })); }
function SERVICES_() { return { "consulta-notarial": "Consulta notarial", "compromiso-compraventa": "Compromiso de compraventa", "titulo-automotor": "Título automotor", "carta-poder": "Carta Poder", "prenda": "Prenda", "leasing": "Leasing", "promesas-cesiones": "Promesas y cesiones", "compraventas-antecedentes": "Compraventas y estudio de antecedentes", "hipotecas-cancelacion": "Hipotecas y/o Cancelación", "arrendamientos-garantias": "Arrendamientos y garantías", "sucesiones": "Sucesiones", "testamentos": "Testamentos", "particiones": "Particiones", "cesion-derechos-hereditarios": "Cesión de Derechos Hereditarios", "certificacion-firmas": "Certificación de firmas", "certificacion-situaciones-juridicas": "Certificación de situaciones jurídicas", "poderes": "Poderes", "declaraciones-juradas": "Declaraciones juradas", "minuta-notarial-bps": "Minuta notarial BPS", "constitucion-sociedades": "Constitución de sociedades", "contratos-civiles-comerciales": "Contratos civiles y comerciales", "certificados-societarios": "Certificados y documentación societaria", "tramites-organismos": "Trámites ante organismos públicos y/o privados", "tasaciones": "Tasaciones" }; }
function getProperty_(key) { return PropertiesService.getScriptProperties().getProperty(key); } function requiredProperty_(key) { var value = getProperty_(key); if (!value) throw statusError_(503, "La agenda aún no está configurada."); return value; } function durationMinutes_() { var configured = Number(getProperty_("BOOKING_DURATION_MINUTES") || DEFAULT_DURATION_MINUTES); return configured > 0 && configured % 1 === 0 ? configured : DEFAULT_DURATION_MINUTES; } function dateFromYmd_(x) { return new Date(x + "T12:00:00"); } function validYmd_(x) { return /^\d{4}-\d{2}-\d{2}$/.test(x || "") && Utilities.formatDate(dateFromYmd_(x), BOOKING_TIME_ZONE, "yyyy-MM-dd") === x; } function addDays_(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; } function minutes_(x) { return Number(x.slice(0,2))*60 + Number(x.slice(3)); } function pad_(n) { return String(n).padStart(2,"0"); } function bytesToHex_(bytes) { return bytes.map(function (byte) { return (byte + 256).toString(16).slice(-2); }).join(""); } function safeEqual_(a, b) { if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false; var result = 0; for (var i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i); return result === 0; } function statusError_(status, message) { var error = new Error(message); error.status = status; return error; } function safeMessage_(error) { return error && error.message || "Servicio temporalmente no disponible."; } function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
