// Contenido público. Las fechas de publicación son opcionales, en formato AAAA-MM-DD.
// startsOn y endsOn son inclusivas y usan la fecha de Uruguay.
// lead (línea sobre el título) y highlight (segunda línea del título, en rojo)
// son opcionales. En los párrafos, **así** se marca en negrita.
// Para ocultar todo, dejar la lista vacía: window.SiteNotices = [];
window.SiteNotices = [
  {
    id: "atencion-manana-con-reserva",
    active: true,
    startsOn: null,
    endsOn: "2026-12-31",
    lead: "A partir del martes 1 de diciembre",
    title: "Por la mañana,",
    highlight: "solo con reserva",
    paragraphs: [
      "De lunes a viernes, de **9:30 a 12:30**, se atiende únicamente con turno reservado.",
      "Por la tarde, de 15:00 a 19:00, la atención continúa como siempre."
    ],
    link: { label: "Reservá tu turno", href: "/reservar" }
  }
];
