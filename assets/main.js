const WHATSAPP_NUMBER = "59891048471";
const OFFICE_EMAIL = "esc.isbarbo@gmail.com";
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
const serviceSelect = document.getElementById("service");
const copyAddressButton = document.getElementById("copyAddress");
const toast = document.getElementById("toast");

const SERVICE_MESSAGE_TOPICS = {
  "Consulta notarial": "para realizar una consulta notarial",
  "Título o transferencia de automotor": "por un título o una transferencia de automotor",
  "Compraventa de inmueble": "por una compraventa de inmueble",
  "Arrendamiento o alquiler": "por un arrendamiento o alquiler",
  Sucesión: "por una sucesión",
  "Firmas, poderes y certificados": "por una firma, un poder o un certificado",
  "Certificación de firmas": "por una certificación de firmas",
  "Poder o autorización": "por un poder o una autorización",
  Testamento: "por un testamento",
  "Empresa o sociedad": "por un trámite de empresa o sociedad",
  Hipoteca: "por una hipoteca",
  "Otro trámite": "por otro trámite notarial"
};

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

document.querySelectorAll("[data-service]").forEach((link) => {
  link.addEventListener("click", () => {
    const selectedService = link.dataset.service;
    const optionExists = Array.from(serviceSelect.options).some(
      (option) => option.value === selectedService
    );

    if (optionExists) {
      serviceSelect.value = selectedService;
      showToast(`Seleccionamos “${selectedService}” en tu solicitud.`);
    }
  });
});

function formatBookingDate(dateValue) {
  const [year, month, day] = dateValue.split("-");
  return `${day}/${month}/${year}`;
}

function buildWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function buildEmailUrl(message, service) {
  const subject = `Solicitud de turno: ${service}`;
  return `mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  validateWeekday();

  if (!bookingForm.checkValidity()) {
    bookingForm.reportValidity();
    return;
  }

  const formData = new FormData(bookingForm);
  const service = formData.get("service");
  const serviceTopic = SERVICE_MESSAGE_TOPICS[service] || `por ${service}`;
  const details = formData.get("details").trim();
  const deliveryMethod = event.submitter?.value || "whatsapp";

  const draftMessage = [
    `Hola Eliana, soy ${formData.get("name")} y quisiera solicitar un turno ${serviceTopic}.`,
    "",
    `Me gustaría ir el ${formatBookingDate(formData.get("preferredDate"))} a las ${formData.get("preferredTime")}.`,
    `Podés contactarme al ${formData.get("phone")} o por correo a ${formData.get("email")}.`,
    ...(details ? [`Quería comentarte lo siguiente: ${details}`] : []),
    "",
    "Entiendo que la fecha y el horario quedan sujetos a confirmación. Muchas gracias."
  ].join("\n");

  const isEmail = deliveryMethod === "email";
  const contactUrl = isEmail
    ? buildEmailUrl(draftMessage, service)
    : buildWhatsAppUrl(draftMessage);
  const bookingWindow = window.open(contactUrl, "_blank", "noopener,noreferrer");

  if (bookingWindow) {
    showToast(
      isEmail
        ? "Se abrió tu correo con la solicitud. Revisala y enviala para completar la reserva."
        : "Se abrió WhatsApp con tu solicitud. Enviala para completar la reserva."
    );
  } else {
    showToast(
      isEmail
        ? `No se pudo abrir tu correo. Escribinos a ${OFFICE_EMAIL}.`
        : "No se pudo abrir WhatsApp. Escribinos al +598 91 048 471."
    );
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
