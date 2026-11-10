/*
  HORARIO DE ATENCIÓN — el único lugar donde se cambia
  De estos tramos de fechas salen:
  - los turnos que ofrece la agenda (api/_lib/booking.js los lee de acá);
  - el horario de la página: la franja de arriba, «Dónde encontrarme» y el pie;
  - el horario de los datos para Google (openingHoursSpecification de
    index.html): va escrito fijo, con la vigencia de cada tramo, para que lo
    lea igual cualquier buscador, ejecute JavaScript o no. Una prueba exige
    que sea exactamente openingHours(SITE_HOURS); si no coincide, el mensaje
    trae el bloque correcto para pegar.
  Cada tramo rige desde su día (fecha de Uruguay) hasta que empieza el
  siguiente. windows son las franjas del día; withGap, si la agenda deja
  BOOKING_GAP_MINUTES entre turno y turno. Después de editar, renovar el ?v=
  de hours.js en index.html.
  El horario escrito en index.html queda sólo para quien no tiene JavaScript.
  notes son las aclaraciones de cada franja, en el mismo orden que windows,
  entre paréntesis donde aparece el horario: desde el 1 de diciembre de 2026,
  «(solo con agenda)» a la mañana y «(atención normal)» a la tarde.
*/
(function initializeHours(root, factory) {
  const hours = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = hours;
    return;
  }
  const period = hours.periodFor(hours.uruguayDay());
  if (!period) return;
  const { windows, notes = [] } = period;
  document.querySelectorAll("[data-hours]").forEach((element) => {
    if (element.dataset.hours === "list") {
      const items = windows.map(([from, to], index) => {
        const item = document.createElement("li");
        item.textContent = hours.rangeText(from, to, notes[index]);
        return item;
      });
      element.replaceChildren(...items);
      return;
    }
    const text = hours.sentence(period, element.dataset.hours);
    // En «Dónde encontrarme» el rótulo «Horario» queda: se cambia sólo el texto de después.
    const last = element.lastChild;
    if (element.children.length && last?.nodeType === Node.TEXT_NODE) last.textContent = ` ${text}`;
    else element.textContent = text;
  });
})(this, function hoursFactory() {
  const TIME_ZONE = "America/Montevideo";
  // Pasado el 30 de noviembre de 2026, los tres primeros tramos se pueden borrar.
  const SITE_HOURS = [
    { from: "2000-01-01", windows: [["09:30", "12:30"], ["15:00", "19:00"]], withGap: false },
    // Del 2 al 23 de noviembre de 2026 el escritorio cierra por la mañana.
    { from: "2026-11-02", windows: [["15:00", "19:00"]], withGap: false },
    { from: "2026-11-24", windows: [["09:30", "12:30"], ["15:00", "19:00"]], withGap: false },
    {
      from: "2026-12-01",
      windows: [["09:00", "12:30"], ["15:00", "19:00"]],
      withGap: true,
      notes: ["solo con agenda", "atención normal"]
    }
  ];

  function uruguayDay(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
  }

  function periodFor(ymd, periods = SITE_HOURS) {
    return periods.findLast((period) => period.from <= ymd) ?? null;
  }

  // "09:30" se escribe "9:30", como en el resto de la página.
  const clock = (hhmm) => hhmm.replace(/^0/, "");
  // Los horarios llevan «hs», como en los avisos.
  const rangeText = (from, to, note) =>
    `${clock(from)} a ${clock(to)} hs${note ? ` (${note})` : ""}`;

  // "topbar": «Lunes a viernes de 9:30 a 12:30 hs y de 15:00 a 19:00 hs».
  // "location": «Lunes a viernes, de 9:30 a 12:30 hs y de 15:00 a 19:00 hs.»
  function sentence({ windows, notes = [] }, place) {
    const ranges = windows
      .map(([from, to], index) => `de ${rangeText(from, to, notes[index])}`)
      .join(" y ");
    return place === "location" ? `Lunes a viernes, ${ranges}.` : `Lunes a viernes ${ranges}`;
  }

  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const FIRST_DAY = "2000-01-01";

  function dayBefore(ymd) {
    const date = new Date(`${ymd}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  // El horario para Google: cada franja de cada tramo, con desde y hasta cuándo rige.
  function openingHours(periods = SITE_HOURS) {
    return periods.flatMap((period, index) => {
      const next = periods[index + 1];
      return period.windows.map(([opens, closes]) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: WEEKDAYS,
        opens,
        closes,
        ...(period.from === FIRST_DAY ? {} : { validFrom: period.from }),
        ...(next ? { validThrough: dayBefore(next.from) } : {})
      }));
    });
  }

  return {
    SITE_HOURS,
    uruguayDay,
    periodFor,
    rangeText,
    sentence,
    openingHours
  };
});
