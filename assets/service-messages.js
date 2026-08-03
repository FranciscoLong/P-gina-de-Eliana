(function initializeServiceMessages(root, factory) {
  const serviceMessages = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = serviceMessages;
    return;
  }

  root.ServiceMessages = serviceMessages;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const DEFAULT_SERVICE = "Consulta notarial";

  // Si se modifica una frase, actualizar también REVISION-MENSAJES-SERVICIOS.md
  // y las pruebas de mensajes.
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
    return `Hola Eliana, quisiera ${buildConsultationPhrase(service)}.`;
  }

  function buildEmailMessage(service) {
    return [
      "Hola Eliana,",
      "",
      `Quisiera ${buildConsultationPhrase(service)}.`,
      "",
      "Muchas gracias."
    ].join("\n");
  }

  return {
    buildConsultationPhrase,
    buildEmailMessage,
    buildWhatsAppMessage
  };
});
