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
const channelStep = document.getElementById("channelStep");
const bookingStep = document.getElementById("bookingStep");
const bookingDone = document.getElementById("bookingDone");
const bookingBack = document.getElementById("bookingBack");
const bookingForm = document.getElementById("bookingForm");
const bookingServiceFixed = document.getElementById("bookingServiceFixed");
const bookingServiceField = document.getElementById("bookingServiceField");
const bookingService = document.getElementById("bookingService");
const bookingDates = document.getElementById("bookingDates");
const bookingSlots = document.getElementById("bookingSlots");
const bookingStatus = document.getElementById("bookingStatus");
const bookingFallback = document.getElementById("bookingFallback");
const bookingSubmit = document.getElementById("bookingSubmit");
const turnstileWidget = document.getElementById("turnstileWidget");
const bookingDoneTitle = document.getElementById("bookingDoneTitle");
const bookingDoneService = document.getElementById("bookingDoneService");
const bookingDoneWhen = document.getElementById("bookingDoneWhen");
const bookingDoneEmail = document.getElementById("bookingDoneEmail");
const bookingDoneWhatsapp = document.getElementById("bookingDoneWhatsapp");
const bookingDoneClose = document.getElementById("bookingDoneClose");
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

function updateScrollIndicator() {
  const scrollY = window.scrollY;

  if (Math.abs(scrollY - lastScrollY) > 2) {
    navLinks.dataset.scrollDirection = scrollY > lastScrollY ? "down" : "up";
    lastScrollY = scrollY;
  }

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

  // En la ventana, "Seleccionaste" solo tiene sentido si se eligió algo.
  dialogSelectedService.hidden = !selectedService;

  whatsappLinks.forEach((link) => {
    link.href = buildWhatsAppUrl(buildWhatsAppMessage(currentService()));
  });

  syncSuggestedDetails();
}

function showDialogStep(step) {
  [channelStep, bookingStep, bookingDone].forEach((element) => {
    element.hidden = element !== step;
  });
  contactDialog.classList.toggle("is-booking", step === bookingStep);
  contactDialog.setAttribute(
    "aria-labelledby",
    step === bookingStep ? "bookingTitle" : step === bookingDone ? "bookingDoneTitle" : "contactDialogTitle"
  );
  contactDialog.scrollTop = 0;
}

function openContactDialog(service = selectedService, { booking = false, fromService = false } = {}) {
  setSelectedService(service);
  serviceIsFixed = fromService && Boolean(selectedService);

  if (!contactDialog.open) {
    contactDialog.showModal();
  }

  document.body.classList.add("modal-open");

  if (booking) {
    showBookingStep();
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
  button.addEventListener("click", () => {
    if (contactDialog.contains(button)) {
      showBookingStep();
    } else {
      openContactDialog(selectedService, { booking: true });
    }
  });
});

closeContactDialogButton.addEventListener("click", closeContactDialog);
bookingDoneClose.addEventListener("click", closeContactDialog);

bookingBack.addEventListener("click", () => {
  showDialogStep(channelStep);
  channelStep.querySelector("[data-booking-start]").focus();
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

contactDialog.querySelectorAll("#channelStep [data-contact-whatsapp], #bookingFallback").forEach((link) => {
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

const AVAILABILITY_MAX_AGE_MS = 60000;
const UNAVAILABLE_MESSAGE =
  "No pudimos cargar la agenda en este momento. Podés reservar por WhatsApp con el trámite ya cargado.";

let bookingConfigRequest = null;
let availability = null;
let availabilityLoadedAt = 0;
let selectedDate = null;
let selectedSlot = null;
let attemptKey = null;
let generatedDetails = "";
let turnstileToken = "";
let turnstileWidgetId = null;
let turnstileLoading = null;

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

function loadBookingConfig() {
  bookingConfigRequest ||= fetch("/api/booking-config", { headers: { accept: "application/json" } })
    .then(async (response) => {
      const config = response.ok ? await readJson(response) : null;
      return config?.enabled === true && config.turnstileSiteKey ? config : null;
    })
    .catch(() => null);
  return bookingConfigRequest;
}

// El select de motivos se arma desde las tarjetas de Servicios, agrupado igual que en la página.
function buildServiceOptions() {
  document.querySelectorAll(".service-card").forEach((card) => {
    const group = document.createElement("optgroup");
    group.label = card.querySelector("h3").textContent.trim();
    card.querySelectorAll("[data-service]").forEach((link) => {
      group.append(new Option(link.dataset.service, link.dataset.service));
    });
    bookingService.append(group);
  });
  bookingService.append(new Option("Otra consulta notarial", DEFAULT_SERVICE));
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

function updateSubmitState() {
  bookingSubmit.disabled = !selectedSlot || !turnstileToken || !bookingForm.checkValidity();
}

// Recuerda el horario elegido y, mientras falte algo, qué falta: el botón gris no lo dice.
function showSlotHint() {
  if (!selectedSlot) {
    return;
  }
  const missing = !bookingForm.checkValidity()
    ? " Completá tus datos para confirmar."
    : !turnstileToken
      ? " Falta la verificación de seguridad."
      : "";
  setBookingStatus(`Elegiste el ${formatSlot(selectedSlot)}.${missing}`);
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
  bookingBack.focus();
  updateSubmitState();

  const config = await loadBookingConfig();
  if (!config) {
    setBookingStatus(UNAVAILABLE_MESSAGE, { error: true, offerWhatsApp: true });
    return;
  }

  setupTurnstile(config.turnstileSiteKey);
  if (!availability || Date.now() - availabilityLoadedAt > AVAILABILITY_MAX_AGE_MS) {
    await loadAvailability();
  }
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
    availabilityLoadedAt = Date.now();
    if (!availability.days.some((day) => day.date === selectedDate)) {
      selectedDate = availability.days.find((day) => day.slots.some((slot) => slot.status === "available"))?.date
        || availability.days[0]?.date
        || null;
    }
    if (!availability.days.some((day) => day.slots.some((slot) => slot.start === selectedSlot && slot.status === "available"))) {
      selectedSlot = null;
    }

    renderDates(true);
    setBookingStatus(availability.days.length ? "" : "No quedan horarios en las próximas semanas.", {
      offerWhatsApp: !availability.days.length
    });
  } catch (_error) {
    availability = null;
    bookingDates.innerHTML = "";
    bookingSlots.innerHTML = "";
    setBookingStatus(UNAVAILABLE_MESSAGE, { error: true, offerWhatsApp: true });
  } finally {
    bookingDates.removeAttribute("aria-busy");
    updateSubmitState();
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
    const isSelected = day.date === selectedDate;
    button.type = "button";
    button.className = `booking-date${isSelected ? " is-selected" : ""}`;
    button.dataset.date = day.date;
    button.setAttribute("aria-pressed", String(isSelected));
    button.setAttribute("aria-label", DATE_LABEL_FORMATTER.format(date));
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
      updateSubmitState();
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
      updateSubmitState();
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

async function setupTurnstile(siteKey) {
  if (turnstileWidgetId !== null) {
    return;
  }

  try {
    const turnstile = await loadTurnstileScript();
    if (turnstileWidgetId !== null) {
      return;
    }
    turnstileWidgetId = turnstile.render(turnstileWidget, {
      sitekey: siteKey,
      action: "booking",
      language: "es",
      size: "flexible",
      callback: (token) => {
        turnstileToken = token;
        updateSubmitState();
        if (!bookingStatus.classList.contains("is-error")) {
          showSlotHint();
        }
      },
      "expired-callback": () => {
        turnstileToken = "";
        updateSubmitState();
      },
      "error-callback": () => {
        turnstileToken = "";
        updateSubmitState();
      }
    });
  } catch (_error) {
    setBookingStatus(UNAVAILABLE_MESSAGE, { error: true, offerWhatsApp: true });
  }
}

function resetTurnstile() {
  turnstileToken = "";
  if (window.turnstile && turnstileWidgetId !== null) {
    window.turnstile.reset(turnstileWidgetId);
  }
  updateSubmitState();
}

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
  bookingDoneTitle.focus();
}

bookingService.addEventListener("change", () => {
  setSelectedService(bookingService.value);
});

bookingForm.elements.name.addEventListener("input", syncSuggestedDetails);

bookingForm.addEventListener("input", () => {
  resetAttempt();
  updateSubmitState();
  if (!bookingStatus.classList.contains("is-error")) {
    showSlotHint();
  }
});

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!bookingForm.checkValidity()) {
    bookingForm.reportValidity();
    return;
  }
  if (!selectedSlot || !turnstileToken) {
    setBookingStatus("Elegí un horario y completá la verificación.", { error: true });
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
    turnstileToken,
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

  // El token de Turnstile sirve para un solo envío, salió bien o mal.
  resetTurnstile();

  if (response?.ok && data?.status === "confirmed") {
    showBookingDone(data);
    bookingForm.reset();
    generatedDetails = "";
    syncSuggestedDetails();
    selectedSlot = null;
    resetAttempt();
    availability = null;
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
    "No pudimos confirmar el turno. Tus datos siguen cargados: podés reintentar o reservar por WhatsApp.",
    { error: true, offerWhatsApp: true }
  );
});

buildServiceOptions();
setSelectedService(null);

// Si la agenda está apagada, la página vuelve a ofrecer solo WhatsApp.
loadBookingConfig().then((config) => {
  if (!config) {
    bookingStartButtons.forEach((button) => {
      button.hidden = true;
    });
  }
});


copyAddressButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(OFFICE_ADDRESS);
    showToast("Dirección copiada");
  } catch (error) {
    showToast("No se pudo copiar. La dirección es Sarandí 294 esquina 18 de Julio, Rosario.");
  }
});

document.getElementById("currentYear").textContent = new Date().getFullYear();
