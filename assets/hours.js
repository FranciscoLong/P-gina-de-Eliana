/*
  HORARIO DE ATENCIÓN
  El horario de la página (la franja de arriba, «Dónde encontrarme» y el pie)
  sale de estos tramos de fechas, los mismos que usa la agenda
  (SCHEDULES en api/_lib/booking.js): una prueba verifica que coincidan. Cada
  tramo rige desde su día (fecha de Uruguay) hasta que empieza el siguiente.
  El horario escrito en index.html queda para quien no tiene JavaScript.
  morningNote es la aclaración de la mañana, entre paréntesis, donde aparece
  el horario («(solo con agenda)», desde el 1 de diciembre de 2026).
*/
(function initializeHours(root, factory) {
  const hours = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = hours;
    return;
  }
  const period = hours.periodFor(hours.uruguayDay());
  if (!period) return;
  const { windows, morningNote } = period;
  document.querySelectorAll("[data-hours]").forEach((element) => {
    if (element.dataset.hours === "list") {
      const items = windows.map(([from, to]) => {
        const item = document.createElement("li");
        item.textContent = hours.rangeText(from, to, from === windows[0][0] ? morningNote : null);
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
  const SITE_HOURS = [
    { from: "2000-01-01", windows: [["09:30", "12:30"], ["15:00", "19:00"]] },
    { from: "2026-11-02", windows: [["15:00", "19:00"]] },
    { from: "2026-11-24", windows: [["09:30", "12:30"], ["15:00", "19:00"]] },
    {
      from: "2026-12-01",
      windows: [["09:00", "12:30"], ["15:00", "19:00"]],
      morningNote: "solo con agenda"
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
  const rangeText = (from, to, note) =>
    `${clock(from)} a ${clock(to)}${note ? ` (${note})` : ""}`;

  // "topbar": «Lunes a viernes de 9:30 a 12:30 y de 15:00 a 19:00».
  // "location": «Lunes a viernes, de 9:30 a 12:30 y de 15:00 a 19:00.»
  // La aclaración va sólo en la primera franja, la de la mañana.
  function sentence({ windows, morningNote }, place) {
    const ranges = windows
      .map(([from, to], index) => `de ${rangeText(from, to, index === 0 ? morningNote : null)}`)
      .join(" y ");
    return place === "location" ? `Lunes a viernes, ${ranges}.` : `Lunes a viernes ${ranges}`;
  }

  return { SITE_HOURS, uruguayDay, periodFor, rangeText, sentence };
});
