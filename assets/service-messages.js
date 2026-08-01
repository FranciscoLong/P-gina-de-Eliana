(function initializeServiceMessages(root, factory) {
  const serviceMessages = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = serviceMessages;
    return;
  }

  root.ServiceMessages = serviceMessages;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const DEFAULT_SERVICE = "Consulta notarial";
  const SERVICE_CONSULTATION_PHRASES = {
    "Carta Poder": "consultar por una carta poder de un automotor",
    "Compromiso de compraventa": "consultar por un compromiso de compraventa de un automotor",
    Prenda: "consultar por una prenda de automotor",
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
