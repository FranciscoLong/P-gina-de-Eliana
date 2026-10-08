(function initializeNotices(root, factory) {
  const notices = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = notices;
    return;
  }

  const section = document.getElementById("avisos");
  const list = document.getElementById("avisosLista");
  if (!section || !list) return;

  let lastDay;
  function refresh() {
    const day = notices.uruguayDay();
    if (day === lastDay) return;
    lastDay = day;
    notices.render(section, list, root.SiteNotices, day);
  }

  refresh();
  // Actualiza también una pestaña que quedó abierta al cambiar el día.
  setInterval(refresh, 60000);
  document.addEventListener("visibilitychange", refresh);
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit"
  });

  function uruguayDay(now = new Date()) {
    const parts = Object.fromEntries(formatter.formatToParts(now).map(({ type, value }) => [type, value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function validDay(day) {
    if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const date = new Date(`${day}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
  }

  function filled(text) {
    return typeof text === "string" && text.trim() !== "";
  }

  // "de **9:30 a 12:30**" se parte en tramos; los de índice impar van en negrita.
  function richTextParts(text) {
    return text.split(/\*\*(.+?)\*\*/)
      .map((part, index) => ({ text: part, strong: index % 2 === 1 }))
      .filter(({ text: part }) => part);
  }

  function activeNotices(entries, day = uruguayDay()) {
    if (!Array.isArray(entries)) return [];
    return entries.filter((notice) => {
      if (!notice || notice.active !== true || !filled(notice.title)) return false;
      if (!Array.isArray(notice.paragraphs) || !notice.paragraphs.some(filled)) return false;
      const { startsOn, endsOn } = notice;
      if (startsOn != null && !validDay(startsOn)) return false;
      if (endsOn != null && !validDay(endsOn)) return false;
      return (!startsOn || startsOn <= day) && (!endsOn || endsOn >= day);
    });
  }

  function safeHref(href) {
    // Solo enlaces locales o HTTPS; el contenido se agrega siempre como texto.
    if (typeof href !== "string" || /[\s\\]/.test(href)) return null;
    if (/^\/(?!\/)/.test(href) || /^#[\w-]+$/.test(href)) return href;
    try {
      const url = new URL(href);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
    } catch {
      return null;
    }
  }

  function render(section, list, entries, day = uruguayDay()) {
    const active = activeNotices(entries, day);
    const doc = list.ownerDocument;
    const fragment = doc.createDocumentFragment();
    active.forEach((notice) => {
      // Mismo orden que el cartel impreso: etiqueta, línea previa, título y detalle.
      const item = doc.createElement("li");
      item.className = "notice-card";
      const tag = doc.createElement("span");
      tag.className = "notice-tag";
      tag.textContent = "Aviso";
      item.append(tag);
      if (filled(notice.lead)) {
        const lead = doc.createElement("p");
        lead.className = "notice-lead";
        lead.textContent = notice.lead;
        item.append(lead);
      }
      const title = doc.createElement("h2");
      title.textContent = notice.title;
      if (filled(notice.highlight)) {
        const highlight = doc.createElement("em");
        highlight.textContent = notice.highlight;
        title.append(" ", highlight);
      }
      item.append(title);
      notice.paragraphs.forEach((text) => {
        if (!filled(text)) return;
        const paragraph = doc.createElement("p");
        paragraph.className = "notice-text";
        richTextParts(text).forEach(({ text: part, strong }) => {
          if (!strong) {
            paragraph.append(part);
            return;
          }
          const bold = doc.createElement("strong");
          bold.textContent = part;
          paragraph.append(bold);
        });
        item.append(paragraph);
      });
      const href = safeHref(notice.link?.href);
      if (href && filled(notice.link.label)) {
        const link = doc.createElement("a");
        link.className = "btn btn-dark notice-link";
        link.textContent = notice.link.label;
        link.href = href;
        item.append(link);
      }
      fragment.append(item);
    });
    list.replaceChildren(fragment);
    section.hidden = active.length === 0;
  }

  return { uruguayDay, activeNotices, safeHref, richTextParts, render };
});
