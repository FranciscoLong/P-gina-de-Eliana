const WHATSAPP_NUMBER = "59891048471";
const OFFICE_ADDRESS = "Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay";
const DEFAULT_SERVICE = "Consulta notarial";
const TIME_ZONE = "America/Montevideo";
const { buildBookingDetails, buildWhatsAppMessage } = window.ServiceMessages;

const menuButton = document.getElementById("menuButton");
const navLinks = document.getElementById("navLinks");
const serviceLinks = document.querySelectorAll("[data-service]");
const openContactButtons = document.querySelectorAll("[data-contact-open]");
const bookingStartButtons = document.querySelectorAll("[data-booking-start]");
const selectedServiceLabels = document.querySelectorAll("[data-selected-service]");
const whatsappLinks = document.querySelectorAll("[data-contact-whatsapp]");
const contactDialog = document.getElementById("contactDialog");
const closeContactDialogButton = document.getElementById("closeContactDialog");
const dialogSelectedService = document.getElementById("dialogSelectedService");
const sectionSelectedService = document.getElementById("sectionSelectedService");
const channelStep = document.getElementById("channelStep");
const bookingStep = document.getElementById("bookingStep");
const bookingDone = document.getElementById("bookingDone");
const bookingForm = document.getElementById("bookingForm");
const bookingServiceFixed = document.getElementById("bookingServiceFixed");
const bookingServiceField = document.getElementById("bookingServiceField");
const bookingService = document.getElementById("bookingService");
const bookingDates = document.getElementById("bookingDates");
const bookingSlots = document.getElementById("bookingSlots");
const bookingStatus = document.getElementById("bookingStatus");
const bookingFallback = document.getElementById("bookingFallback");
const bookingSubmit = document.getElementById("bookingSubmit");
const bookingMissing = document.getElementById("bookingMissing");
const bookingPicker = document.getElementById("bookingPicker");
const turnstileWidget = document.getElementById("turnstileWidget");
const bookingDoneService = document.getElementById("bookingDoneService");
const bookingDoneWhen = document.getElementById("bookingDoneWhen");
const bookingDoneEmail = document.getElementById("bookingDoneEmail");
const bookingDoneWhatsapp = document.getElementById("bookingDoneWhatsapp");
const bookingDoneClose = document.getElementById("bookingDoneClose");
const consultaStartButtons = document.querySelectorAll("[data-consulta-start]");
const bookingBlocks = document.querySelectorAll("[data-booking-block]");
const consultaStep = document.getElementById("consultaStep");
const consultaDone = document.getElementById("consultaDone");
const consultaBack = document.getElementById("consultaBack");
const consultaForm = document.getElementById("consultaForm");
const consultaService = document.getElementById("consultaService");
const consultaCounter = document.getElementById("consultaCounter");
const consultaStatus = document.getElementById("consultaStatus");
const consultaFallback = document.getElementById("consultaFallback");
const consultaSubmit = document.getElementById("consultaSubmit");
const consultaTurnstileBox = document.getElementById("consultaTurnstile");
const consultaDoneEmail = document.getElementById("consultaDoneEmail");
const consultaDoneClose = document.getElementById("consultaDoneClose");
const copyAddressButton = document.getElementById("copyAddress");
const toast = document.getElementById("toast");

const AVAILABLE_SERVICES = new Set([
  DEFAULT_SERVICE,
  ...Array.from(serviceLinks, (link) => link.dataset.service)
]);

// null hasta que el visitante elige un trámite en Servicios o en el select de la agenda.
let selectedService = null;
// true cuando la ventana se abrió desde un trámite de Servicios: la agenda no pide el motivo.
let serviceIsFixed = false;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function setMenuOpen(isOpen) {
  navLinks.classList.toggle("open", isOpen);
  if (isOpen) {
    /*
      El menú se mueve con el encabezado: si no entra (teléfono acostado),
      desplazar la página no muestra los últimos enlaces. Se mide lo que queda
      debajo, que depende de la franja verde de arriba, y se desplaza por dentro.
    */
    navLinks.style.maxHeight = `${window.innerHeight - navLinks.getBoundingClientRect().top - 16}px`;
  }
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
  menuButton.textContent = isOpen ? "✕" : "☰";
}

menuButton.addEventListener("click", () => {
  setMenuOpen(!navLinks.classList.contains("open"));
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navLinks.classList.contains("open")) {
    setMenuOpen(false);
    menuButton.focus();
  }
});

document.addEventListener("click", (event) => {
  const clickedInsideMenu = navLinks.contains(event.target) || menuButton.contains(event.target);

  if (!clickedInsideMenu && navLinks.classList.contains("open")) {
    setMenuOpen(false);
  }
});

/*
  El hero arranca por debajo de la topbar, asi que el salto por ancla lo deja
  cortado a la mitad y encima ensucia la URL con #inicio. Los enlaces al inicio
  (el del menu, el de la marca y el del pie) vuelven al tope real. No se pasa
  "behavior" a proposito: asi manda el scroll-behavior del CSS, que ya contempla
  prefers-reduced-motion.
*/
document.querySelectorAll('a[href="#inicio"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0 });
    history.replaceState(null, "", location.pathname + location.search);
  });
});

const HEADER_OFFSET = 96;
const sectionLinks = Array.from(navLinks.querySelectorAll('a[href^="#"]'))
  .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
  .filter((entry) => entry.section);

let currentSectionLink = null;
let lastScrollY = window.scrollY;
let scrollFrame = 0;

function setCurrentSectionLink(link) {
  if (link === currentSectionLink) return;

  if (currentSectionLink) {
    currentSectionLink.classList.remove("is-current");
    currentSectionLink.removeAttribute("aria-current");
  }

  if (link) {
    link.classList.add("is-current");
    link.setAttribute("aria-current", "location");
  }

  currentSectionLink = link;
}

function findCurrentSectionLink() {
  const documentHeight = document.documentElement.scrollHeight;
  const reachedBottom = window.innerHeight + window.scrollY >= documentHeight - 2;

  if (reachedBottom) return sectionLinks[sectionLinks.length - 1]?.link || null;

  let current = null;
  sectionLinks.forEach((entry) => {
    if (entry.section.getBoundingClientRect().top <= HEADER_OFFSET) current = entry.link;
  });

  /*
    Arriba del todo la topbar (horarios y contacto) va por fuera del header y
    empuja el hero unos 118px, o sea por debajo de HEADER_OFFSET, asi que ninguna
    seccion califica. En esa franja la actual es la primera del menu, igual que
    al final del documento la actual es la ultima.
  */
  return current || sectionLinks[0].link;
}

/*
  En el celular el header se come una buena parte del alto, asi que se esconde
  al bajar y vuelve apenas se sube. La clase se pone en cualquier pantalla,
  pero solo tiene efecto en pantallas angostas o bajas (ver HEADER QUE SE
  ESCONDE en el CSS).
  Arriba de todo o con el menu abierto se queda a la vista.
*/
const siteHeader = document.querySelector(".site-header");
const HEADER_HIDE_FROM = 200;

function updateHeaderVisibility(scrollY) {
  const hide =
    navLinks.dataset.scrollDirection === "down" &&
    scrollY > HEADER_HIDE_FROM &&
    !navLinks.classList.contains("open");

  siteHeader?.classList.toggle("is-hidden", hide);
}

function updateScrollIndicator() {
  const scrollY = window.scrollY;

  if (Math.abs(scrollY - lastScrollY) > 2) {
    navLinks.dataset.scrollDirection = scrollY > lastScrollY ? "down" : "up";
    lastScrollY = scrollY;
  }

  updateHeaderVisibility(scrollY);
  setCurrentSectionLink(findCurrentSectionLink());
}

if (sectionLinks.length > 0) {
  navLinks.dataset.scrollDirection = "down";
  updateScrollIndicator();

  window.addEventListener(
    "scroll",
    () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        updateScrollIndicator();
      });
    },
    { passive: true }
  );

  window.addEventListener("resize", () => setCurrentSectionLink(findCurrentSectionLink()));
}
function buildWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function currentService() {
  return selectedService || DEFAULT_SERVICE;
}

function setSelectedService(service) {
  selectedService = AVAILABLE_SERVICES.has(service) ? service : null;

  selectedServiceLabels.forEach((label) => {
    label.textContent = currentService();
  });

  // "Seleccionaste" (ventana) y "Consulta seleccionada" (sección) solo tienen sentido si se eligió algo.
  dialogSelectedService.hidden = !selectedService;
  sectionSelectedService.hidden = !selectedService;

  whatsappLinks.forEach((link) => {
    link.href = buildWhatsAppUrl(buildWhatsAppMessage(currentService()));
  });

  syncSuggestedDetails();
}

/*
  Cada paso le da el foco a su título (tabindex="-1"), nunca a un botón: un
  botón enfocado por código, sin que se haya usado el teclado, puede quedar
  marcado con el recuadro rojo de foco (pasaba al abrir desde /reservar).
*/
const DIALOG_STEPS = [channelStep, bookingStep, bookingDone, consultaStep, consultaDone];

function showDialogStep(step) {
  DIALOG_STEPS.forEach((element) => {
    element.hidden = element !== step;
  });
  // Los pasos con formulario (la agenda y la consulta) usan la ventana grande.
  contactDialog.classList.toggle("is-booking", step.classList.contains("booking-step"));
  const titleId = step.querySelector("h2").id;
  contactDialog.setAttribute("aria-labelledby", titleId);
  contactDialog.scrollTop = 0;
  if (contactDialog.open) {
    document.getElementById(titleId).focus();
  }
}

// Los botones generales abren sin trámite: el de una consulta anterior no se arrastra.
function openContactDialog(service = null, { booking = false, consulta = false, fromService = false } = {}) {
  setSelectedService(service);
  serviceIsFixed = fromService && Boolean(selectedService);

  if (!contactDialog.open) {
    contactDialog.showModal();
  }

  document.body.classList.add("modal-open");

  if (booking) {
    showBookingStep();
  } else if (consulta) {
    showConsultaStep();
  } else {
    showDialogStep(channelStep);
  }
}

function closeContactDialog() {
  if (contactDialog.open) {
    contactDialog.close();
  }
}

serviceLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openContactDialog(link.dataset.service, { fromService: true });
  });
});

openContactButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openContactDialog();
  });
});

bookingStartButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    // El de la portada es un enlace a #contactar, para quien no tiene JavaScript.
    event.preventDefault();
    if (contactDialog.contains(button)) {
      showBookingStep();
    } else {
      openContactDialog(null, { booking: true });
    }
  });
});

consultaStartButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (contactDialog.contains(button)) {
      showConsultaStep();
    } else {
      openContactDialog(null, { consulta: true });
    }
  });
});

closeContactDialogButton.addEventListener("click", closeContactDialog);
bookingDoneClose.addEventListener("click", closeContactDialog);
consultaDoneClose.addEventListener("click", closeContactDialog);

// «Volver» de la consulta lleva al menú de «Consultar». La agenda se abre directo y no tiene «Volver».
consultaBack.addEventListener("click", () => {
  showDialogStep(channelStep);
});

contactDialog.addEventListener("click", (event) => {
  if (event.target === contactDialog) {
    closeContactDialog();
  }
});

contactDialog.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  showDialogStep(channelStep);
});

contactDialog.querySelectorAll("#channelStep [data-contact-whatsapp], #bookingFallback, #consultaFallback").forEach((link) => {
  link.addEventListener("click", closeContactDialog);
});

/*
  AGENDA EN LÍNEA

  El servidor decide qué horarios se ofrecen (/api/availability) y vuelve a
  comprobar el elegido al confirmar (/api/bookings). Si la agenda está apagada
  o falla, las opciones de reservar se ocultan o se ofrece WhatsApp con el
  trámite ya cargado. No se guardan datos personales en el navegador.
*/

const SLOT_FORMATTER = new Intl.DateTimeFormat("es-UY", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

const DATE_CHIP_FORMATTER = new Intl.DateTimeFormat("es-UY", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short"
});

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat("es-UY", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long"
});

const UNAVAILABLE_MESSAGE =
  "No pudimos cargar la agenda en este momento. Podés agendar por WhatsApp con el trámite ya cargado.";

let bookingConfigRequest = null;
let availability = null;
let selectedDate = null;
let selectedSlot = null;
let attemptKey = null;
let generatedDetails = "";
let turnstileLoading = null;
// true después de tocar el botón gris: se marcan en rojo los campos que faltan.
let markMissing = false;
// Correo y teléfono mal escritos se avisan recién al salir del campo.
const leftFields = new Set();

// Un día sin ningún horario libre, por turnos tomados o por un evento de todo el día.
function isFullDay(day) {
  return !day.slots.some((slot) => slot.status === "available");
}

function formatSlot(start) {
  const parts = Object.fromEntries(
    SLOT_FORMATTER.formatToParts(new Date(start)).map((part) => [part.type, part.value])
  );
  return `${parts.weekday} ${parts.day} de ${parts.month} a las ${parts.hour}:${parts.minute}`;
}

function setBookingStatus(message, { error = false, offerWhatsApp = false } = {}) {
  bookingStatus.textContent = message;
  bookingStatus.classList.toggle("is-error", error);
  bookingFallback.hidden = !offerWhatsApp;
}

async function readJson(response) {
  if (!(response.headers.get("content-type") || "").includes("application/json")) {
    return null;
  }
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

// Qué ofrece hoy la página: la agenda y el formulario de consultas se prenden por separado.
function loadSiteConfig() {
  bookingConfigRequest ||= fetch("/api/booking-config", { headers: { accept: "application/json" } })
    .then(async (response) => (response.ok ? await readJson(response) : null))
    .catch(() => null);
  return bookingConfigRequest;
}

async function loadBookingConfig() {
  const config = await loadSiteConfig();
  return config?.enabled === true && config.turnstileSiteKey ? config : null;
}

async function loadConsultaConfig() {
  const config = await loadSiteConfig();
  return config?.contactEnabled === true && config.turnstileSiteKey ? config : null;
}

// Los selects de trámites se arman desde las tarjetas de Servicios, agrupados igual que en la página.
function buildServiceOptions(select) {
  document.querySelectorAll(".service-card").forEach((card) => {
    const group = document.createElement("optgroup");
    group.label = card.querySelector("h3").textContent.trim();
    card.querySelectorAll("[data-service]").forEach((link) => {
      group.append(new Option(link.dataset.service, link.dataset.service));
    });
    select.append(group);
  });
  select.append(new Option("Otra consulta notarial", DEFAULT_SERVICE));
}

function syncSuggestedDetails() {
  const details = bookingForm.elements.details;
  const suggestion = buildBookingDetails(bookingForm.elements.name.value, selectedService);
  // Solo se reescribe mientras el visitante no haya editado el texto.
  if (!details.value.trim() || details.value === generatedDetails) {
    details.value = suggestion;
  }
  generatedDetails = suggestion;
}

function resetAttempt() {
  attemptKey = null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Dónde se avisa cada problema y a qué control se lleva el foco.
const BOOKING_FIELDS = {
  slot: {
    error: "bookingSlotError",
    control: () => bookingSlots.querySelector("button:not([disabled])") || bookingDates.querySelector("button:not([disabled])")
  },
  service: { error: "bookingServiceError", control: () => bookingService },
  name: { error: "bookingNameError", control: () => bookingForm.elements.name },
  phone: { error: "bookingPhoneError", control: () => bookingForm.elements.phone },
  email: { error: "bookingEmailError", control: () => bookingForm.elements.email },
  details: { error: "bookingDetailsError", control: () => bookingForm.elements.details },
  consent: { error: "bookingConsentError", control: () => bookingForm.elements.consent },
  turnstile: { error: "bookingTurnstileError", control: () => turnstileWidget }
};

/*
  Lo que falta para confirmar, en el orden del formulario. Cada problema trae
  cómo nombrarlo en el resumen y el aviso junto al campo. "malformed" marca lo
  que está escrito pero mal (correo o teléfono incompletos).
*/
function bookingProblems() {
  const fields = bookingForm.elements;
  const problems = [];
  const add = (key, summary, message, malformed = false) => problems.push({ key, summary, message, malformed });

  if (!selectedSlot) {
    add("slot", "el horario", "Elegí un día y un horario.");
  }
  if (!bookingService.disabled && !bookingService.value) {
    add("service", "el motivo", "Elegí el motivo de la consulta.");
  }
  if (fields.name.value.trim().length < 2) {
    add("name", "tu nombre", "Escribí tu nombre y apellido.");
  }
  const phoneDigits = (fields.phone.value.match(/\d/g) || []).length;
  if (phoneDigits < 8) {
    add(
      "phone",
      phoneDigits ? "un teléfono de al menos 8 números" : "el teléfono",
      "Escribí un teléfono de al menos 8 números.",
      phoneDigits > 0
    );
  }
  const email = fields.email.value.trim();
  if (!email) {
    add("email", "el correo", "Escribí tu correo.");
  } else if (!EMAIL_PATTERN.test(email)) {
    add("email", "un correo válido", "Revisá el correo, parece incompleto (por ejemplo, nombre@gmail.com).", true);
  }
  if (!fields.details.value.trim()) {
    add("details", "la consulta", "Contanos brevemente qué necesitás consultar.");
  }
  if (!fields.consent.checked) {
    add("consent", "el consentimiento", "Marcá la casilla para poder agendar el turno.");
  }
  if (!bookingTurnstile.token) {
    add("turnstile", "la verificación de seguridad", "Esperá a que termine la verificación de seguridad.");
  }
  return problems;
}

function joinWithY(items) {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} y ${items.at(-1)}` : items[0];
}

/*
  El botón queda gris (aria-disabled, no disabled, para que un toque igual
  muestre qué falta) hasta que está todo. Arriba, el resumen de lo que falta se
  achica a medida que se completa; los avisos en rojo junto a cada campo
  aparecen después de tocar el botón gris y se van limpiando al corregir.
*/
function refreshBookingForm() {
  const problems = bookingProblems();
  const complete = problems.length === 0;

  bookingSubmit.setAttribute("aria-disabled", String(!complete));
  bookingSubmit.classList.toggle("is-incomplete", !complete);

  Object.entries(BOOKING_FIELDS).forEach(([key, field]) => {
    const problem = problems.find((entry) => entry.key === key);
    const show = Boolean(problem) && (markMissing || (problem.malformed && leftFields.has(key)));
    const error = document.getElementById(field.error);
    error.textContent = show ? problem.message : "";
    error.hidden = !show;

    const control = key === "slot" ? null : field.control();
    if (control && key !== "turnstile") {
      if (show) {
        control.setAttribute("aria-invalid", "true");
      } else {
        control.removeAttribute("aria-invalid");
      }
    }
    if (key === "slot") {
      bookingPicker.classList.toggle("is-invalid", show);
    }
  });

  // Sin agenda cargada no tiene sentido pedir datos: ahí manda el aviso de WhatsApp.
  bookingMissing.textContent = availability && !complete
    ? `Para confirmar falta: ${joinWithY(problems.map((problem) => problem.summary))}.`
    : "";
  return problems;
}

function showSlotHint() {
  if (selectedSlot && !bookingStatus.classList.contains("is-error")) {
    setBookingStatus(`Elegiste el ${formatSlot(selectedSlot)}.`);
  }
}

async function showBookingStep() {
  /*
    Si el trámite vino de Servicios se muestra fijo; si no, se pide con el
    select, que arranca en lo último elegido. Deshabilitado queda fuera de la
    validación y del envío.
  */
  bookingServiceFixed.hidden = !serviceIsFixed;
  bookingServiceField.hidden = serviceIsFixed;
  bookingService.disabled = serviceIsFixed;
  if (!serviceIsFixed) {
    bookingService.value = selectedService || "";
  }

  showDialogStep(bookingStep);
  refreshBookingForm();

  const config = await loadBookingConfig();
  if (!config) {
    setBookingStatus(UNAVAILABLE_MESSAGE, { error: true, offerWhatsApp: true });
    return;
  }

  bookingTurnstile.setup(config.turnstileSiteKey).catch(() => {
    setBookingStatus(UNAVAILABLE_MESSAGE, { error: true, offerWhatsApp: true });
  });
  // Siempre se piden de nuevo: si Eliana bloqueó un día, que se vea al abrir.
  await loadAvailability();
}

async function loadAvailability() {
  setBookingStatus("Cargando los horarios disponibles…");
  bookingDates.setAttribute("aria-busy", "true");

  try {
    const response = await fetch("/api/availability", { headers: { accept: "application/json" } });
    const data = await readJson(response);
    if (!response.ok || !Array.isArray(data?.days)) {
      throw new Error("availability");
    }

    availability = data;
    // Se mantiene el día elegido mientras tenga horarios; si se llenó, se pasa al primero libre.
    const current = availability.days.find((day) => day.date === selectedDate);
    if (!current || isFullDay(current)) {
      selectedDate = availability.days.find((day) => !isFullDay(day))?.date
        || availability.days[0]?.date
        || null;
    }
    if (!availability.days.some((day) => day.slots.some((slot) => slot.start === selectedSlot && slot.status === "available"))) {
      selectedSlot = null;
    }

    renderDates(true);
    const noneLeft = !availability.days.some((day) => !isFullDay(day));
    setBookingStatus(noneLeft ? "No quedan horarios libres en las próximas semanas." : "", {
      offerWhatsApp: noneLeft
    });
  } catch (_error) {
    availability = null;
    bookingDates.innerHTML = "";
    bookingSlots.innerHTML = "";
    setBookingStatus(UNAVAILABLE_MESSAGE, { error: true, offerWhatsApp: true });
  } finally {
    bookingDates.removeAttribute("aria-busy");
    refreshBookingForm();
  }
}

/*
  La fila de fechas se desplaza en horizontal. Se centra la elegida solo al
  cargar: recentrarla después de un toque mueve la fila bajo el dedo y parece
  que se eligió el día de al lado.
*/
function centerSelectedDate() {
  const selected = bookingDates.querySelector(".booking-date.is-selected");
  if (selected) {
    bookingDates.scrollLeft = selected.offsetLeft - (bookingDates.clientWidth - selected.offsetWidth) / 2;
  }
}

function renderDates(center = false) {
  const trimDot = (value) => String(value).replace(/\.$/, "");
  bookingDates.replaceChildren(...(availability?.days || []).map((day) => {
    const date = new Date(`${day.date}T12:00:00Z`);
    const parts = Object.fromEntries(DATE_CHIP_FORMATTER.formatToParts(date).map((part) => [part.type, part.value]));
    const button = document.createElement("button");
    const full = isFullDay(day);
    const isSelected = day.date === selectedDate && !full;
    button.type = "button";
    button.className = `booking-date${isSelected ? " is-selected" : ""}`;
    button.dataset.date = day.date;
    // Completo: tachado como los horarios ocupados y sin poder elegirse.
    button.disabled = full;
    button.setAttribute("aria-pressed", String(isSelected));
    button.setAttribute(
      "aria-label",
      `${DATE_LABEL_FORMATTER.format(date)}${full ? ", sin horarios disponibles" : ""}`
    );
    button.innerHTML = `<span class="booking-date-weekday">${trimDot(parts.weekday)}</span>`
      + `<span class="booking-date-day">${parts.day}</span>`
      + `<span class="booking-date-month">${trimDot(parts.month)}</span>`;
    button.addEventListener("click", () => {
      const keepScroll = bookingDates.scrollLeft;
      selectedDate = day.date;
      selectedSlot = null;
      resetAttempt();
      renderDates();
      bookingDates.scrollLeft = keepScroll;
      refreshBookingForm();
    });
    return button;
  }));

  if (center) {
    centerSelectedDate();
  }
  renderSlots();
}

function renderSlots() {
  const day = availability?.days?.find((entry) => entry.date === selectedDate);
  if (!day) {
    bookingSlots.replaceChildren();
    return;
  }

  bookingSlots.replaceChildren(...day.slots.map((slot) => {
    const button = document.createElement("button");
    const available = slot.status === "available";
    const time = slot.start.slice(11, 16);
    button.type = "button";
    button.className = `booking-slot${slot.start === selectedSlot ? " is-selected" : ""}`;
    button.disabled = !available;
    button.setAttribute("aria-pressed", String(slot.start === selectedSlot));
    // El texto oculto evita que "ocupado" dependa solo del tachado.
    button.innerHTML = `${time}<span class="visually-hidden">${available ? "" : " (ocupado)"}</span>`;
    button.addEventListener("click", () => {
      if (selectedSlot !== slot.start) {
        resetAttempt();
      }
      selectedSlot = slot.start;
      renderSlots();
      refreshBookingForm();
      showSlotHint();
    });
    return button;
  }));
}

// El script de Cloudflare se carga recién cuando alguien abre la agenda.
function loadTurnstileScript() {
  turnstileLoading ||= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      turnstileLoading = null;
      reject(new Error("turnstile"));
    };
    document.head.append(script);
  });
  return turnstileLoading;
}

/*
  Una verificación de Turnstile por formulario (la agenda y la consulta), cada
  una con su action: el servidor no acepta el token de un formulario en el
  otro. onChange avisa cuando aparece o se pierde el token.
*/
function createTurnstileField(container, action, onChange) {
  let token = "";
  let widgetId = null;

  return {
    get token() {
      return token;
    },
    async setup(siteKey) {
      if (widgetId !== null) {
        return;
      }
      const turnstile = await loadTurnstileScript();
      if (widgetId !== null) {
        return;
      }
      // "flexible" no baja de 300px: en teléfonos angostos se usa el compacto.
      // Se mide el formulario porque el contenedor vacío está oculto y mide 0.
      const formBody = container.parentElement;
      const formStyle = getComputedStyle(formBody);
      const available = formBody.clientWidth - parseFloat(formStyle.paddingLeft) - parseFloat(formStyle.paddingRight);
      const update = (value) => {
        token = value;
        onChange();
      };
      widgetId = turnstile.render(container, {
        sitekey: siteKey,
        action,
        language: "es",
        size: available >= 300 ? "flexible" : "compact",
        callback: (value) => update(value),
        "expired-callback": () => update(""),
        "error-callback": () => update("")
      });
    },
    // El token sirve para un solo envío, salió bien o mal.
    reset() {
      token = "";
      if (window.turnstile && widgetId !== null) {
        window.turnstile.reset(widgetId);
      }
      onChange();
    }
  };
}

const bookingTurnstile = createTurnstileField(turnstileWidget, "booking", () => refreshBookingForm());

function randomKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, "0")).join("");
}

function showBookingDone(result) {
  const when = formatSlot(result.start);
  bookingDoneService.textContent = result.service;
  bookingDoneWhen.textContent = when.charAt(0).toUpperCase() + when.slice(1);
  bookingDoneEmail.replaceChildren();
  if (result.emailSent) {
    const email = document.createElement("strong");
    email.textContent = result.email;
    bookingDoneEmail.append("Te enviamos la confirmación a ", email, ".");
  } else {
    bookingDoneEmail.textContent = "No pudimos enviarte el correo de confirmación: anotá estos datos.";
  }
  bookingDoneWhatsapp.href = buildWhatsAppUrl(
    `Hola Eliana, tengo un turno el ${when} y necesito cancelarlo o cambiarlo.`
  );
  showDialogStep(bookingDone);
}

bookingService.addEventListener("change", () => {
  setSelectedService(bookingService.value);
});

bookingForm.elements.name.addEventListener("input", syncSuggestedDetails);

bookingForm.addEventListener("input", () => {
  resetAttempt();
  refreshBookingForm();
});

bookingForm.addEventListener("focusout", (event) => {
  if (event.target.name === "email" || event.target.name === "phone") {
    leftFields.add(event.target.name);
    refreshBookingForm();
  }
});

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (bookingSubmit.disabled) {
    return;
  }

  // Botón gris: no se envía nada, se marca lo que falta y se lleva el foco al primero.
  markMissing = true;
  const problems = refreshBookingForm();
  if (problems.length) {
    const target = BOOKING_FIELDS[problems[0].key].control();
    target?.scrollIntoView({ block: "center" });
    if (target && target !== turnstileWidget) {
      target.focus({ preventScroll: true });
    }
    return;
  }

  // Un reintento del mismo envío usa la misma clave y no duplica el turno.
  attemptKey ||= randomKey();
  const fields = bookingForm.elements;
  const payload = {
    service: currentService(),
    start: selectedSlot,
    name: fields.name.value,
    email: fields.email.value,
    phone: fields.phone.value,
    details: fields.details.value,
    consent: fields.consent.checked,
    turnstileToken: bookingTurnstile.token,
    idempotencyKey: attemptKey
  };

  bookingSubmit.disabled = true;
  setBookingStatus("Confirmando el turno…");

  let response;
  let data;
  try {
    response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload)
    });
    data = await readJson(response);
  } catch (_error) {
    response = null;
  }

  bookingSubmit.disabled = false;
  bookingTurnstile.reset();

  if (response?.ok && data?.status === "confirmed") {
    showBookingDone(data);
    bookingForm.reset();
    generatedDetails = "";
    syncSuggestedDetails();
    selectedSlot = null;
    resetAttempt();
    availability = null;
    markMissing = false;
    leftFields.clear();
    refreshBookingForm();
    return;
  }

  if (response?.status === 409) {
    resetAttempt();
    selectedSlot = null;
    await loadAvailability();
    setBookingStatus("Ese horario acaba de ocuparse. Elegí otro.", { error: true });
    return;
  }

  if (response?.status === 400) {
    setBookingStatus(Object.values(data?.fields || {})[0] || "Revisá los datos ingresados.", { error: true });
    return;
  }

  if (response?.status === 403) {
    setBookingStatus("No pudimos completar la verificación. Marcala de nuevo y confirmá.", { error: true });
    return;
  }

  setBookingStatus(
    "No pudimos confirmar el turno. Tus datos siguen cargados: podés reintentar o agendar por WhatsApp.",
    { error: true, offerWhatsApp: true }
  );
});

/*
  CONSULTA POR CORREO
  La persona deja nombre, correo, trámite (opcional) y consulta. El servidor
  (/api/consultas) le manda el correo a Eliana con «Responder a» = el correo
  de la persona: el de Eliana no aparece en la página. No se guarda nada en
  el navegador.
*/
const CONSULTA_MAX = 2000;
// Desde acá el contador se pone en rojo: avisa antes de llegar al tope.
const CONSULTA_NEAR_MAX = 1800;
const CONSULTA_UNAVAILABLE = "No pudimos enviar tu consulta. Probá de nuevo o escribinos por WhatsApp.";

const consultaTurnstile = createTurnstileField(consultaTurnstileBox, "consulta", () => {
  if (consultaMarkMissing) refreshConsultaForm();
});
let consultaKey = null;
// true después del primer intento de envío: desde ahí se marcan los campos que faltan.
let consultaMarkMissing = false;

const CONSULTA_FIELDS = {
  name: { error: "consultaNameError", control: () => consultaForm.elements.name },
  email: { error: "consultaEmailError", control: () => consultaForm.elements.email },
  message: { error: "consultaMessageError", control: () => consultaForm.elements.message },
  consent: { error: "consultaConsentError", control: () => consultaForm.elements.consent },
  turnstile: { error: "consultaTurnstileError", control: () => consultaTurnstileBox }
};

function setConsultaStatus(message, { error = false, offerWhatsApp = false } = {}) {
  consultaStatus.textContent = message;
  consultaStatus.classList.toggle("is-error", error);
  consultaFallback.hidden = !offerWhatsApp;
}

function updateConsultaCounter() {
  const length = consultaForm.elements.message.value.length;
  consultaCounter.textContent = `${length} / ${CONSULTA_MAX}`;
  consultaCounter.classList.toggle("is-near", length >= CONSULTA_NEAR_MAX);
}

function consultaProblems() {
  const fields = consultaForm.elements;
  const problems = {};
  if (fields.name.value.trim().length < 2) problems.name = "Escribí tu nombre y apellido.";
  const email = fields.email.value.trim();
  if (!email) problems.email = "Escribí tu correo.";
  else if (!EMAIL_PATTERN.test(email)) {
    problems.email = "Revisá el correo, parece incompleto (por ejemplo, nombre@gmail.com).";
  }
  if (!fields.message.value.trim()) problems.message = "Escribí tu consulta.";
  if (!fields.consent.checked) problems.consent = "Marcá la casilla para poder enviar la consulta.";
  if (!consultaTurnstile.token) problems.turnstile = "Esperá a que termine la verificación de seguridad.";
  return problems;
}

function refreshConsultaForm() {
  const problems = consultaProblems();
  Object.entries(CONSULTA_FIELDS).forEach(([key, field]) => {
    const message = consultaMarkMissing ? problems[key] : "";
    const error = document.getElementById(field.error);
    error.textContent = message || "";
    error.hidden = !message;
    if (key !== "turnstile") {
      if (message) field.control().setAttribute("aria-invalid", "true");
      else field.control().removeAttribute("aria-invalid");
    }
  });
  return problems;
}

async function showConsultaStep() {
  // Si vino de un trámite de Servicios, ya queda elegido; si no, la persona lo elige si quiere.
  consultaService.value = selectedService || "";
  setConsultaStatus("");
  updateConsultaCounter();
  showDialogStep(consultaStep);

  const config = await loadConsultaConfig();
  if (!config) {
    setConsultaStatus(CONSULTA_UNAVAILABLE, { error: true, offerWhatsApp: true });
    return;
  }
  consultaTurnstile.setup(config.turnstileSiteKey).catch(() => {
    setConsultaStatus(CONSULTA_UNAVAILABLE, { error: true, offerWhatsApp: true });
  });
}

function showConsultaDone(email) {
  const strong = document.createElement("strong");
  strong.textContent = email;
  consultaDoneEmail.replaceChildren("Te vamos a responder por correo a ", strong, ".");
  showDialogStep(consultaDone);
}

consultaForm.elements.message.addEventListener("input", updateConsultaCounter);

consultaForm.addEventListener("input", () => {
  consultaKey = null;
  if (consultaMarkMissing) refreshConsultaForm();
});

consultaService.addEventListener("change", () => {
  setSelectedService(consultaService.value);
});

consultaForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (consultaSubmit.disabled) {
    return;
  }

  consultaMarkMissing = true;
  const problems = refreshConsultaForm();
  const first = Object.keys(CONSULTA_FIELDS).find((key) => problems[key]);
  if (first) {
    const target = CONSULTA_FIELDS[first].control();
    target.scrollIntoView({ block: "center" });
    if (target !== consultaTurnstileBox) target.focus({ preventScroll: true });
    return;
  }

  // Un reintento del mismo envío usa la misma clave y no duplica el correo.
  consultaKey ||= randomKey();
  const fields = consultaForm.elements;
  const payload = {
    service: consultaService.value,
    name: fields.name.value,
    email: fields.email.value,
    message: fields.message.value,
    consent: fields.consent.checked,
    turnstileToken: consultaTurnstile.token,
    idempotencyKey: consultaKey
  };

  consultaSubmit.disabled = true;
  setConsultaStatus("Enviando tu consulta…");

  let response;
  let data;
  try {
    response = await fetch("/api/consultas", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload)
    });
    data = await readJson(response);
  } catch (_error) {
    response = null;
  }

  consultaSubmit.disabled = false;
  consultaTurnstile.reset();

  if (response?.ok && data?.status === "sent") {
    showConsultaDone(data.email);
    consultaForm.reset();
    consultaKey = null;
    consultaMarkMissing = false;
    refreshConsultaForm();
    updateConsultaCounter();
    return;
  }
  if (response?.status === 400) {
    setConsultaStatus(Object.values(data?.fields || {})[0] || "Revisá los datos ingresados.", { error: true });
    return;
  }
  if (response?.status === 403) {
    setConsultaStatus("No pudimos completar la verificación. Marcala de nuevo y enviá.", { error: true });
    return;
  }
  setConsultaStatus(CONSULTA_UNAVAILABLE, { error: true, offerWhatsApp: true });
});

buildServiceOptions(bookingService);
buildServiceOptions(consultaService);
setSelectedService(null);

/*
  /reservar (el QR de los carteles) redirige a /?reservar#contactar: la página
  cae en la sección de reserva y, si la agenda está prendida, abre la ventana
  directo en la agenda. El parámetro se borra para que recargar no la reabra.
*/
const startParams = new URLSearchParams(location.search);
const openBookingOnLoad = startParams.has("reservar");
if (openBookingOnLoad) {
  startParams.delete("reservar");
  const query = startParams.toString();
  history.replaceState(null, "", location.pathname + (query ? `?${query}` : "") + location.hash);
}

/*
  Cada fila de opciones se acomoda a lo que quedó visible: sin opciones se
  oculta y con una sola va a lo ancho (is-single). Se hace acá y no con
  :has() en el CSS, que los navegadores viejos no entienden.
*/
function syncOptionRows() {
  document.querySelectorAll(".contact-options").forEach((row) => {
    const visible = [...row.children].filter(
      (child) => child.classList.contains("contact-option") && !child.hidden
    ).length;
    row.hidden = visible === 0;
    row.classList.toggle("is-single", visible === 1);
  });
}

/*
  La agenda y el formulario de consultas se prenden por separado. Apagada la
  agenda, se ocultan sus botones y la línea «¿Venís al escritorio?»;
  apagado el formulario, su opción. WhatsApp está siempre.
*/
Promise.all([loadBookingConfig(), loadConsultaConfig()]).then(([bookingConfig, consultaConfig]) => {
  bookingStartButtons.forEach((button) => {
    button.hidden = !bookingConfig;
  });
  consultaStartButtons.forEach((button) => {
    button.hidden = !consultaConfig;
  });
  bookingBlocks.forEach((block) => {
    block.hidden = !bookingConfig;
  });
  syncOptionRows();

  // Si ya la abrió a mano mientras cargaba, reabrirla le borraría lo elegido.
  if (bookingConfig && openBookingOnLoad && !contactDialog.open) {
    openContactDialog(null, { booking: true });
  }
});


/*
  En pantallas táctiles no hay hover: tocar una reseña la deja marcada hasta
  tocar otra o cualquier otro lugar de la página.
*/
document.addEventListener(
  "pointerdown",
  (event) => {
    if (event.pointerType === "mouse") {
      return;
    }
    const touched = event.target.closest?.(".review-card");
    document.querySelectorAll(".review-card.is-touched").forEach((card) => {
      if (card !== touched) {
        card.classList.remove("is-touched");
      }
    });
    touched?.classList.add("is-touched");
  },
  { passive: true }
);

/*
  CARRUSEL DE RESEÑAS
  Las flechas mueven la fila de a una tarjeta; el scroll-snap del CSS la deja
  alineada. Dan la vuelta: desde la última, "siguiente" vuelve a la primera,
  y desde la primera, "anterior" va a la última. Con mouse van a los
  costados y en pantallas táctiles, debajo de la fila (ver el CSS).
*/
const reviewsCarousel = document.querySelector(".reviews-carousel");
const reviewsTrack = document.getElementById("reviewsTrack");
const reviewsPrev = reviewsCarousel?.querySelector(".reviews-arrow-prev");
const reviewsNext = reviewsCarousel?.querySelector(".reviews-arrow-next");

function moveReviews(direction) {
  const card = reviewsTrack.querySelector(".review-card");
  const gap = parseFloat(getComputedStyle(reviewsTrack).columnGap) || 0;
  const lastScroll = reviewsTrack.scrollWidth - reviewsTrack.clientWidth;
  // Sin "behavior": manda el scroll-behavior del CSS, que respeta reducir movimiento.
  if (direction > 0 && reviewsTrack.scrollLeft >= lastScroll - 1) {
    reviewsTrack.scrollTo({ left: 0 });
  } else if (direction < 0 && reviewsTrack.scrollLeft <= 1) {
    reviewsTrack.scrollTo({ left: lastScroll });
  } else {
    reviewsTrack.scrollBy({ left: direction * (card.offsetWidth + gap) });
  }
}

/*
  LEER MÁS
  El CSS corta las reseñas en 7 líneas. Las que no entran llevan el botón,
  que se vuelve a medir al cambiar el ancho (en el celular se cortan más) y
  cuando terminan de cargar las tipografías, que cambian el largo de línea.
*/
function updateReviewToggles() {
  reviewsTrack.querySelectorAll(".review-card:not(.is-expanded)").forEach((card) => {
    const text = card.querySelector("blockquote");
    let toggle = card.querySelector(".review-toggle");
    const cut = text.scrollHeight > text.clientHeight + 1;
    if (cut && !toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "review-toggle";
      toggle.textContent = "Leer más";
      toggle.setAttribute("aria-expanded", "false");
      text.after(toggle);
    }
    if (toggle) toggle.hidden = !cut;
  });
}

if (reviewsCarousel && reviewsTrack && reviewsPrev && reviewsNext) {
  reviewsCarousel.classList.add("is-ready");
  reviewsPrev.addEventListener("click", () => moveReviews(-1));
  reviewsNext.addEventListener("click", () => moveReviews(1));

  reviewsTrack.addEventListener("click", (event) => {
    const toggle = event.target.closest(".review-toggle");
    if (!toggle) return;
    const expanded = toggle.closest(".review-card").classList.toggle("is-expanded");
    toggle.textContent = expanded ? "Leer menos" : "Leer más";
    toggle.setAttribute("aria-expanded", String(expanded));
    // Al cerrarla se mide de nuevo, por si el ancho cambió mientras estaba abierta.
    if (!expanded) updateReviewToggles();
  });

  let toggleFrame = 0;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(toggleFrame);
    toggleFrame = requestAnimationFrame(updateReviewToggles);
  });
  document.fonts?.ready.then(updateReviewToggles);
  updateReviewToggles();
}

copyAddressButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(OFFICE_ADDRESS);
    showToast("Dirección copiada");
  } catch (error) {
    showToast("No se pudo copiar. La dirección es Sarandí 294 esquina 18 de Julio, Rosario.");
  }
});

document.getElementById("currentYear").textContent = new Date().getFullYear();
