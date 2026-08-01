/* Deploy this folder as an Apps Script web app, executing as the calendar owner. */
var BOOKING_TIME_ZONE = "America/Montevideo";
var DEFAULT_DURATION_MINUTES = 45; // Fallback until the business decision is approved.
var DEFAULT_APPROVAL_HOLD_HOURS = 24;
var DEFAULT_RETENTION_DAYS = 30;
var OPENING_WINDOWS = [["09:30", "12:30"], ["15:00", "19:00"]];
var HORIZON_DAYS = 45;
var MAINTENANCE_HANDLER = "maintainBookingWorkflow";

function doGet(e) {
  return approvalPage_(e && e.parameter && e.parameter.approvalToken);
}

function doPost(e) {
  if (e && e.parameter && e.parameter.approvalToken) {
    return handleApprovalPost_(e.parameter.approvalToken, e.parameter.decision, e.parameter.note);
  }
  try {
    var envelope = JSON.parse(e.postData.contents || "{}");
    var payloadJson = typeof envelope.payloadJson === "string" ? envelope.payloadJson : JSON.stringify(envelope.payload || {});
    var request = JSON.parse(payloadJson);
    var action = envelope.action;
    validateSignedRequest_(envelope, payloadJson);
    if (action === "availability") return json_({ ok: true, data: availability_(request) });
    if (action === "booking") return json_(book_(request));
    return json_({ ok: false, status: 400, message: "Acción inválida." });
  } catch (error) {
    return json_({ ok: false, status: error.status || 502, message: safeMessage_(error) });
  }
}

function availability_(request) {
  validateService_(request.serviceCode);
  validateRange_(request.from, request.to);
  expirePendingApprovals_(false);
  var days = [];
  var from = dateFromYmd_(request.from);
  var to = dateFromYmd_(request.to);
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
  var rateConfig = rateLimitConfig_(); // Required when the Vercel booking gate is enabled.
  var stored = getIdempotency_(request.idempotencyKey, request);
  if (stored) return { ok: true, created: false, data: stored };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw statusError_(503, "La agenda está ocupada. Reintentá en unos segundos.");
  try {
    stored = getIdempotency_(request.idempotencyKey, request);
    if (stored) return { ok: true, created: false, data: stored };
    enforceRateLimit_(request, rateConfig);
    expirePendingApprovals_(true);

    var end = endFor_(request.start);
    if (overlapsAny_(request.start, end)) {
      throw statusError_(409, "Ese horario acaba de ocuparse. Elegí otro.");
    }

    var calendarId = requiredProperty_("BOOKING_CALENDAR_ID");
    var calendar = CalendarApp.getCalendarById(calendarId);
    var token = approvalToken_();
    var cleanRequest = persistedRequest_(request);
    var event = calendar.createEvent(
      "PENDIENTE — Consulta notarial — " + SERVICES_()[cleanRequest.serviceCode],
      new Date(cleanRequest.start),
      new Date(end),
      {
        description: "Estado: Pendiente de confirmación de Eliana\n" + privateDescription_(cleanRequest),
        location: getProperty_("BOOKING_LOCATION") || ""
      }
    );
    try {
      event.setVisibility(CalendarApp.Visibility.PRIVATE);
      event.setTag("bookingApprovalToken", token);
      if (CalendarApp.EventColor && CalendarApp.EventColor.YELLOW) event.setColor(CalendarApp.EventColor.YELLOW);
    } catch (error) {
      try { event.deleteEvent(); } catch (cleanupError) {
        logTechnicalFailure_("rollback_unconfigured_event", { status: "pending", decision: null }, cleanupError);
      }
      throw statusError_(502, "No se pudo preparar el bloqueo provisional. La solicitud no fue creada.");
    }

    var now = Date.now();
    var response = {
      bookingId: event.getId(),
      start: cleanRequest.start,
      end: end,
      serviceCode: cleanRequest.serviceCode,
      status: "pending"
    };
    var approval = {
      status: "pending",
      decision: null,
      calendarId: calendarId,
      pendingEventId: event.getId(),
      request: cleanRequest,
      start: cleanRequest.start,
      end: end,
      createdAt: now,
      updatedAt: now,
      expiresAt: Math.min(now + approvalHoldHours_() * 3600000, new Date(cleanRequest.start).getTime())
    };
    var properties = PropertiesService.getScriptProperties();
    try {
      storeApproval_(token, approval);
      putIdempotency_(cleanRequest.idempotencyKey, cleanRequest, response);
      notifyApprover_(token, approval);
    } catch (error) {
      properties.deleteProperty(approvalKey_(token));
      properties.deleteProperty(bookingKey_(cleanRequest.idempotencyKey));
      try { event.deleteEvent(); } catch (cleanupError) {
        logTechnicalFailure_("rollback_pending_event", approval, cleanupError);
      }
      throw statusError_(502, "No se pudo avisar a Eliana. La solicitud no fue creada.");
    }
    return { ok: true, created: true, data: response };
  } finally {
    lock.releaseLock();
  }
}

function handleApprovalPost_(token, decision, note) {
  try {
    return approvalResultPage_(decideApproval_(token, decision, note), token);
  } catch (error) {
    return htmlPage_(
      "No pudimos procesar la solicitud",
      "<p>" + htmlEscape_(safeMessage_(error)) + "</p><p>No se informó ninguna decisión nueva al cliente. Podés volver al correo e intentarlo nuevamente.</p>"
    );
  }
}

function decideApproval_(token, decision, note) {
  if (!validApprovalToken_(token) || (decision !== "approve" && decision !== "reject")) {
    throw statusError_(400, "La acción de aprobación no es válida.");
  }
  note = String(note || "").trim();
  if (note.length > 500) throw statusError_(400, "La nota no puede superar los 500 caracteres.");

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw statusError_(503, "La agenda está ocupada. Reintentá en unos segundos.");
  try {
    var approval = approvalByToken_(token);
    if (!approval) throw statusError_(404, "La solicitud no existe o el enlace venció.");

    if (approval.status === "pending") {
      if (Date.now() >= approval.expiresAt) {
        approval = beginDecision_(token, approval, "expired", "");
      } else {
        if (decision === "approve") assertPendingEventMatches_(approval);
        approval = beginDecision_(token, approval, decision === "approve" ? "confirmed" : "rejected", note);
      }
    } else if (approval.decision && approval.decision !== "expired") {
      var requestedDecision = decision === "approve" ? "confirmed" : "rejected";
      if (approval.decision !== requestedDecision) {
        throw statusError_(409, "La solicitud ya tiene una decisión diferente y no se modificó.");
      }
    }

    return resumeApproval_(token, approval);
  } finally {
    lock.releaseLock();
  }
}

function beginDecision_(token, approval, decision, note) {
  approval.status = decision === "confirmed" ? "approving" : "rejecting";
  approval.decision = decision;
  approval.decisionNote = decision === "rejected" ? note : "";
  approval.decisionStartedAt = Date.now();
  approval.updatedAt = Date.now();
  storeApproval_(token, approval); // Persist intent before touching Calendar.
  return approval;
}

function resumeApproval_(token, approval) {
  if (approval.status === "approving" || approval.status === "rejecting") {
    approval = applyCalendarDecision_(token, approval);
  }
  if (approval.status === "confirmed" || approval.status === "rejected") {
    syncDecisionIdempotency_(approval);
    approval = queueClientNotification_(token, approval);
  }
  if (approval.status === "notification_pending") {
    approval = sendPendingNotification_(token, approval);
  }
  return approval;
}

function applyCalendarDecision_(token, approval) {
  var request = approval.request;
  var calendar = CalendarApp.getCalendarById(approval.calendarId);
  var pendingEvent = calendar.getEventById(approval.pendingEventId);

  if (approval.status === "approving") {
    if (!pendingEvent) {
      throw statusError_(409, "El bloqueo pendiente ya no existe en el calendario. La confirmación no fue enviada.");
    }
    assertEventMatchesApproval_(pendingEvent, approval);
    pendingEvent.setTitle("Consulta notarial — " + SERVICES_()[request.serviceCode]);
    pendingEvent.setDescription("Estado: Confirmado por Eliana\n" + privateDescription_(request));
    if (CalendarApp.EventColor && CalendarApp.EventColor.GREEN) pendingEvent.setColor(CalendarApp.EventColor.GREEN);
  } else if (pendingEvent) {
    pendingEvent.deleteEvent();
  }

  var finalStatus = approval.decision === "confirmed" ? "confirmed" : "rejected";
  approval.status = finalStatus;
  approval.calendarUpdatedAt = Date.now();
  approval.decidedAt = Date.now();
  approval.updatedAt = Date.now();
  storeApproval_(token, approval);
  return approval;
}

function assertPendingEventMatches_(approval) {
  var calendar = CalendarApp.getCalendarById(approval.calendarId);
  var pendingEvent = calendar.getEventById(approval.pendingEventId);
  if (!pendingEvent) {
    throw statusError_(409, "El bloqueo pendiente ya no existe en el calendario. El turno no fue confirmado.");
  }
  assertEventMatchesApproval_(pendingEvent, approval);
}

function assertEventMatchesApproval_(event, approval) {
  var expectedStart = new Date(approval.start).getTime();
  var expectedEnd = new Date(approval.end).getTime();
  if (event.getStartTime().getTime() !== expectedStart || event.getEndTime().getTime() !== expectedEnd) {
    throw statusError_(409, "El horario del bloqueo fue modificado en Calendar. Restauralo o rechazá la solicitud; no se confirmó ningún turno.");
  }
}

function syncDecisionIdempotency_(approval) {
  var request = approval.request;
  var responseStatus = approval.decision === "expired" ? "expired" : approval.status;
  putIdempotency_(request.idempotencyKey, request, {
    bookingId: approval.pendingEventId,
    start: approval.start,
    end: approval.end,
    serviceCode: request.serviceCode,
    status: responseStatus
  });
}

function queueClientNotification_(token, approval) {
  approval.status = "notification_pending";
  approval.notificationType = approval.decision;
  approval.notificationPendingAt = approval.notificationPendingAt || Date.now();
  approval.updatedAt = Date.now();
  storeApproval_(token, approval);
  return approval;
}

function sendPendingNotification_(token, approval) {
  try {
    if (approval.notificationType === "confirmed") {
      notifyClientApproved_(approval.request, approval);
    } else if (approval.notificationType === "rejected") {
      notifyClientRejected_(approval.request, approval, approval.decisionNote || "");
    } else {
      notifyClientExpired_(approval.request, approval);
    }
  } catch (error) {
    approval.notificationLastFailureAt = Date.now();
    approval.updatedAt = Date.now();
    storeApproval_(token, approval);
    logTechnicalFailure_("client_notification", approval, error);
    return approval;
  }

  approval.status = "notification_sent";
  approval.notificationSentAt = Date.now();
  approval.updatedAt = Date.now();
  redactApprovalPii_(approval);
  storeApproval_(token, approval);
  return approval;
}

function redactApprovalPii_(approval) {
  delete approval.request;
  delete approval.decisionNote;
  delete approval.notificationLastFailureAt;
}

function approvalPage_(token) {
  var approval = validApprovalToken_(token) ? approvalByToken_(token) : null;
  if (!approval) return htmlPage_("Solicitud no disponible", "<p>El enlace no es válido o la solicitud ya no está disponible.</p>");
  if (approval.status !== "pending") return approvalResultPage_(approval, token);

  if (Date.now() >= approval.expiresAt) {
    var lock = LockService.getScriptLock();
    if (lock.tryLock(10000)) {
      try {
        approval = beginDecision_(token, approval, "expired", "");
        approval = resumeApproval_(token, approval);
      } finally {
        lock.releaseLock();
      }
    }
    return approvalResultPage_(approval, token);
  }

  var request = approval.request;
  var action = htmlEscape_(ScriptApp.getService().getUrl());
  var details = "<dl>" +
    "<dt>Solicitante</dt><dd>" + htmlEscape_(request.name) + "</dd>" +
    "<dt>Fecha y hora</dt><dd>" + htmlEscape_(formatWhen_(approval.start)) + "</dd>" +
    "<dt>Trámite</dt><dd>" + htmlEscape_(SERVICES_()[request.serviceCode]) + "</dd>" +
    "<dt>Teléfono</dt><dd>" + htmlEscape_(request.phone) + "</dd>" +
    "<dt>Correo</dt><dd>" + htmlEscape_(request.email) + "</dd>" +
    "<dt>Consulta</dt><dd>" + htmlEscape_(request.details) + "</dd></dl>";
  var form = "<form method=\"post\" action=\"" + action + "\">" +
    "<input type=\"hidden\" name=\"approvalToken\" value=\"" + htmlEscape_(token) + "\">" +
    "<label for=\"note\">Nota para el cliente <span>(opcional, se usa al rechazar)</span></label>" +
    "<textarea id=\"note\" name=\"note\" maxlength=\"500\" placeholder=\"Ej.: Ese horario no me es posible; si querés, elegí uno después de las 17:00.\"></textarea>" +
    "<div class=\"actions\"><button class=\"approve\" name=\"decision\" value=\"approve\">Confirmar turno</button>" +
    "<button class=\"reject\" name=\"decision\" value=\"reject\">Rechazar horario</button></div></form>";
  return htmlPage_(
    "Revisar solicitud de turno",
    "<p>El horario está bloqueado provisionalmente. El cliente recibirá un correo sólo después de completar la decisión en Calendar.</p>" + details + form
  );
}

function approvalResultPage_(approval, token) {
  if (!approval) return htmlPage_("Solicitud no disponible", "<p>La solicitud ya no está disponible.</p>");
  if (approval.status === "approving" || approval.status === "rejecting") {
    return htmlPage_("Decisión pendiente de completar", "<p>La intención quedó guardada, pero Calendar todavía no terminó de actualizarse. No se envió ningún correo al cliente.</p>");
  }
  if (approval.status === "confirmed" || approval.status === "rejected" || approval.status === "notification_pending") {
    var decisionText = approval.decision === "confirmed"
      ? "El turno quedó confirmado en Calendar."
      : "El horario fue liberado en Calendar.";
    var retry = approval.decision === "expired" || !token ? "" : notificationRetryForm_(token, approval.decision);
    return htmlPage_(
      "Decisión registrada; correo pendiente",
      "<p>" + decisionText + " El correo al cliente todavía no pudo enviarse. El mantenimiento automático volverá a intentarlo.</p>" + retry
    );
  }
  if (approval.status === "notification_sent" && approval.decision === "confirmed") {
    return htmlPage_("Turno confirmado", "<p>Calendar quedó actualizado y el correo de confirmación fue enviado al cliente.</p>");
  }
  if (approval.status === "notification_sent" && approval.decision === "rejected") {
    return htmlPage_("Horario rechazado", "<p>El bloqueo fue eliminado antes de enviar al cliente el correo para elegir otro horario.</p>");
  }
  if (approval.status === "notification_sent" && approval.decision === "expired") {
    return htmlPage_("Solicitud vencida", "<p>El bloqueo provisional venció, el horario quedó disponible y el aviso fue enviado al cliente.</p>");
  }
  return htmlPage_("Solicitud pendiente", "<p>La solicitud todavía está pendiente de confirmación.</p>");
}

function notificationRetryForm_(token, decision) {
  var action = htmlEscape_(ScriptApp.getService().getUrl());
  var formDecision = decision === "confirmed" ? "approve" : "reject";
  return "<form method=\"post\" action=\"" + action + "\"><input type=\"hidden\" name=\"approvalToken\" value=\"" +
    htmlEscape_(token) + "\"><button name=\"decision\" value=\"" + formDecision + "\">Reintentar el correo ahora</button></form>";
}

function notifyApprover_(token, approval) {
  var request = approval.request;
  var serviceUrl = ScriptApp.getService().getUrl();
  if (!serviceUrl) throw statusError_(503, "El Web App de aprobación no está desplegado.");
  var reviewUrl = serviceUrl + "?approvalToken=" + encodeURIComponent(token);
  var service = SERVICES_()[request.serviceCode];
  var when = formatWhen_(approval.start);
  var subject = "Solicitud de turno pendiente — " + when;
  var body = "Nueva solicitud de turno pendiente.\n\n" +
    "Nombre y apellido: " + request.name + "\n" +
    "Correo: " + request.email + "\n" +
    "Teléfono: " + request.phone + "\n" +
    "Fecha y hora: " + when + "\n" +
    "Trámite: " + service + "\n" +
    "Consulta: " + request.details + "\n\n" +
    "Revisar y decidir: " + reviewUrl;
  var htmlBody = "<p>Nueva solicitud de turno pendiente.</p><dl>" +
    "<dt><strong>Nombre y apellido</strong></dt><dd>" + htmlEscape_(request.name) + "</dd>" +
    "<dt><strong>Correo</strong></dt><dd>" + htmlEscape_(request.email) + "</dd>" +
    "<dt><strong>Teléfono</strong></dt><dd>" + htmlEscape_(request.phone) + "</dd>" +
    "<dt><strong>Fecha y hora</strong></dt><dd>" + htmlEscape_(when) + "</dd>" +
    "<dt><strong>Trámite</strong></dt><dd>" + htmlEscape_(service) + "</dd>" +
    "<dt><strong>Consulta</strong></dt><dd>" + htmlEscape_(request.details) + "</dd></dl>" +
    "<p><a href=\"" + htmlEscape_(reviewUrl) + "\" style=\"display:inline-block;padding:12px 18px;background:#173f35;color:#fff;text-decoration:none;border-radius:8px\">Revisar solicitud</a></p>" +
    "<p>El cliente recibirá un correo con tu decisión. No se envían invitaciones de Google Calendar.</p>";
  MailApp.sendEmail({
    to: approverEmail_(),
    replyTo: request.email,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    name: "Agenda web de Eliana"
  });
}

function notifyClientApproved_(request, approval) {
  var when = formatWhen_(approval.start);
  var service = SERVICES_()[request.serviceCode];
  var location = getProperty_("BOOKING_LOCATION") || "Sarandí 294 esquina 18 de Julio, Rosario";
  var body = "Hola " + request.name + ",\n\nTu turno quedó confirmado por Eliana.\n\n" +
    "Fecha y hora: " + when + "\nTrámite: " + service + "\nLugar: " + location +
    "\n\nEscribanía Eliana Isbarbo Gfeller";
  var htmlBody = "<p>Hola " + htmlEscape_(request.name) + ",</p><p><strong>Tu turno quedó confirmado por Eliana.</strong></p>" +
    "<p><strong>Fecha y hora:</strong> " + htmlEscape_(when) + "<br><strong>Trámite:</strong> " + htmlEscape_(service) +
    "<br><strong>Lugar:</strong> " + htmlEscape_(location) + "</p><p>Escribanía Eliana Isbarbo Gfeller</p>";
  MailApp.sendEmail({ to: request.email, subject: "Tu turno fue confirmado", body: body, htmlBody: htmlBody, name: "Eliana Isbarbo Gfeller" });
}

function notifyClientRejected_(request, approval, note) {
  var when = formatWhen_(approval.start);
  var service = SERVICES_()[request.serviceCode];
  var bookingUrl = publicBookingUrl_();
  var whatsappUrl = whatsappUrl_();
  var explanation = note ? "\n\nNota de Eliana: " + note : "";
  var htmlExplanation = note ? "<p><strong>Nota de Eliana:</strong> " + htmlEscape_(note) + "</p>" : "";
  var body = "Hola " + request.name + ",\n\nEliana no pudo confirmar el horario solicitado.\n\n" +
    "Fecha y hora: " + when + "\nTrámite: " + service + explanation +
    "\n\nPodés solicitar otro horario en " + bookingUrl + " o escribir por WhatsApp: " + whatsappUrl +
    "\n\nEscribanía Eliana Isbarbo Gfeller";
  var htmlBody = "<p>Hola " + htmlEscape_(request.name) + ",</p><p>Eliana no pudo confirmar el horario solicitado.</p>" +
    "<p><strong>Fecha y hora:</strong> " + htmlEscape_(when) + "<br><strong>Trámite:</strong> " + htmlEscape_(service) + "</p>" +
    htmlExplanation + "<p><a href=\"" + htmlEscape_(bookingUrl) + "\">Solicitar otro horario</a> o " +
    "<a href=\"" + htmlEscape_(whatsappUrl) + "\">escribir por WhatsApp</a>.</p><p>Escribanía Eliana Isbarbo Gfeller</p>";
  MailApp.sendEmail({ to: request.email, subject: "No pudimos confirmar el horario solicitado", body: body, htmlBody: htmlBody, name: "Eliana Isbarbo Gfeller" });
}

function notifyClientExpired_(request, approval) {
  var when = formatWhen_(approval.start);
  var service = SERVICES_()[request.serviceCode];
  var bookingUrl = publicBookingUrl_();
  var whatsappUrl = whatsappUrl_();
  var body = "Hola " + request.name + ",\n\nNo llegamos a confirmar el horario del " + when +
    " dentro del plazo. El horario volvió a quedar disponible.\n\nTrámite: " + service +
    "\n\nPodés solicitar otro horario en " + bookingUrl + " o escribir por WhatsApp: " + whatsappUrl +
    "\n\nEscribanía Eliana Isbarbo Gfeller";
  var htmlBody = "<p>Hola " + htmlEscape_(request.name) + ",</p><p>No llegamos a confirmar el horario del " +
    htmlEscape_(when) + " dentro del plazo. El horario volvió a quedar disponible.</p><p><strong>Trámite:</strong> " +
    htmlEscape_(service) + "</p><p><a href=\"" + htmlEscape_(bookingUrl) + "\">Solicitar otro horario</a> o " +
    "<a href=\"" + htmlEscape_(whatsappUrl) + "\">escribir por WhatsApp</a>.</p><p>Escribanía Eliana Isbarbo Gfeller</p>";
  MailApp.sendEmail({ to: request.email, subject: "La solicitud de turno venció sin confirmación", body: body, htmlBody: htmlBody, name: "Eliana Isbarbo Gfeller" });
}

/* Public entrypoint for a time-driven Apps Script trigger. */
function maintainBookingWorkflow() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw statusError_(503, "El mantenimiento no pudo obtener el bloqueo.");
  var summary = { expired: 0, resumed: 0, removed: 0, failures: 0 };
  try {
    var values = PropertiesService.getScriptProperties().getProperties();
    Object.keys(values).forEach(function (key) {
      if (key.indexOf("approval:") !== 0) return;
      var token = key.slice("approval:".length);
      try {
        var approval = JSON.parse(values[key]);
        if (approval.status === "pending" && Date.now() >= approval.expiresAt) {
          approval = beginDecision_(token, approval, "expired", "");
          resumeApproval_(token, approval);
          summary.expired += 1;
        } else if (["approving", "rejecting", "confirmed", "rejected", "notification_pending"].indexOf(approval.status) !== -1) {
          resumeApproval_(token, approval);
          summary.resumed += 1;
        }
      } catch (error) {
        summary.failures += 1;
        logTechnicalFailure_("maintenance", { status: "unknown", decision: null }, error);
      }
    });
    summary.removed = cleanupRetainedProperties_(true);
    return summary;
  } finally {
    lock.releaseLock();
  }
}

/* Run manually once in Apps Script after reviewing permissions. Do not call from this file. */
function installBookingMaintenanceTrigger() {
  var existing = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === MAINTENANCE_HANDLER;
  });
  if (existing) return { installed: false, reason: "already_exists" };
  ScriptApp.newTrigger(MAINTENANCE_HANDLER).timeBased().everyHours(1).create();
  return { installed: true };
}

function expirePendingApprovals_(lockHeld) {
  var lock = null;
  if (!lockHeld) {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) return;
  }
  try {
    var values = PropertiesService.getScriptProperties().getProperties();
    Object.keys(values).forEach(function (key) {
      if (key.indexOf("approval:") !== 0) return;
      try {
        var approval = JSON.parse(values[key]);
        if (approval.status === "pending" && Date.now() >= approval.expiresAt) {
          var token = key.slice("approval:".length);
          resumeApproval_(token, beginDecision_(token, approval, "expired", ""));
        }
      } catch (error) {
        logTechnicalFailure_("expire_pending", { status: "unknown", decision: null }, error);
      }
    });
  } finally {
    if (lock) lock.releaseLock();
  }
}

function cleanupRetainedProperties_(lockHeld) {
  var lock = null;
  if (!lockHeld) {
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) throw statusError_(503, "La limpieza no pudo obtener el bloqueo.");
  }
  var removed = 0;
  try {
    var properties = PropertiesService.getScriptProperties();
    var values = properties.getProperties();
    var cutoff = Date.now() - retentionDays_() * 86400000;
    Object.keys(values).forEach(function (key) {
      try {
        var value = JSON.parse(values[key]);
        if (key.indexOf("approval:") === 0) {
          if (value.status === "notification_sent" && Number(value.updatedAt || value.notificationSentAt || 0) < cutoff) {
            properties.deleteProperty(key);
            removed += 1;
          }
        } else if (key.indexOf("booking:") === 0) {
          var status = value.data && value.data.status;
          if (status && status !== "pending" && Number(value.updatedAt || value.createdAt || 0) < cutoff) {
            properties.deleteProperty(key);
            removed += 1;
          }
        } else if (key.indexOf("rate:") === 0 && Number(value.expiresAt || 0) <= Date.now()) {
          properties.deleteProperty(key);
          removed += 1;
        }
      } catch (error) {
        logTechnicalFailure_("retention_cleanup", { status: "unknown", decision: null }, error);
      }
    });
    return removed;
  } finally {
    if (lock) lock.releaseLock();
  }
}

function rateLimitConfig_() {
  return {
    windowSeconds: requiredPositiveIntegerProperty_("BOOKING_RATE_LIMIT_WINDOW_SECONDS"),
    maximum: requiredPositiveIntegerProperty_("BOOKING_RATE_LIMIT_MAX"),
    secret: requiredProperty_("BOOKING_RATE_LIMIT_HMAC_SECRET")
  };
}

function enforceRateLimit_(request, config) {
  var subject = String(request.rateLimitSubject || "unknown") + "|" + request.email.toLowerCase() + "|" + request.phone;
  var fingerprint = hmacHex_(subject, config.secret);
  var windowMs = config.windowSeconds * 1000;
  var bucketStart = Math.floor(Date.now() / windowMs) * windowMs;
  var key = "rate:" + fingerprint + ":" + bucketStart;
  var properties = PropertiesService.getScriptProperties();
  var stored = properties.getProperty(key);
  var bucket = stored ? JSON.parse(stored) : { count: 0, createdAt: Date.now(), expiresAt: bucketStart + windowMs };
  if (bucket.count >= config.maximum) {
    throw statusError_(429, "Demasiados intentos. Esperá unos minutos antes de volver a solicitar un horario.");
  }
  bucket.count += 1;
  bucket.updatedAt = Date.now();
  properties.setProperty(key, JSON.stringify(bucket));
}

function hmacHex_(value, secret) {
  return bytesToHex_(Utilities.computeHmacSha256Signature(
    Utilities.newBlob(value).getBytes(),
    Utilities.newBlob(secret).getBytes()
  ));
}

function persistedRequest_(request) {
  return {
    serviceCode: request.serviceCode,
    start: request.start,
    name: request.name,
    email: request.email,
    phone: request.phone,
    details: request.details,
    consent: true,
    idempotencyKey: request.idempotencyKey
  };
}

function storeApproval_(token, approval) {
  PropertiesService.getScriptProperties().setProperty(approvalKey_(token), JSON.stringify(approval));
}

function approvalToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "").toLowerCase();
}
function validApprovalToken_(token) { return /^[a-f0-9]{64}$/.test(token || ""); }
function approvalKey_(token) { return "approval:" + token; }
function bookingKey_(key) { return "booking:" + key; }
function approvalByToken_(token) {
  var value = PropertiesService.getScriptProperties().getProperty(approvalKey_(token));
  return value ? JSON.parse(value) : null;
}
function approvalHoldHours_() {
  var configured = Number(getProperty_("BOOKING_APPROVAL_HOLD_HOURS") || DEFAULT_APPROVAL_HOLD_HOURS);
  return configured > 0 ? configured : DEFAULT_APPROVAL_HOLD_HOURS;
}
function retentionDays_() {
  var configured = Number(getProperty_("BOOKING_RETENTION_DAYS") || DEFAULT_RETENTION_DAYS);
  return configured > 0 && configured % 1 === 0 ? configured : DEFAULT_RETENTION_DAYS;
}
function approverEmail_() { return getProperty_("BOOKING_APPROVER_EMAIL") || "esc.isbarbo@gmail.com"; }
function publicBookingUrl_() { return getProperty_("BOOKING_PUBLIC_URL") || "https://www.escribaniaisbarbo.com.uy/#turnos"; }
function whatsappUrl_() { return getProperty_("BOOKING_WHATSAPP_URL") || "https://wa.me/59891048471"; }
function formatWhen_(value) { return Utilities.formatDate(new Date(value), BOOKING_TIME_ZONE, "dd/MM/yyyy 'a las' HH:mm"); }
function htmlEscape_(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function htmlPage_(title, content) {
  return HtmlService.createHtmlOutput("<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><meta name=\"referrer\" content=\"no-referrer\"><title>" + htmlEscape_(title) + "</title><style>body{font:16px/1.5 Arial,sans-serif;background:#f4f6f5;color:#173f35;margin:0;padding:24px}main{max-width:680px;margin:32px auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 8px 30px #0001}h1{margin-top:0}dl{display:grid;grid-template-columns:140px 1fr;gap:8px 16px}dt{font-weight:700}dd{margin:0;white-space:pre-wrap}label{display:block;font-weight:700;margin-top:24px}label span{font-weight:400;color:#63706c}textarea{box-sizing:border-box;width:100%;min-height:100px;margin-top:8px;padding:10px;border:1px solid #bdc7c3;border-radius:8px;font:inherit}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:18px}button{border:0;border-radius:9px;padding:12px 18px;font:inherit;font-weight:700;cursor:pointer}.approve{background:#173f35;color:#fff}.reject{background:#f2e7e5;color:#8c2f27}@media(max-width:560px){body{padding:12px}main{margin:12px auto;padding:20px}dl{grid-template-columns:1fr;gap:2px}dd{margin-bottom:10px}.actions button{width:100%}}</style></head><body><main><h1>" + htmlEscape_(title) + "</h1>" + content + "</main></body></html>").setTitle(title);
}

function validateSignedRequest_(envelope, payloadJson) {
  var timestamp = envelope.timestamp;
  var nonce = envelope.nonce;
  var signature = envelope.signature;
  if (!timestamp || !nonce || !signature || Math.abs(Date.now() - Number(timestamp)) > 300000) {
    throw statusError_(403, "Solicitud vencida.");
  }
  var cache = CacheService.getScriptCache();
  if (cache.get("nonce:" + nonce)) throw statusError_(403, "Solicitud repetida.");
  var body = String(envelope.action) + "." + String(timestamp) + "." + nonce + "." + payloadJson;
  var secret = requiredProperty_("APPS_SCRIPT_SHARED_SECRET");
  var expected = bytesToHex_(Utilities.computeHmacSha256Signature(
    Utilities.newBlob(body).getBytes(),
    Utilities.newBlob(secret).getBytes()
  ));
  if (!safeEqual_(expected, signature)) throw statusError_(403, "Firma inválida.");
  cache.put("nonce:" + nonce, "1", 300);
}

function eventsBetween_(start, end) {
  return calendarIds_().reduce(function (events, id) {
    return events.concat(CalendarApp.getCalendarById(id).getEvents(new Date(start), new Date(end)).map(function (event) {
      return { start: event.getStartTime(), end: event.getEndTime() };
    }));
  }, []);
}
function overlapsEvents_(start, end, events) {
  var slotStart = new Date(start);
  var slotEnd = new Date(end);
  return events.some(function (event) { return event.start < slotEnd && event.end > slotStart; });
}
function overlapsAny_(start, end) { return overlapsEvents_(start, end, eventsBetween_(start, end)); }
function calendarIds_() {
  return [requiredProperty_("BOOKING_CALENDAR_ID")].concat(
    (getProperty_("BOOKING_BLOCKING_CALENDAR_IDS") || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean)
  );
}
function slotsForDate_(date) {
  var duration = durationMinutes_();
  var slots = [];
  OPENING_WINDOWS.forEach(function (window) {
    var current = minutes_(window[0]);
    var last = minutes_(window[1]);
    for (; current + duration <= last; current += duration) {
      var time = pad_(Math.floor(current / 60)) + ":" + pad_(current % 60);
      var end = current + duration;
      slots.push({
        start: date + "T" + time + ":00-03:00",
        end: date + "T" + pad_(Math.floor(end / 60)) + ":" + pad_(end % 60) + ":00-03:00"
      });
    }
  });
  return slots;
}
function validateBooking_(r) {
  validateService_(r.serviceCode);
  if (!r.name || r.name.length > 120 || !r.email || r.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email) ||
      !r.phone || r.phone.length > 40 || !r.details || r.details.length > 400 || r.consent !== true ||
      !/^[A-Za-z0-9_-]{16,128}$/.test(r.idempotencyKey || "") || String(r.rateLimitSubject || "").length > 128) {
    throw statusError_(400, "Datos de reserva inválidos.");
  }
  if (!isBookableDate_(r.start.slice(0, 10)) || new Date(r.start) <= new Date() ||
      !slotsForDate_(r.start.slice(0, 10)).some(function (slot) { return slot.start === r.start; })) {
    throw statusError_(400, "Horario inválido o ya transcurrido.");
  }
}
function validateService_(code) { if (!SERVICES_()[code]) throw statusError_(400, "Trámite inválido."); }
function validateRange_(from, to) {
  var today = dateFromYmd_(Utilities.formatDate(new Date(), BOOKING_TIME_ZONE, "yyyy-MM-dd"));
  if (!validYmd_(from) || !validYmd_(to) || dateFromYmd_(from) < today || dateFromYmd_(from) > dateFromYmd_(to) || addDays_(today, HORIZON_DAYS) < dateFromYmd_(to)) {
    throw statusError_(400, "Rango inválido.");
  }
}
function isBookableDate_(ymd) {
  var date = dateFromYmd_(ymd);
  var today = dateFromYmd_(Utilities.formatDate(new Date(), BOOKING_TIME_ZONE, "yyyy-MM-dd"));
  return date >= today && date <= addDays_(today, HORIZON_DAYS) && date.getDay() > 0 && date.getDay() < 6;
}
function endFor_(start) { return new Date(new Date(start).getTime() + durationMinutes_() * 60000).toISOString(); }
function privateDescription_(r) {
  return "Nombre: " + r.name + "\nTeléfono: " + r.phone + "\nTrámite: " + SERVICES_()[r.serviceCode] +
    "\nConsulta: " + r.details + "\nID interno: " + r.idempotencyKey;
}
function bookingFingerprint_(r) {
  return bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify({
    serviceCode: r.serviceCode,
    start: r.start,
    name: r.name,
    email: r.email,
    phone: r.phone,
    details: r.details
  })));
}
function getIdempotency_(key, request) {
  var value = PropertiesService.getScriptProperties().getProperty(bookingKey_(key));
  if (!value) return null;
  var stored = JSON.parse(value);
  if (stored.fingerprint !== bookingFingerprint_(request)) {
    throw statusError_(409, "El intento de reserva corresponde a otros datos. Elegí nuevamente el horario.");
  }
  return stored.data;
}
function putIdempotency_(key, request, value) {
  var properties = PropertiesService.getScriptProperties();
  var propertyKey = bookingKey_(key);
  var existing = properties.getProperty(propertyKey);
  var now = Date.now();
  var createdAt = existing ? Number(JSON.parse(existing).createdAt || now) : now;
  properties.setProperty(propertyKey, JSON.stringify({
    fingerprint: bookingFingerprint_(request),
    data: value,
    createdAt: createdAt,
    updatedAt: now
  }));
}
function SERVICES_() {
  return { "consulta-notarial": "Consulta notarial", "compromiso-compraventa": "Compromiso de compraventa", "titulo-automotor": "Título automotor", "carta-poder": "Carta Poder", "prenda": "Prenda", "leasing": "Leasing", "promesas-cesiones": "Promesas y cesiones", "compraventas-antecedentes": "Compraventas y estudio de antecedentes", "hipotecas-cancelacion": "Hipotecas y/o Cancelación", "arrendamientos-garantias": "Arrendamientos y garantías", "sucesiones": "Sucesiones", "testamentos": "Testamentos", "particiones": "Particiones", "cesion-derechos-hereditarios": "Cesión de Derechos Hereditarios", "certificacion-firmas": "Certificación de firmas", "certificacion-situaciones-juridicas": "Certificación de situaciones jurídicas", "poderes": "Poderes", "declaraciones-juradas": "Declaraciones juradas", "minuta-notarial-bps": "Minuta notarial BPS", "constitucion-sociedades": "Constitución de sociedades", "contratos-civiles-comerciales": "Contratos civiles y comerciales", "certificados-societarios": "Certificados y documentación societaria", "tramites-organismos": "Trámites ante organismos públicos y/o privados", "tasaciones": "Tasaciones" };
}
function getProperty_(key) { return PropertiesService.getScriptProperties().getProperty(key); }
function requiredProperty_(key) {
  var value = getProperty_(key);
  if (!value) throw statusError_(503, "La agenda aún no está configurada.");
  return value;
}
function requiredPositiveIntegerProperty_(key) {
  var raw = requiredProperty_(key);
  var value = Number(raw);
  if (!(value > 0 && value % 1 === 0)) throw statusError_(503, "La agenda aún no está configurada.");
  return value;
}
function durationMinutes_() {
  var configured = Number(getProperty_("BOOKING_DURATION_MINUTES") || DEFAULT_DURATION_MINUTES);
  return configured > 0 && configured % 1 === 0 ? configured : DEFAULT_DURATION_MINUTES;
}
function dateFromYmd_(x) { return new Date(x + "T12:00:00"); }
function validYmd_(x) { return /^\d{4}-\d{2}-\d{2}$/.test(x || "") && Utilities.formatDate(dateFromYmd_(x), BOOKING_TIME_ZONE, "yyyy-MM-dd") === x; }
function addDays_(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
function minutes_(x) { return Number(x.slice(0, 2)) * 60 + Number(x.slice(3)); }
function pad_(n) { return String(n).padStart(2, "0"); }
function bytesToHex_(bytes) { return bytes.map(function (byte) { return (byte + 256).toString(16).slice(-2); }).join(""); }
function safeEqual_(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  var result = 0;
  for (var i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
function statusError_(status, message) {
  var error = new Error(message);
  error.status = status;
  error.exposeToClient = true;
  return error;
}
function safeMessage_(error) {
  return error && error.exposeToClient === true
    ? error.message
    : "Servicio temporalmente no disponible.";
}
function logTechnicalFailure_(operation, approval, error) {
  console.error("Booking workflow technical failure", {
    operation: operation,
    state: approval && approval.status || "unknown",
    decision: approval && approval.decision || "none",
    errorName: error && error.name || "Error"
  });
}
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
