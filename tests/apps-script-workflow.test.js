const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const vm = require("node:vm");

const SCRIPT_SOURCE = fs.readFileSync(
  require.resolve("../google-apps-script/Code.js"),
  "utf8"
);

function asBuffer(value) {
  return Buffer.isBuffer(value) ? value : Buffer.from(Array.isArray(value) ? value : String(value));
}

function buildContext(overrides = {}) {
  let currentNow = new Date("2026-08-01T18:00:00.000Z").getTime();
  const properties = new Map([
    ["BOOKING_CALENDAR_ID", "calendar@example.com"],
    ["BOOKING_LOCATION", "Sarandí 294 esquina 18 de Julio, Rosario"],
    ["BOOKING_APPROVER_EMAIL", "eliana@example.com"],
    ["BOOKING_PUBLIC_URL", "https://example.com/#turnos"],
    ["BOOKING_WHATSAPP_URL", "https://wa.me/59891048471"],
    ["BOOKING_RATE_LIMIT_WINDOW_SECONDS", "3600"],
    ["BOOKING_RATE_LIMIT_MAX", "20"],
    ["BOOKING_RATE_LIMIT_HMAC_SECRET", "test-rate-secret"],
    ["BOOKING_RETENTION_DAYS", "30"],
    ...Object.entries(overrides.properties || {})
  ]);
  const emails = [];
  const events = [];
  const logs = [];
  const triggers = [];
  let eventCounter = 0;
  let uuidCounter = 0;
  let clientMailFailures = 0;
  let calendarFailure = "";
  const propertySetFailures = new Map();

  class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [currentNow]));
    }

    static now() {
      return currentNow;
    }
  }

  function maybeFailCalendar(operation) {
    if (calendarFailure === operation) {
      calendarFailure = "";
      throw new Error(`Simulated ${operation} failure`);
    }
  }

  function createEvent(title, start, end, options = {}) {
    maybeFailCalendar("createEvent");
    const event = {
      id: `event-${++eventCounter}`,
      title,
      start,
      end,
      options: { ...options },
      deleted: false,
      description: options.description || "",
      getId() { return this.id; },
      getStartTime() { return this.start; },
      getEndTime() { return this.end; },
      setVisibility() { maybeFailCalendar("setVisibility"); return this; },
      setTag() { maybeFailCalendar("setTag"); return this; },
      setColor() { maybeFailCalendar("setColor"); return this; },
      setTitle(value) { maybeFailCalendar("setTitle"); this.title = value; return this; },
      setDescription(value) { maybeFailCalendar("setDescription"); this.description = value; return this; },
      deleteEvent() { maybeFailCalendar("deleteEvent"); this.deleted = true; }
    };
    events.push(event);
    return event;
  }

  const calendar = {
    createEvent,
    getEventById(id) {
      return events.find((event) => event.id === id && !event.deleted) || null;
    },
    getEvents(start, end) {
      return events.filter((event) => !event.deleted && event.start < end && event.end > start);
    }
  };

  const scriptProperties = {
    getProperty(key) { return properties.get(key) || null; },
    setProperty(key, value) {
      const failures = propertySetFailures.get(key) || 0;
      if (failures > 0) {
        propertySetFailures.set(key, failures - 1);
        throw new Error(`Simulated setProperty failure for ${key}`);
      }
      properties.set(key, value);
      return this;
    },
    deleteProperty(key) { properties.delete(key); return this; },
    getProperties() { return Object.fromEntries(properties); }
  };

  const context = vm.createContext({
    Date: FixedDate,
    encodeURIComponent,
    JSON,
    Math,
    Number,
    Object,
    RegExp,
    String,
    console: { error(message, metadata) { logs.push({ message, metadata }); } },
    CalendarApp: {
      Visibility: { PRIVATE: "private" },
      EventColor: { YELLOW: "yellow", GREEN: "green" },
      getCalendarById() { return calendar; }
    },
    HtmlService: {
      createHtmlOutput(html) {
        return { html, setTitle() { return this; } };
      }
    },
    LockService: {
      getScriptLock() {
        return { tryLock() { return true; }, releaseLock() {} };
      }
    },
    MailApp: {
      sendEmail(message) {
        if (message.to !== "eliana@example.com" && clientMailFailures > 0) {
          clientMailFailures -= 1;
          throw new Error("Simulated MailApp failure");
        }
        emails.push(message);
      }
    },
    PropertiesService: {
      getScriptProperties() { return scriptProperties; }
    },
    ScriptApp: {
      getService() {
        return { getUrl() { return "https://script.google.com/example/exec"; } };
      },
      getProjectTriggers() { return triggers; },
      newTrigger(handler) {
        return {
          timeBased() { return this; },
          everyHours(hours) { this.hours = hours; return this; },
          create() {
            triggers.push({ getHandlerFunction() { return handler; }, hours: this.hours });
          }
        };
      }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      computeDigest(_algorithm, value) {
        return Array.from(crypto.createHash("sha256").update(asBuffer(value)).digest());
      },
      computeHmacSha256Signature(value, secret) {
        return Array.from(crypto.createHmac("sha256", asBuffer(secret)).update(asBuffer(value)).digest());
      },
      newBlob(value) {
        return { getBytes() { return Array.from(Buffer.from(String(value))); } };
      },
      formatDate(date, _timeZone, pattern) {
        const iso = new Date(date).toISOString();
        if (pattern === "yyyy-MM-dd") return iso.slice(0, 10);
        if (pattern.includes("dd/MM/yyyy")) {
          return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} a las ${iso.slice(11, 16)}`;
        }
        return iso;
      },
      getUuid() {
        uuidCounter += 1;
        return `12345678-1234-1234-1234-${String(uuidCounter).padStart(12, "0")}`;
      }
    }
  });

  vm.runInContext(SCRIPT_SOURCE, context, { filename: "Code.js" });
  return {
    calendar,
    context,
    emails,
    events,
    logs,
    properties,
    triggers,
    controls: {
      advance(milliseconds) { currentNow += milliseconds; },
      failClientMail(times = 1) { clientMailFailures = times; },
      failCalendar(operation) { calendarFailure = operation; },
      failPropertySet(key, times = 1) { propertySetFailures.set(key, times); }
    }
  };
}

function request(overrides = {}) {
  return {
    serviceCode: "testamentos",
    start: "2026-08-28T15:45:00-03:00",
    name: "Francisco Long",
    email: "francisco@example.com",
    phone: "+598 98 289 405",
    details: "Quisiera solicitar un turno para consultar por un testamento.",
    consent: true,
    idempotencyKey: "abcdefghijklmnop",
    rateLimitSubject: "203.0.113.10",
    ...overrides
  };
}

function approvalToken(properties) {
  return [...properties.keys()].find((key) => key.startsWith("approval:")).slice(9);
}

function approvalRecord(properties, token = approvalToken(properties)) {
  return JSON.parse(properties.get(`approval:${token}`));
}

test("la solicitud pendiente crea un único evento privado sin invitar al cliente", () => {
  const { context, emails, events, properties } = buildContext();
  const result = context.book_(request());

  assert.equal(result.data.status, "pending");
  assert.equal(events.length, 1);
  assert.match(events[0].title, /^PENDIENTE/);
  assert.equal(events[0].options.guests, undefined);
  assert.equal(events[0].options.sendInvites, undefined);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].to, "eliana@example.com");
  assert.match(emails[0].body, /Correo: francisco@example\.com/);
  assert.equal(emails[0].replyTo, "francisco@example.com");
  assert.ok(approvalToken(properties));
});

test("un reintento idempotente devuelve la misma solicitud sin duplicar el evento ni el correo", () => {
  const { context, emails, events } = buildContext();
  const first = context.book_(request());
  const retry = context.book_(request());

  assert.equal(first.created, true);
  assert.equal(retry.created, false);
  assert.equal(retry.data.bookingId, first.data.bookingId);
  assert.equal(events.length, 1);
  assert.equal(emails.length, 1);
});

test("si falla la configuración privada del evento, elimina el bloqueo huérfano", () => {
  const { context, controls, emails, events, properties } = buildContext();
  controls.failCalendar("setTag");

  assert.throws(
    () => context.book_(request()),
    (error) => error.status === 502 && /no fue creada/.test(error.message)
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].deleted, true);
  assert.equal([...properties.keys()].some((key) => key.startsWith("approval:")), false);
  assert.equal(properties.has("booking:abcdefghijklmnop"), false);
  assert.equal(emails.length, 0);
});

test("dos solicitudes para el mismo horario: sólo una prospera", () => {
  const { context, events } = buildContext();
  context.book_(request());

  assert.throws(
    () => context.book_(request({
      email: "otra@example.com",
      phone: "099 000 001",
      idempotencyKey: "qrstuvwxyzabcdef",
      rateLimitSubject: "203.0.113.11"
    })),
    (error) => error.status === 409
  );
  assert.equal(events.filter((event) => !event.deleted).length, 1);
});

test("Calendar falla antes de la notificación: conserva approving y no envía correo al cliente", () => {
  const { context, controls, emails, events, properties } = buildContext();
  context.book_(request());
  controls.failCalendar("setTitle");

  assert.throws(() => context.decideApproval_(approvalToken(properties), "approve", ""));
  assert.equal(approvalRecord(properties).status, "approving");
  assert.match(events[0].title, /^PENDIENTE/);
  assert.equal(emails.length, 1);
});

test("aprobar actualiza Calendar antes de enviar y el reintento no duplica el correo", () => {
  const { context, emails, events, properties } = buildContext();
  context.book_(request());
  const token = approvalToken(properties);
  const result = context.decideApproval_(token, "approve", "");
  const retry = context.decideApproval_(token, "approve", "");

  assert.equal(result.status, "notification_sent");
  assert.equal(result.decision, "confirmed");
  assert.equal(retry.status, "notification_sent");
  assert.equal(events[0].deleted, false);
  assert.doesNotMatch(events[0].title, /^PENDIENTE/);
  assert.match(events[0].description, /Confirmado por Eliana/);
  assert.equal(events[0].options.guests, undefined);
  assert.equal(emails.filter((email) => email.to === "francisco@example.com").length, 1);
  assert.match(emails[1].body, /Trámite: Testamentos/);
  assert.match(emails[1].body, /quedó confirmado/);
  assert.match(emails[1].body, /Lugar:/);
});

test("no confirma una hora distinta si el bloqueo fue movido manualmente en Calendar", () => {
  const { context, emails, events, properties } = buildContext();
  context.book_(request());
  const token = approvalToken(properties);
  const originalStart = events[0].start;
  events[0].start = new Date("2026-08-28T16:30:00-03:00");

  assert.throws(
    () => context.decideApproval_(token, "approve", ""),
    (error) => error.status === 409 && /modificado en Calendar/.test(error.message)
  );
  assert.equal(approvalRecord(properties, token).status, "pending");
  assert.equal(emails.filter((email) => email.to === "francisco@example.com").length, 0);

  events[0].start = originalStart;
  assert.equal(context.decideApproval_(token, "approve", "").status, "notification_sent");
  assert.equal(emails.filter((email) => email.to === "francisco@example.com").length, 1);
});

test("si falla la idempotencia después de Calendar, el reintento la sincroniza antes del correo", () => {
  const { context, controls, emails, events, properties } = buildContext();
  context.book_(request());
  const token = approvalToken(properties);
  controls.failPropertySet("booking:abcdefghijklmnop");

  assert.throws(
    () => context.decideApproval_(token, "approve", ""),
    /Simulated setProperty failure/
  );
  assert.equal(approvalRecord(properties, token).status, "confirmed");
  assert.doesNotMatch(events[0].title, /^PENDIENTE/);
  assert.equal(JSON.parse(properties.get("booking:abcdefghijklmnop")).data.status, "pending");
  assert.equal(emails.filter((email) => email.to === "francisco@example.com").length, 0);

  const retry = context.decideApproval_(token, "approve", "");

  assert.equal(retry.status, "notification_sent");
  assert.equal(JSON.parse(properties.get("booking:abcdefghijklmnop")).data.status, "confirmed");
  assert.equal(emails.filter((email) => email.to === "francisco@example.com").length, 1);
});

test("MailApp falla después de confirmar: persiste notification_pending y la página no afirma envío", () => {
  const { context, controls, emails, events, logs, properties } = buildContext();
  context.book_(request());
  controls.failClientMail();
  const token = approvalToken(properties);
  const result = context.decideApproval_(token, "approve", "");
  const page = context.approvalResultPage_(result, token);

  assert.equal(result.status, "notification_pending");
  assert.equal(result.decision, "confirmed");
  assert.doesNotMatch(events[0].title, /^PENDIENTE/);
  assert.equal(emails.length, 1);
  assert.match(page.html, /correo pendiente/i);
  assert.doesNotMatch(page.html, /correo de confirmación fue enviado/);
  assert.equal(logs[0].metadata.operation, "client_notification");
  assert.equal(JSON.stringify(logs).includes("francisco@example.com"), false);
});

test("el reintento de una notificación fallida envía un solo correo", () => {
  const { context, controls, emails, properties } = buildContext();
  context.book_(request());
  const token = approvalToken(properties);
  controls.failClientMail();
  context.decideApproval_(token, "approve", "");
  context.decideApproval_(token, "approve", "");
  context.decideApproval_(token, "approve", "");

  assert.equal(emails.filter((email) => email.to === "francisco@example.com").length, 1);
  assert.equal(approvalRecord(properties, token).status, "notification_sent");
});

test("rechazar elimina el evento antes del correo e incluye nota y trámite", () => {
  const { context, emails, events, properties } = buildContext();
  context.book_(request());
  const result = context.decideApproval_(
    approvalToken(properties),
    "reject",
    "Ese horario no me es posible; elegí uno después de las 17:00."
  );

  assert.equal(result.status, "notification_sent");
  assert.equal(result.decision, "rejected");
  assert.equal(events[0].deleted, true);
  assert.match(emails[1].body, /Nota de Eliana:/);
  assert.match(emails[1].body, /después de las 17:00/);
  assert.match(emails[1].body, /Trámite: Testamentos/);
  assert.match(emails[1].body, /WhatsApp/);
});

test("rechazar sin nota no inventa una nota y libera el horario", () => {
  const { context, emails, events, properties } = buildContext();
  context.book_(request());
  context.decideApproval_(approvalToken(properties), "reject", "");

  assert.equal(events[0].deleted, true);
  assert.doesNotMatch(emails[1].body, /Nota de Eliana:/);
  assert.match(emails[1].body, /Trámite: Testamentos/);
});

test("la pantalla y el correo de revisión escapan HTML y no deciden al abrir", () => {
  const { context, emails, events, properties } = buildContext();
  context.book_(request({ name: "Francisco <Long>" }));
  const page = context.approvalPage_(approvalToken(properties));

  assert.match(page.html, /textarea/);
  assert.match(page.html, /maxlength="500"/);
  assert.match(page.html, /Francisco &lt;Long&gt;/);
  assert.match(emails[0].htmlBody, /Francisco &lt;Long&gt;/);
  assert.doesNotMatch(emails[0].htmlBody, /Francisco <Long>/);
  assert.match(events[0].title, /^PENDIENTE/);
  assert.equal(events[0].deleted, false);
});

test("el mantenimiento vence solicitudes, libera el horario y deja el aviso reintentable", () => {
  const { context, controls, emails, events, properties } = buildContext();
  context.book_(request());
  const token = approvalToken(properties);
  const key = `approval:${token}`;
  const approval = approvalRecord(properties, token);
  approval.expiresAt = 0;
  properties.set(key, JSON.stringify(approval));
  controls.failClientMail();

  const summary = context.maintainBookingWorkflow();

  assert.equal(summary.expired, 1);
  assert.equal(events[0].deleted, true);
  assert.equal(approvalRecord(properties, token).status, "notification_pending");
  assert.equal(approvalRecord(properties, token).decision, "expired");
  assert.equal(emails.length, 1);

  context.maintainBookingWorkflow();
  assert.equal(approvalRecord(properties, token).status, "notification_sent");
  assert.equal(emails.filter((email) => email.to === "francisco@example.com").length, 1);
});

test("la retención elimina decisiones finales e idempotencia, pero no solicitudes pendientes", () => {
  const { context, properties } = buildContext({ properties: { BOOKING_RETENTION_DAYS: "1" } });
  context.book_(request());
  const finalToken = approvalToken(properties);
  context.decideApproval_(finalToken, "approve", "");
  const finalApproval = approvalRecord(properties, finalToken);
  finalApproval.updatedAt = 0;
  finalApproval.notificationSentAt = 0;
  properties.set(`approval:${finalToken}`, JSON.stringify(finalApproval));
  const finalBooking = JSON.parse(properties.get("booking:abcdefghijklmnop"));
  finalBooking.updatedAt = 0;
  finalBooking.createdAt = 0;
  properties.set("booking:abcdefghijklmnop", JSON.stringify(finalBooking));

  context.book_(request({
    start: "2026-08-28T16:30:00-03:00",
    email: "pendiente@example.com",
    phone: "099 000 002",
    idempotencyKey: "pendingabcdefghij",
    rateLimitSubject: "203.0.113.12"
  }));
  const pendingKey = [...properties.keys()].find((key) => key.startsWith("approval:") && key !== `approval:${finalToken}`);
  const pending = JSON.parse(properties.get(pendingKey));
  pending.createdAt = 0;
  pending.updatedAt = 0;
  properties.set(pendingKey, JSON.stringify(pending));

  context.cleanupRetainedProperties_(false);

  assert.equal(properties.has(`approval:${finalToken}`), false);
  assert.equal(properties.has("booking:abcdefghijklmnop"), false);
  assert.equal(properties.has(pendingKey), true);
  assert.equal(properties.has("booking:pendingabcdefghij"), true);
});

test("el rate limit es compartido, serializado, usa HMAC y responde 429", () => {
  const { context, properties } = buildContext({ properties: { BOOKING_RATE_LIMIT_MAX: "1" } });
  context.book_(request());

  assert.throws(
    () => context.book_(request({ start: "2026-08-28T16:30:00-03:00", idempotencyKey: "qrstuvwxyzabcdef" })),
    (error) => error.status === 429
  );
  const rateKey = [...properties.keys()].find((key) => key.startsWith("rate:"));
  assert.ok(rateKey);
  assert.equal(rateKey.includes("francisco@example.com"), false);
  assert.equal(rateKey.includes("203.0.113.10"), false);
});

test("si falta la configuración de rate limit, la creación falla cerrada", () => {
  const { context, properties } = buildContext();
  properties.delete("BOOKING_RATE_LIMIT_MAX");
  assert.throws(() => context.book_(request()), (error) => error.status === 503);
});

test("los errores técnicos inesperados no exponen datos internos al navegador", () => {
  const { context } = buildContext();
  assert.equal(
    context.safeMessage_(new Error("calendar@example.com: internal backend failure")),
    "Servicio temporalmente no disponible."
  );
  assert.equal(
    context.safeMessage_(context.statusError_(409, "Ese horario acaba de ocuparse.")),
    "Ese horario acaba de ocuparse."
  );
});

test("la disponibilidad sólo devuelve franjas y nunca revela detalles de eventos", () => {
  const { calendar, context } = buildContext();
  calendar.createEvent(
    "Nombre privado de otra persona",
    new Date("2026-08-28T15:45:00-03:00"),
    new Date("2026-08-28T16:30:00-03:00"),
    { description: "correo-privado@example.com" }
  );
  const result = context.availability_({
    serviceCode: "consulta-notarial",
    from: "2026-08-28",
    to: "2026-08-28"
  });
  const serialized = JSON.stringify(result);

  assert.match(serialized, /unavailable/);
  assert.equal(serialized.includes("Nombre privado"), false);
  assert.equal(serialized.includes("correo-privado@example.com"), false);
});

test("la instalación del trigger es manual e idempotente", () => {
  const { context, triggers } = buildContext();
  assert.equal(context.installBookingMaintenanceTrigger().installed, true);
  assert.equal(triggers.length, 1);
  assert.equal(triggers[0].hours, 1);
  assert.equal(context.installBookingMaintenanceTrigger().installed, false);
  assert.equal(triggers.length, 1);
});

test("rechazar no admite notas mayores a 500 caracteres", () => {
  const { context, emails, events, properties } = buildContext();
  context.book_(request());

  assert.throws(
    () => context.decideApproval_(approvalToken(properties), "reject", "a".repeat(501)),
    /500 caracteres/
  );
  assert.equal(events[0].deleted, false);
  assert.match(events[0].title, /^PENDIENTE/);
  assert.equal(emails.length, 1);
});
