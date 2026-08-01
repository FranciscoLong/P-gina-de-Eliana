const WHATSAPP_NUMBER = "59891048471";
const OFFICE_EMAIL = "esc.isbarbo@gmail.com";
const OFFICE_ADDRESS = "Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay";
const { buildEmailMessage, buildWhatsAppMessage } = window.ServiceMessages;

const menuButton = document.getElementById("menuButton");
const navLinks = document.getElementById("navLinks");
const bookingDialog = document.getElementById("bookingDialog");
const openBookingDialogButtons = document.querySelectorAll("[data-booking-open]");
const closeBookingDialogButton = document.getElementById("closeBookingDialog");
const bookingChannelStep = document.getElementById("bookingChannelStep");
const bookingEmailStep = document.getElementById("bookingEmailStep");
const whatsappChoice = document.getElementById("whatsappChoice");
const emailChoice = document.getElementById("emailChoice");
const bookingForm = document.getElementById("bookingForm");
const preferredDate = document.getElementById("preferredDate");
const serviceInput = document.getElementById("service");
const selectedServiceLabels = document.querySelectorAll("[data-selected-service]");
const serviceLinks = document.querySelectorAll("[data-service]");
const copyAddressButton = document.getElementById("copyAddress");
const toast = document.getElementById("toast");

const AVAILABLE_SERVICES = new Set([
  "Consulta notarial",
  ...Array.from(serviceLinks, (link) => link.dataset.service)
]);

let selectedService = "Consulta notarial";
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

// Fecha mínima en horario local: toISOString() usa UTC y adelantaría un día
// durante la tarde/noche uruguaya (UTC-3).
function getMinimumBookingDate() {
  const minimumDate = new Date();
  minimumDate.setDate(minimumDate.getDate() + 1);

  const month = String(minimumDate.getMonth() + 1).padStart(2, "0");
  const day = String(minimumDate.getDate()).padStart(2, "0");

  return `${minimumDate.getFullYear()}-${month}-${day}`;
}

preferredDate.min = getMinimumBookingDate();

function validateWeekday() {
  if (!preferredDate.value) {
    preferredDate.setCustomValidity("");
    return;
  }

  const weekday = new Date(`${preferredDate.value}T12:00:00`).getDay();
  const isWeekend = weekday === 0 || weekday === 6;

  preferredDate.setCustomValidity(
    isWeekend ? "El estudio notarial atiende de lunes a viernes. Seleccioná otra fecha." : ""
  );
}

preferredDate.addEventListener("input", validateWeekday);

function showChannelStep() {
  bookingChannelStep.hidden = false;
  bookingEmailStep.hidden = true;
  bookingDialog.setAttribute("aria-labelledby", "bookingDialogTitle");
  bookingDialog.scrollTop = 0;
}

function setSelectedService(service) {
  selectedService = AVAILABLE_SERVICES.has(service) ? service : "Consulta notarial";

  serviceInput.value = selectedService;
  selectedServiceLabels.forEach((label) => {
    label.textContent = selectedService;
  });
}

function openBookingDialog(service = "Consulta notarial") {
  setSelectedService(service);
  showChannelStep();

  if (!bookingDialog.open) {
    bookingDialog.showModal();
  }

  document.body.classList.add("modal-open");
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

emailChoice.addEventListener("click", () => {
  bookingChannelStep.hidden = true;
  bookingEmailStep.hidden = false;
  bookingDialog.setAttribute("aria-labelledby", "bookingEmailTitle");
  bookingDialog.scrollTop = 0;
  document.getElementById("name").focus();
});

bookingDialog.addEventListener("click", (event) => {
  if (event.target === bookingDialog) {
    closeBookingDialog();
  }
});

bookingDialog.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  showChannelStep();
});

function buildWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function buildEmailUrl(message, service) {
  const subject = `Solicitud de turno: ${service}`;
  return `mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

whatsappChoice.addEventListener("click", () => {
  const message = buildWhatsAppMessage(selectedService);
  const bookingWindow = window.open(buildWhatsAppUrl(message), "_blank");

  if (bookingWindow) {
    bookingWindow.opener = null;
    closeBookingDialog();
    showToast("Se abrió WhatsApp con el trámite seleccionado.");
  } else {
    showToast("No se pudo abrir WhatsApp. Escribinos al +598 91 048 471.");
  }
});

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  validateWeekday();

  if (!bookingForm.checkValidity()) {
    bookingForm.reportValidity();
    return;
  }

  const formData = new FormData(bookingForm);
  const service = formData.get("service");
  const draftMessage = buildEmailMessage({
    name: formData.get("name"),
    service,
    preferredDate: formData.get("preferredDate"),
    preferredTime: formData.get("preferredTime"),
    email: formData.get("email"),
    details: formData.get("details")
  });

  closeBookingDialog();
  window.location.href = buildEmailUrl(draftMessage, service);
  showToast("Se abrió tu correo. Revisá y enviá la solicitud para completar el proceso.");
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
