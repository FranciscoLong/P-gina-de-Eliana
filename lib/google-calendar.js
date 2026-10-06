"use strict";

/*
  Cliente mínimo de Google Calendar con cuenta de servicio, sin dependencias.

  La cuenta de servicio no es dueña de ningún calendario: Eliana comparte el
  suyo con el correo de la cuenta ("Hacer cambios en eventos") y desde acá se
  consulta la disponibilidad y se crean eventos en ese calendario. Una cuenta
  de servicio no puede invitar asistentes en cuentas @gmail.com, y tampoco hace
  falta: el cliente recibe su confirmación por correo aparte.

  Credenciales: GOOGLE_SERVICE_ACCOUNT_JSON con el JSON completo de la clave.
*/

const crypto = require("node:crypto");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_URL = "https://www.googleapis.com/calendar/v3";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy"
].join(" ");
const REQUEST_TIMEOUT_MS = 8000;

class CalendarError extends Error {
  constructor(message, { status = 502, reason = "", code = "CALENDAR_ERROR", detail = "" } = {}) {
    super(message);
    this.name = "CalendarError";
    this.status = status;
    this.reason = reason;
    this.code = code;
    // Mensaje de Google (no trae datos del turno): explica qué rechazó y por qué.
    this.detail = detail;
  }
}

function readServiceAccount(env = process.env) {
  let parsed;
  try {
    parsed = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON || "");
  } catch (_error) {
    parsed = null;
  }

  if (!parsed?.client_email || !parsed?.private_key) {
    throw new CalendarError("Falta configurar la cuenta de servicio de Google.", {
      status: 503,
      code: "NOT_CONFIGURED"
    });
  }
  return { clientEmail: parsed.client_email, privateKey: parsed.private_key };
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function signJwt({ clientEmail, privateKey }, nowSeconds) {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: clientEmail,
    scope: SCOPES,
    aud: TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600
  }));
  const signature = crypto.sign("RSA-SHA256", Buffer.from(`${header}.${claims}`), privateKey);
  return `${header}.${claims}.${signature.toString("base64url")}`;
}

/*
  Fluid Compute reutiliza instancias entre solicitudes, así que el token se
  guarda en memoria hasta un minuto antes de vencer.
*/
function createCalendarClient({ env = process.env, fetchImpl = fetch, now = () => Date.now() } = {}) {
  let cachedToken = null;

  async function accessToken() {
    if (cachedToken && cachedToken.expiresAt - 60000 > now()) {
      return cachedToken.value;
    }

    const account = readServiceAccount(env);
    const assertion = signJwt(account, Math.floor(now() / 1000));
    const response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.access_token) {
      throw new CalendarError("Google rechazó las credenciales de la cuenta de servicio.", {
        status: 503,
        reason: String(result.error || response.status),
        code: "AUTH_FAILED"
      });
    }

    cachedToken = {
      value: result.access_token,
      expiresAt: now() + Number(result.expires_in || 3600) * 1000
    };
    return cachedToken.value;
  }

  async function request(method, path, body) {
    const token = await accessToken();
    const response = await fetchImpl(`${API_URL}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body ? { "content-type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new CalendarError("Google Calendar no respondió correctamente.", {
        status: response.status,
        reason: String(result?.error?.errors?.[0]?.reason || result?.error?.status || ""),
        detail: String(result?.error?.message || "").slice(0, 200)
      });
    }
    return result;
  }

  // Devuelve los intervalos ocupados de todos los calendarios pedidos, juntos.
  async function busyIntervals(calendarIds, timeMin, timeMax) {
    const result = await request("POST", "/freeBusy", {
      timeMin,
      timeMax,
      items: calendarIds.map((id) => ({ id }))
    });

    return calendarIds.flatMap((id) => {
      const calendar = result.calendars?.[id];
      /*
        Un calendario no compartido con la cuenta de servicio no da error HTTP:
        vuelve con errors: [{ reason: "notFound" }] y sin ocupados. Tomarlo como
        libre ofrecería horarios que no lo están, así que se corta acá.
      */
      if (!calendar || calendar.errors?.length) {
        throw new CalendarError("No se pudo leer la disponibilidad de un calendario.", {
          status: 503,
          reason: String(calendar?.errors?.[0]?.reason || "missing"),
          code: "CALENDAR_UNREADABLE"
        });
      }
      return calendar.busy || [];
    });
  }

  function eventPath(calendarId, eventId = "") {
    return `/calendars/${encodeURIComponent(calendarId)}/events${eventId ? `/${encodeURIComponent(eventId)}` : ""}`;
  }

  async function insertEvent(calendarId, event) {
    return request("POST", `${eventPath(calendarId)}?sendUpdates=none`, event);
  }

  // Un evento inexistente o borrado no es un error: se lee como null y se borra sin fallar.
  const isGone = (error) => error.status === 404 || error.status === 410;

  async function getEvent(calendarId, eventId) {
    try {
      return await request("GET", eventPath(calendarId, eventId));
    } catch (error) {
      if (isGone(error)) {
        return null;
      }
      throw error;
    }
  }

  // Eventos sueltos (las repeticiones ya expandidas) entre dos instantes, todas las páginas.
  async function listEvents(calendarId, { timeMin, timeMax }) {
    const items = [];
    let pageToken = "";
    do {
      const query = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", maxResults: "250" });
      if (pageToken) {
        query.set("pageToken", pageToken);
      }
      const page = await request("GET", `${eventPath(calendarId)}?${query}`);
      items.push(...(page.items || []));
      pageToken = page.nextPageToken || "";
    } while (pageToken);
    return { items };
  }

  async function deleteEvent(calendarId, eventId) {
    try {
      await request("DELETE", `${eventPath(calendarId, eventId)}?sendUpdates=none`);
    } catch (error) {
      if (!isGone(error)) {
        throw error;
      }
    }
  }

  return { busyIntervals, insertEvent, getEvent, listEvents, deleteEvent };
}

module.exports = {
  CalendarError,
  createCalendarClient,
  readServiceAccount,
  signJwt
};
