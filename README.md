# Escribana Eliana Isbarbo Gfeller

Sitio web de la escribana **Eliana Isbarbo Gfeller**, en Rosario, departamento
de Colonia (Uruguay). Landing de una sola página con información de servicios
notariales, contacto por WhatsApp y correo electrónico, ubicación y preguntas
frecuentes.

🔗 **En línea:** https://www.escribaniaisbarbo.com.uy/

## Tecnología

HTML, CSS y JavaScript puro. **Sin frameworks, sin dependencias y sin paso de
compilación**.

## Estructura

```text
.
├── index.html                       Página completa y datos estructurados
├── robots.txt                       Reglas de rastreo y ubicación del sitemap
├── sitemap.xml                      URL canónica enviada a buscadores
├── vercel.json                      Redirección al dominio canónico
├── assets/
│   ├── styles.css                   Estilos del sitio
│   ├── main.js                      Navegación, contacto y copia de dirección
│   ├── service-messages.js          Mensajes contextuales por trámite
│   └── imágenes y favicons
├── tests/service-messages.test.js   Pruebas unitarias de los mensajes
└── README.md
```

## Ver el sitio localmente

Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Luego abrir http://localhost:8000 en el navegador.

## Convenciones visuales

**Filos de color.** El filo lateral de 4px se reserva para elementos que
aparecen repetidos en lista: las tarjetas de **Servicios** (verde) y las
**preguntas frecuentes** (rojo). Ahí funciona como pauta vertical y se lee como
sistema.

No se usa en bloques únicos, como las tarjetas de **Contacto** y **Ubicación**:
en móvil las columnas se apilan y cada tarjeta queda sola en pantalla, donde un
filo sin hermanos al lado parece un borde a medio pintar en vez de una marca de
familia. Esas tarjetas se distinguen por su título y su contenido.

La regla vive comentada en `assets/styles.css`, bajo `FILOS DE COLOR`.

## Contacto desde la página

La sección **Contacto** ofrece dos vías:

- WhatsApp al +598 91 048 471.
- Correo electrónico a esc.isbarbo@gmail.com.

Al elegir un servicio, la página abre un modal con ambas vías y prepara un
mensaje contextual para la opción seleccionada. La sección de contacto conserva
enlaces generales utilizables aunque JavaScript no esté disponible.

## Publicación

El sitio se publica automáticamente con **Vercel** desde la rama `main`. Cada
`git push` inicia un nuevo despliegue.

El host canónico es `www.escribaniaisbarbo.com.uy`. La redirección permanente
desde el dominio sin `www` se configura en `vercel.json` y conserva la ruta y
los parámetros. Los documentos de trabajo y las pruebas quedan fuera del
despliegue mediante `.vercelignore`.

## Validación local

```bash
node --test tests/*.test.js
node --check assets/service-messages.js
node --check assets/main.js
```

## Pendientes de contenido

- [ ] Cargar coordenadas verificadas y el Perfil de Empresa oficial en los datos
      estructurados.

## Datos de la escribanía

- **Dirección:** Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay
- **Teléfono / WhatsApp:** +598 91 048 471
- **Correo:** esc.isbarbo@gmail.com
- **Horario:** lunes a viernes, de 9:30 a 12:30 y de 15:00 a 19:00
