const WHATSAPP_NUMBER = "59891048471";
const OFFICE_EMAIL = "esc.isbarbo@gmail.com";
const OFFICE_ADDRESS = "Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay";
const { buildEmailMessage, buildWhatsAppMessage } = window.ServiceMessages;

const menuButton = document.getElementById("menuButton");
const navLinks = document.getElementById("navLinks");
const serviceLinks = document.querySelectorAll("[data-service]");
const openContactButtons = document.querySelectorAll("[data-contact-open]");
const selectedServiceLabels = document.querySelectorAll("[data-selected-service]");
const whatsappLinks = document.querySelectorAll("[data-contact-whatsapp]");
const emailLinks = document.querySelectorAll("[data-contact-email]");
const contactDialog = document.getElementById("contactDialog");
const closeContactDialogButton = document.getElementById("closeContactDialog");
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
  return current;
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

function buildEmailUrl(service) {
  const subject = service === "Consulta notarial" ? service : `Consulta notarial: ${service}`;
  return `mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildEmailMessage(service))}`;
}

function setSelectedService(service) {
  selectedService = AVAILABLE_SERVICES.has(service) ? service : "Consulta notarial";

  selectedServiceLabels.forEach((label) => {
    label.textContent = selectedService;
  });

  whatsappLinks.forEach((link) => {
    link.href = buildWhatsAppUrl(buildWhatsAppMessage(selectedService));
  });

  emailLinks.forEach((link) => {
    link.href = buildEmailUrl(selectedService);
  });
}

function openContactDialog(service = selectedService) {
  setSelectedService(service);

  if (!contactDialog.open) {
    contactDialog.showModal();
  }

  document.body.classList.add("modal-open");
}

function closeContactDialog() {
  if (contactDialog.open) {
    contactDialog.close();
  }
}

serviceLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openContactDialog(link.dataset.service);
  });
});

openContactButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openContactDialog();
  });
});

closeContactDialogButton.addEventListener("click", closeContactDialog);

contactDialog.addEventListener("click", (event) => {
  if (event.target === contactDialog) {
    closeContactDialog();
  }
});

contactDialog.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
});

contactDialog.querySelectorAll("[data-contact-whatsapp], [data-contact-email]").forEach((link) => {
  link.addEventListener("click", closeContactDialog);
});

setSelectedService(selectedService);

copyAddressButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(OFFICE_ADDRESS);
    showToast("Dirección copiada");
  } catch (error) {
    showToast("No se pudo copiar. La dirección es Sarandí 294 esquina 18 de Julio, Rosario.");
  }
});

document.getElementById("currentYear").textContent = new Date().getFullYear();
