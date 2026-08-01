const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildConsultationPhrase,
  buildEmailMessage,
  buildWhatsAppMessage
} = require("../assets/service-messages.js");

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

test("conserva exactamente un servicio plural", () => {
  assert.equal(
    buildWhatsAppMessage("Tasaciones"),
    "Hola Eliana, quisiera consultar por Tasaciones. ¿Qué disponibilidad tenés?"
  );
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
