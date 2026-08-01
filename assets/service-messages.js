(function initializeServiceMessages(root, factory) {
  const serviceMessages = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = serviceMessages;
    return;
  }

  root.ServiceMessages = serviceMessages;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const DEFAULT_SERVICE = "Consulta notarial";

  // Guía de redacción y ejemplos completos:
  // ../REVISION-MENSAJES-SERVICIOS.md
  // Si se modifica una frase, actualizar también ese documento y sus pruebas.
  const SERVICE_CONSULTATION_PHRASES = {
    "Carta Poder": "consultar por una carta poder de un automotor",
    "Compromiso de compraventa": "consultar por un compromiso de compraventa de un automotor",
    "Constitución de sociedades": "consultar por la constitución de una sociedad",
    "Certificación de firmas": "consultar por una certificación de firmas",
    "Declaraciones juradas": "consultar por una declaración jurada",
    "Minuta notarial BPS": "consultar por una minuta notarial para BPS",
    Particiones: "consultar por una partición de bienes",
    Poderes: "consultar por un poder",
    Prenda: "consultar por una prenda de automotor",
    Sucesiones: "consultar por una sucesión",
    Tasaciones: "consultar por una tasación",
    Testamentos: "consultar por un testamento",
    "Título automotor": "consultar por un título automotor"
  };

  function normalizeService(service) {
    if (typeof service !== "string" || !service.trim()) {
      return DEFAULT_SERVICE;
    }

    return service.trim();
  }

  function buildConsultationPhrase(service) {
    const normalizedService = normalizeService(service);

    if (normalizedService === DEFAULT_SERVICE) {
      return "hacer una consulta notarial";
    }

    if (SERVICE_CONSULTATION_PHRASES[normalizedService]) {
      return SERVICE_CONSULTATION_PHRASES[normalizedService];
    }

    return `consultar por ${normalizedService}`;
  }

  function buildWhatsAppMessage(service) {
    return `Hola Eliana, quisiera ${buildConsultationPhrase(service)}. ¿Qué disponibilidad tenés?`;
  }

  function formatBookingDate(dateValue) {
    const [year, month, day] = String(dateValue).split("-");
    return `${day}/${month}/${year}`;
  }

  function buildEmailMessage({ name, service, preferredDate, preferredTime, email, details = "" }) {
    const detailsText = details.trim();

    return [
      `Hola Eliana, soy ${name.trim()} y quisiera solicitar un turno para ${buildConsultationPhrase(service)}.`,
      "",
      `Me gustaría ir el ${formatBookingDate(preferredDate)} a las ${preferredTime}.`,
      `Mi correo electrónico es ${email.trim()}.`,
      ...(detailsText ? [`Quería comentarte lo siguiente: ${detailsText}`] : []),
      "",
      "Entiendo que la fecha y el horario quedan sujetos a confirmación. Muchas gracias."
    ].join("\n");
  }

  return {
    buildConsultationPhrase,
    buildEmailMessage,
    buildWhatsAppMessage
  };
});
