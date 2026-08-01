const WHATSAPP_NUMBER = "59891048471";
const OFFICE_ADDRESS = "Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay";
const { buildBookingDetails, buildWhatsAppMessage } = window.ServiceMessages;

const menuButton = document.getElementById("menuButton");
const navLinks = document.getElementById("navLinks");
const bookingDialog = document.getElementById("bookingDialog");
const openBookingDialogButtons = document.querySelectorAll("[data-booking-open]");
const closeBookingDialogButton = document.getElementById("closeBookingDialog");
const bookingChannelStep = document.getElementById("bookingChannelStep");
const bookingCalendarStep = document.getElementById("bookingCalendarStep");
const calendarChoice = document.getElementById("calendarChoice");
const backToBookingChannels = document.getElementById("backToBookingChannels");
const whatsappChoice = document.getElementById("whatsappChoice");
const selectedServiceLabels = document.querySelectorAll("[data-selected-service]");
const serviceLinks = document.querySelectorAll("[data-service]");
const copyAddressButton = document.getElementById("copyAddress");
const toast = document.getElementById("toast");
const bookingForm = document.getElementById("bookingForm");
const bookingService = document.getElementById("bookingService");
const bookingDates = document.getElementById("bookingDates");
const bookingSlots = document.getElementById("bookingSlots");
const bookingStatus = document.getElementById("bookingStatus");
const bookingSubmit = document.getElementById("bookingSubmit");
const bookingDone = document.getElementById("bookingDone");
const bookingFallbackWhatsapp = document.getElementById("bookingFallbackWhatsapp");
const bookingCalendarStatus = document.getElementById("bookingCalendarStatus");
const bookingCalendarDescription = document.getElementById("bookingCalendarDescription");
const bookingCalendarUnavailable = document.getElementById("bookingCalendarUnavailable");
const bookingSectionIntro = document.getElementById("bookingSectionIntro");
const bookingOverviewIntro = document.getElementById("bookingOverviewIntro");
const turnstileWidget = document.getElementById("turnstileWidget");
const bookingName = bookingForm.elements.name;
const bookingDetails = bookingForm.elements.details;

const SERVICE_CODES = Object.freeze({"Consulta notarial":"consulta-notarial","Compromiso de compraventa":"compromiso-compraventa","Título automotor":"titulo-automotor","Carta Poder":"carta-poder","Prenda":"prenda","Leasing":"leasing","Promesas y cesiones":"promesas-cesiones","Compraventas y estudio de antecedentes":"compraventas-antecedentes","Hipotecas y/o Cancelación":"hipotecas-cancelacion","Arrendamientos y garantías":"arrendamientos-garantias","Sucesiones":"sucesiones","Testamentos":"testamentos","Particiones":"particiones","Cesión de Derechos Hereditarios":"cesion-derechos-hereditarios","Certificación de firmas":"certificacion-firmas","Certificación de situaciones jurídicas":"certificacion-situaciones-juridicas","Poderes":"poderes","Declaraciones juradas":"declaraciones-juradas","Minuta notarial BPS":"minuta-notarial-bps","Constitución de sociedades":"constitucion-sociedades","Contratos civiles y comerciales":"contratos-civiles-comerciales","Certificados y documentación societaria":"certificados-societarios","Trámites ante organismos públicos y/o privados":"tramites-organismos","Tasaciones":"tasaciones"});
const AVAILABLE_SERVICES = new Set(Object.keys(SERVICE_CODES));

let selectedService = "Consulta notarial";
let toastTimer;
let availability = null;
let selectedDate = null;
let selectedSlot = null;
let turnstileToken = "";
let generatedDetails = "";
let turnstileWidgetId = null;

bookingService.innerHTML = Object.entries(SERVICE_CODES).map(([label, code]) => `<option value="${code}">${label}</option>`).join("");

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
  Indicador de sección visible: el mismo trazo rojo del hover marca en qué
  parte de la página está el usuario. En móvil el menú desplegable no tiene
  hover, así que sin esto al abrirlo no hay ninguna referencia de posición.
*/
const HEADER_OFFSET = 96; // scroll-padding-top (88px) + un margen de holgura

const sectionLinks = Array.from(navLinks.querySelectorAll('a[href^="#"]'))
  .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
  .filter((entry) => entry.section);

let currentSectionLink = null;
let lastScrollY = window.scrollY;
let scrollFrame = 0;

function setCurrentSectionLink(link) {
  if (link === currentSectionLink) {
    return;
  }

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

// La sección activa es la última que ya cruzó el borde inferior del header.
function findCurrentSectionLink() {
  const documentHeight = document.documentElement.scrollHeight;
  const reachedBottom = window.innerHeight + window.scrollY >= documentHeight - 2;

  if (reachedBottom) {
    return sectionLinks[sectionLinks.length - 1].link;
  }

  let current = null;

  sectionLinks.forEach((entry) => {
    if (entry.section.getBoundingClientRect().top <= HEADER_OFFSET) {
      current = entry.link;
    }
  });

  return current;
}

function updateScrollIndicator() {
  const scrollY = window.scrollY;

  /*
    El sentido del scroll define el origen de la animación en el CSS. Se ignoran
    los desplazamientos mínimos para que un rebote no invierta el trazo.
  */
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
      if (scrollFrame) {
        return;
      }

      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        updateScrollIndicator();
      });
    },
    { passive: true }
  );

  // Al cambiar el ancho o girar el teléfono las secciones cambian de altura.
  window.addEventListener("resize", () => {
    setCurrentSectionLink(findCurrentSectionLink());
  });
}

function setSelectedService(service) {
  const nextService = AVAILABLE_SERVICES.has(service) ? service : "Consulta notarial";
  const serviceChanged = nextService !== selectedService;
  selectedService = nextService;

  if (serviceChanged) {
    selectedDate = null;
    selectedSlot = null;
    sessionStorage.removeItem("bookingDate");
    sessionStorage.removeItem("bookingStart");
    resetBookingAttempt();
  }

  sessionStorage.setItem("bookingServiceCode", SERVICE_CODES[selectedService]);
  bookingService.value = SERVICE_CODES[selectedService];

  selectedServiceLabels.forEach((label) => {
    label.textContent = selectedService;
  });

  syncSuggestedDetails(serviceChanged);
}

function showBookingChannels() {
  bookingChannelStep.hidden = false;
  bookingCalendarStep.hidden = true;
  bookingDialog.classList.remove("is-calendar");
  bookingDialog.setAttribute("aria-labelledby", "bookingDialogTitle");
  bookingDialog.scrollTop = 0;
}

async function showBookingCalendar() {
  bookingChannelStep.hidden = true;
  bookingCalendarStep.hidden = false;
  bookingDialog.classList.add("is-calendar");
  bookingDialog.setAttribute("aria-labelledby", "bookingCalendarTitle");
  bookingDialog.scrollTop = 0;
  backToBookingChannels.focus();
  await loadAvailability();
  setupTurnstile();
}

function openBookingDialog(service = "Consulta notarial") {
  const storedCode = sessionStorage.getItem("bookingServiceCode");
  const storedService = Object.entries(SERVICE_CODES).find(([, code]) => code === storedCode)?.[0];
  setSelectedService(service === "Consulta notarial" && storedService ? storedService : service);
  showBookingChannels();

  if (!bookingDialog.open) {
    bookingDialog.showModal();
  }

  document.body.classList.add("modal-open");
  requestAnimationFrame(() => {
    (calendarChoice.disabled ? whatsappChoice : calendarChoice).focus();
  });
}

function closeBookingDialog() {
  if (bookingDialog.open) {
    bookingDialog.close();
  }
}

serviceLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openBookingDialog(link.dataset.service);
  });
});

openBookingDialogButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openBookingDialog();
  });
});

closeBookingDialogButton.addEventListener("click", closeBookingDialog);

calendarChoice.addEventListener("click", showBookingCalendar);

backToBookingChannels.addEventListener("click", () => {
  showBookingChannels();
  (calendarChoice.disabled ? whatsappChoice : calendarChoice).focus();
});

bookingDialog.addEventListener("click", (event) => {
  if (event.target === bookingDialog) {
    closeBookingDialog();
  }
});

bookingDialog.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  showBookingChannels();
});

function ymd(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function addDaysToYmd(value, days) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function randomKey() {
  return crypto.getRandomValues(new Uint8Array(18))
    .reduce((text, value) => text + value.toString(16).padStart(2, "0"), "");
}

function setBookingStatus(message, error = false, showWhatsApp = false) {
  bookingStatus.textContent = message;
  bookingStatus.classList.toggle("is-error", error);
  bookingFallbackWhatsapp.hidden = !showWhatsApp;
}

async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

async function configurePreviewBooking() {
  try {
    const response = await fetch("/api/booking-config", {
      headers: { accept: "application/json" },
      cache: "no-store"
    });
    const config = await readApiResponse(response);
    const siteKey = String(config?.turnstileSiteKey || "");
    if (!response.ok || config?.enabled !== true || !/^[A-Za-z0-9_-]{20,100}$/.test(siteKey)) {
      return;
    }

    turnstileWidget.dataset.turnstileSiteKey = siteKey;
    calendarChoice.disabled = false;
    bookingCalendarStatus.textContent = "Disponible para prueba";
    bookingCalendarDescription.textContent = "Probá el flujo completo con Calendar y respuesta por correo.";
    bookingCalendarUnavailable.textContent = "Entorno Preview de prueba. Los horarios y correos generados son reales.";
    bookingSectionIntro.textContent = "Entorno Preview: la agenda está habilitada para probar Calendar y el flujo de correos.";
    bookingOverviewIntro.textContent = "Elegí Agenda en línea para realizar una solicitud de prueba o continuá por WhatsApp.";
  } catch (_error) {
    // Fail closed: el HTML mantiene la agenda deshabilitada.
  }
}

function suggestedDetails() {
  return buildBookingDetails(bookingName.value, selectedService);
}

function syncSuggestedDetails(force = false) {
  const nextSuggestion = suggestedDetails();
  if (force || !bookingDetails.value.trim() || bookingDetails.value === generatedDetails) {
    bookingDetails.value = nextSuggestion;
  }
  generatedDetails = nextSuggestion;
}

/*
  Cuando la solicitud ya fue enviada el formulario queda vacío y el botón de
  solicitar no tiene nada que hacer: se reemplaza por uno de cerrar. Vuelve
  atrás en cuanto el usuario empieza otra solicitud.
*/
function setBookingSubmitted(submitted) {
  bookingSubmit.hidden = submitted;
  bookingDone.hidden = !submitted;
}

function resetBookingAttempt() {
  sessionStorage.removeItem("bookingAttemptId");
  setBookingSubmitted(false);
}

/*
  El botón solo se habilita con la reserva entera lista: fecha, horario, los
  datos de contacto, el consentimiento y la verificación. checkValidity() cubre
  los campos required del formulario y no muestra mensajes, así que puede
  llamarse en cada tecla.
*/
function updateSubmitState() {
  bookingSubmit.disabled = !selectedSlot || !turnstileToken || !bookingForm.checkValidity();
}

function resetTurnstile() {
  turnstileToken = "";
  updateSubmitState();
  if (window.turnstile && turnstileWidgetId !== null) {
    window.turnstile.reset(turnstileWidgetId);
  }
}

async function loadAvailability() {
  selectedSlot = null;
  setBookingSubmitted(false);
  updateSubmitState();
  setBookingStatus("Cargando disponibilidad…");
  const from = ymd(new Date());
  const to = addDaysToYmd(from, 45);
  try {
    const response = await fetch(
      `/api/availability?serviceCode=${encodeURIComponent(bookingService.value)}&from=${from}&to=${to}`,
      { headers: { accept: "application/json" } }
    );
    const data = await readApiResponse(response);
    if (!response.ok || !data) {
      throw new Error(data?.error || "La agenda no respondió correctamente.");
    }
    availability = data;
    renderDates(true);
    setBookingStatus("Elegí una fecha y un horario disponibles.");
  } catch (error) {
    availability = null;
    bookingDates.innerHTML = "";
    bookingSlots.innerHTML = "";
    setBookingStatus(
      "No pudimos cargar la agenda en línea en este momento. Podés reservar por WhatsApp sin perder el trámite seleccionado.",
      true,
      true
    );
  }
}

const DATE_CHIP_FORMATTER = new Intl.DateTimeFormat("es-UY", {
  timeZone: "America/Montevideo",
  weekday: "short",
  day: "numeric",
  month: "short"
});

const DATE_LABEL_FORMATTER = new Intl.DateTimeFormat("es-UY", {
  timeZone: "America/Montevideo",
  weekday: "long",
  day: "numeric",
  month: "long"
});

/*
  Las fechas se desplazan en horizontal, así que la que viene elegida de entrada
  puede quedar fuera de la vista. Se centra moviendo solo esa fila, sin
  scrollIntoView, para no arrastrar el resto del formulario. Nunca se centra
  después de un toque: mover la fila bajo el dedo hace que el usuario crea que
  se seleccionó el día de al lado.
*/
function centerSelectedDate() {
  const selected = bookingDates.querySelector(".booking-date.is-selected");
  if (!selected) {
    return;
  }
  bookingDates.scrollLeft = selected.offsetLeft - (bookingDates.clientWidth - selected.offsetWidth) / 2;
}

function renderDates(centerSelection = false) {
  const days = availability?.days || [];
  const storedDate = sessionStorage.getItem("bookingDate");
  selectedDate = days.some((day) => day.date === selectedDate)
    ? selectedDate
    : days.some((day) => day.date === storedDate)
      ? storedDate
      : days[0]?.date || null;
  bookingDates.innerHTML = days.map((day) => {
    const date = new Date(`${day.date}T12:00:00Z`);
    const parts = Object.fromEntries(
      DATE_CHIP_FORMATTER.formatToParts(date).map((part) => [part.type, part.value])
    );
    // Algunos locales abrevian con punto ("lun.", "ago."): sobra dentro del chip.
    const trimDot = (value) => String(value).replace(/\.$/, "");
    const isSelected = day.date === selectedDate;
    return `<button type="button" class="booking-date${isSelected ? " is-selected" : ""}" data-date="${day.date}" aria-pressed="${isSelected}" aria-label="${DATE_LABEL_FORMATTER.format(date)}"><span class="booking-date-weekday">${trimDot(parts.weekday)}</span><span class="booking-date-day">${parts.day}</span><span class="booking-date-month">${trimDot(parts.month)}</span></button>`;
  }).join("");
  if (centerSelection) {
    centerSelectedDate();
  }
  bookingDates.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    const keepScroll = bookingDates.scrollLeft;
    selectedDate = button.dataset.date;
    selectedSlot = null;
    sessionStorage.setItem("bookingDate", selectedDate);
    sessionStorage.removeItem("bookingStart");
    resetBookingAttempt();
    updateSubmitState();
    renderDates();
    bookingDates.scrollLeft = keepScroll;
  }));
  renderSlots();
}

function renderSlots() {
  const day = availability?.days?.find((entry) => entry.date === selectedDate);
  if (!day) {
    bookingSlots.innerHTML = "<p>No hay fechas disponibles en el período de 45 días.</p>";
    return;
  }
  const storedStart = sessionStorage.getItem("bookingStart");
  if (!selectedSlot && day.slots.some((slot) => slot.start === storedStart && slot.status === "available")) {
    selectedSlot = storedStart;
  }
  bookingSlots.innerHTML = day.slots.map((slot) => {
    const time = slot.start.slice(11, 16);
    const unavailable = slot.status !== "available";
    return `<button type="button" class="booking-slot ${unavailable ? "is-unavailable" : ""}${slot.start === selectedSlot ? " is-selected" : ""}" data-slot="${slot.start}" ${unavailable ? "disabled aria-disabled=\"true\" title=\"No disponible\"" : ""}>${time}<span>${unavailable ? "No disponible" : "Disponible"}</span></button>`;
  }).join("");
  bookingSlots.querySelectorAll("button:not([disabled])").forEach((button) => {
    button.addEventListener("click", () => {
      if (selectedSlot !== button.dataset.slot) {
        resetBookingAttempt();
      }
      selectedSlot = button.dataset.slot;
      sessionStorage.setItem("bookingDate", selectedDate);
      sessionStorage.setItem("bookingStart", selectedSlot);
      updateSubmitState();
      renderSlots();
      if (turnstileWidgetId === null) {
        setBookingStatus(
          "La agenda en línea no está disponible en este momento. Podés reservar por WhatsApp sin perder el trámite seleccionado.",
          true,
          true
        );
      } else {
        // Si todavía faltan datos conviene decirlo: el botón queda gris y no se ve por qué.
        const faltanDatos = !bookingForm.checkValidity();
        setBookingStatus(
          `Horario seleccionado: ${selectedSlot.slice(0, 10)} a las ${selectedSlot.slice(11, 16)}.` +
            (faltanDatos ? " Completá tus datos para confirmar." : "")
        );
      }
    });
  });
  updateSubmitState();
}

function setupTurnstile() {
  const siteKey = turnstileWidget.dataset.turnstileSiteKey;
  if (turnstileWidgetId !== null) {
    return;
  }
  if (!siteKey || !window.turnstile) {
    setBookingStatus(
      "La agenda en línea no está disponible en este momento. Podés reservar por WhatsApp sin perder el trámite seleccionado.",
      true,
      true
    );
    return;
  }
  turnstileWidgetId = window.turnstile.render(turnstileWidget, {
    sitekey: siteKey,
    action: "booking",
    callback: (token) => {
      turnstileToken = token;
      updateSubmitState();
    },
    "expired-callback": () => {
      turnstileToken = "";
      updateSubmitState();
      setBookingStatus("La verificación venció. Completala nuevamente.", true);
    }
  });
}

bookingName.addEventListener("input", () => syncSuggestedDetails());
bookingForm.addEventListener("input", () => {
  resetBookingAttempt();
  updateSubmitState();
});

bookingService.addEventListener("change", () => {
  const nextService = Object.entries(SERVICE_CODES)
    .find(([, code]) => code === bookingService.value)?.[0] || "Consulta notarial";
  const serviceChanged = nextService !== selectedService;
  selectedService = nextService;
  selectedDate = null;
  selectedSlot = null;
  sessionStorage.setItem("bookingServiceCode", bookingService.value);
  sessionStorage.removeItem("bookingDate");
  sessionStorage.removeItem("bookingStart");
  resetBookingAttempt();
  selectedServiceLabels.forEach((label) => {
    label.textContent = selectedService;
  });
  syncSuggestedDetails(serviceChanged);
  loadAvailability();
});

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!bookingForm.checkValidity()) {
    bookingForm.reportValidity();
    return;
  }
  if (!selectedSlot || !turnstileToken) {
    setBookingStatus("Elegí un horario y completá la verificación de seguridad.", true);
    return;
  }

  const fields = new FormData(bookingForm);
  const payload = {
    serviceCode: bookingService.value,
    start: selectedSlot,
    name: fields.get("name"),
    email: fields.get("email"),
    phone: fields.get("phone"),
    details: fields.get("details"),
    consent: fields.get("consent") === "on",
    turnstileToken,
    idempotencyKey: sessionStorage.getItem("bookingAttemptId") || randomKey()
  };
  sessionStorage.setItem("bookingAttemptId", payload.idempotencyKey);
  bookingSubmit.disabled = true;
  setBookingStatus("Enviando la solicitud…");

  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await readApiResponse(response);
    if (!response.ok || !data) {
      throw Object.assign(new Error(data?.error || "No se pudo enviar la solicitud."), {
        status: response.status
      });
    }
    sessionStorage.removeItem("bookingAttemptId");
    sessionStorage.removeItem("bookingDate");
    sessionStorage.removeItem("bookingStart");
    bookingForm.reset();
    bookingService.value = SERVICE_CODES[selectedService];
    generatedDetails = "";
    syncSuggestedDetails();
    selectedSlot = null;
    resetTurnstile();
    await loadAvailability();
    setBookingStatus("Solicitud enviada. Eliana revisará el horario y recibirás su respuesta por correo.");
    setBookingSubmitted(true);
    bookingDone.focus();
  } catch (error) {
    resetTurnstile();
    setBookingStatus(
      error.status === 409
        ? "Ese horario acaba de ocuparse. Elegí otro."
        : "No pudimos enviar la solicitud en este momento. Tus datos siguen en el formulario; podés reintentar o reservar por WhatsApp.",
      true,
      error.status !== 409
    );
    if (error.status === 409) {
      resetBookingAttempt();
      sessionStorage.removeItem("bookingStart");
      loadAvailability();
    }
  }
});
function buildWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function openBookingWhatsApp() {
  const message = buildWhatsAppMessage(selectedService);
  const bookingWindow = window.open(buildWhatsAppUrl(message), "_blank");

  if (bookingWindow) {
    bookingWindow.opener = null;
    closeBookingDialog();
    showToast("Se abrió WhatsApp con el trámite seleccionado.");
  } else {
    showToast("No se pudo abrir WhatsApp. Escribinos al +598 91 048 471.");
  }
}

bookingDone.addEventListener("click", closeBookingDialog);

whatsappChoice.addEventListener("click", openBookingWhatsApp);
bookingFallbackWhatsapp.addEventListener("click", openBookingWhatsApp);

copyAddressButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(OFFICE_ADDRESS);
    showToast("Dirección copiada");
  } catch (error) {
    showToast("No se pudo copiar. La dirección es Sarandí 294 esquina 18 de Julio, Rosario.");
  }
});

document.getElementById("currentYear").textContent = new Date().getFullYear();

configurePreviewBooking();
