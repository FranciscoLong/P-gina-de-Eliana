const WHATSAPP_NUMBER = "59891048471";
const OFFICE_ADDRESS = "Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay";

/*
  ETAPA ACTUAL:
  Mientras no exista un enlace real de Google Calendar Appointment Schedules,
  el formulario envía la solicitud por WhatsApp.

  ETAPA SIGUIENTE:
  Reemplazar CALENDAR_BOOKING_URL por el enlace real y usarlo en lugar del
  enlace de WhatsApp dentro de bookingForm.
*/
const CALENDAR_BOOKING_URL = "https://calendar.google.com/calendar/appointments/schedules/REEMPLAZAR_POR_ENLACE_REAL";

const menuButton = document.getElementById("menuButton");
const navLinks = document.getElementById("navLinks");
const bookingForm = document.getElementById("bookingForm");
const preferredDate = document.getElementById("preferredDate");
const copyAddressButton = document.getElementById("copyAddress");
const toast = document.getElementById("toast");

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

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  validateWeekday();

  if (!bookingForm.checkValidity()) {
    bookingForm.reportValidity();
    return;
  }

  const formData = new FormData(bookingForm);

  const draftMessage = [
    "Hola, quisiera solicitar un turno en la escribanía de Eliana Isbarbo Gfeller.",
    "",
    `Nombre: ${formData.get("name")}`,
    `Teléfono: ${formData.get("phone")}`,
    `Correo: ${formData.get("email")}`,
    `Trámite: ${formData.get("service")}`,
    `Fecha preferida: ${formData.get("preferredDate")}`,
    `Horario preferido: ${formData.get("preferredTime")}`,
    `Descripción: ${formData.get("details") || "Sin descripción adicional."}`,
    "",
    "Comprendo que la solicitud queda sujeta a confirmación."
  ].join("\n");

  const bookingWindow = window.open(
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(draftMessage)}`,
    "_blank",
    "noopener,noreferrer"
  );

  if (bookingWindow) {
    showToast("Se abrió WhatsApp con tu solicitud. Enviala para completar la reserva.");
  } else {
    showToast(`No se pudo abrir WhatsApp. Escribinos al +598 91 048 471.`);
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
