// Contenido público. Las fechas de publicación son opcionales, en formato AAAA-MM-DD.
// startsOn y endsOn son inclusivas y usan la fecha de Uruguay.
// lead (línea sobre el título) y highlight (segunda línea del título, en rojo)
// son opcionales. En los párrafos, **así** se marca en negrita.
// Para ocultar todo, dejar la lista vacía: window.SiteNotices = [];
window.SiteNotices = [
  {
    id: "cierre-mananas-noviembre",
    active: true,
    startsOn: null,
    endsOn: "2026-11-23",
    lead: "Del lunes 2 al lunes 23 de noviembre",
    title: "Por la mañana,",
    highlight: "el escritorio permanecerá cerrado",
    paragraphs: [
      "Por la tarde atendemos como siempre, de lunes a viernes de **15:00 a 19:00 hs**."
    ],
    link: {
      label: "Escribinos por WhatsApp",
      href: "https://wa.me/59891048471?text=Hola%20Eliana%2C%20quisiera%20hacer%20una%20consulta%20notarial."
    }
  },
  // Mientras está el cierre de noviembre se guarda; vuelve solo el 24.
  {
    id: "atencion-manana-con-reserva",
    active: true,
    startsOn: "2026-11-24",
    endsOn: "2026-12-31",
    lead: "A partir del martes 1 de diciembre",
    title: "Por la mañana,",
    highlight: "solo con agenda",
    paragraphs: [
      "De lunes a viernes, de **9:00 a 12:30 hs**, se atenderá únicamente con turno agendado.",
      "Por la tarde, de 15:00 a 19:00 hs, la atención continuará como siempre."
    ],
    link: { label: "Agendá tu turno", href: "/reservar" }
  }
];
