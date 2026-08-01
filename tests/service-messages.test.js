const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildBookingDetails,
  buildConsultationPhrase,
  buildEmailMessage,
  buildWhatsAppMessage
} = require("../assets/service-messages.js");

test("prepara el texto editable de la reserva con nombre y trámite", () => {
  assert.equal(
    buildBookingDetails("", "Minuta notarial BPS"),
    "Hola Eliana, soy [Nombre] y quisiera solicitar un turno para consultar por una minuta notarial para BPS."
  );
  assert.equal(
    buildBookingDetails(" Ana Pérez ", "Minuta notarial BPS"),
    "Hola Eliana, soy Ana Pérez y quisiera solicitar un turno para consultar por una minuta notarial para BPS."
  );
});

test("redacta naturalmente una consulta notarial general", () => {
  assert.equal(
    buildWhatsAppMessage("Consulta notarial"),
    "Hola Eliana, quisiera hacer una consulta notarial. ¿Qué disponibilidad tenés?"
  );
});

test("agrega el contexto de automotor a una carta poder", () => {
  assert.equal(
    buildConsultationPhrase("Carta Poder"),
    "consultar por una carta poder de un automotor"
  );
});

test("agrega el contexto de automotor a un compromiso de compraventa", () => {
  assert.equal(
    buildConsultationPhrase("Compromiso de compraventa"),
    "consultar por un compromiso de compraventa de un automotor"
  );
});

test("agrega el contexto de automotor a una prenda", () => {
  assert.equal(buildConsultationPhrase("Prenda"), "consultar por una prenda de automotor");
});

test("agrega el artículo a un título automotor", () => {
  assert.equal(
    buildConsultationPhrase("Título automotor"),
    "consultar por un título automotor"
  );
});

test("aplica las frases aprobadas a los servicios específicos", () => {
  const approvedPhrases = {
    "Certificación de firmas": "consultar por una certificación de firmas",
    "Constitución de sociedades": "consultar por la constitución de una sociedad",
    "Declaraciones juradas": "consultar por una declaración jurada",
    "Minuta notarial BPS": "consultar por una minuta notarial para BPS",
    Particiones: "consultar por una partición de bienes",
    Poderes: "consultar por un poder",
    Sucesiones: "consultar por una sucesión",
    Tasaciones: "consultar por una tasación",
    Testamentos: "consultar por un testamento"
  };

  Object.entries(approvedPhrases).forEach(([service, expectedPhrase]) => {
    assert.equal(buildConsultationPhrase(service), expectedPhrase, service);
  });
});

test("adapta el correo a un servicio compuesto e incluye los detalles", () => {
  assert.equal(
    buildEmailMessage({
      name: "Ana Pérez",
      service: "Cesión de Derechos Hereditarios",
      preferredDate: "2026-08-10",
      preferredTime: "10:15",
      email: "ana@example.com",
      details: "Necesito conocer la documentación requerida."
    }),
    [
      "Hola Eliana, soy Ana Pérez y quisiera solicitar un turno para consultar por Cesión de Derechos Hereditarios.",
      "",
      "Me gustaría ir el 10/08/2026 a las 10:15.",
      "Mi correo electrónico es ana@example.com.",
      "Quería comentarte lo siguiente: Necesito conocer la documentación requerida.",
      "",
      "Entiendo que la fecha y el horario quedan sujetos a confirmación. Muchas gracias."
    ].join("\n")
  );
});

test("usa la consulta general cuando no recibe un servicio", () => {
  assert.equal(buildConsultationPhrase("  "), "hacer una consulta notarial");
});
