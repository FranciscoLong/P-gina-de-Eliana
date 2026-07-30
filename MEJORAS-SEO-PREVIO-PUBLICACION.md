# Mejoras SEO previas a la publicación

## Objetivo

Dejar lista la web de la escribana Eliana Isbarbo Gfeller para publicarla en:

`https://www.escribaniaisbarbo.com.uy/`

Este documento registra los hallazgos y las tareas recomendadas para no depender
del historial de conversaciones.

## Estado actual

La página ya cuenta con una base SEO correcta:

- Idioma `es-UY`.
- Un único `h1`.
- Título y descripción.
- URL canónica configurada para el dominio definitivo.
- Estructura semántica con encabezados, secciones y artículos.
- Datos estructurados `LegalService`.
- Preguntas frecuentes visibles y marcadas con `FAQPage`.
- Dirección, teléfono, correo, horarios y mapa.
- Diseño responsive sin desbordamiento horizontal en un ancho móvil de 390 px.

## Prioridad 1: contenido e imágenes definitivas

### Reemplazar recursos provisorios

- [x] Reemplazar el logo placeholder por el logo definitivo optimizado en
      `assets/logo-isbarbo-gfeller.webp`.
- [x] Actualizar el favicon y el icono para dispositivos Apple para que sean
      coherentes con el logo definitivo.
- [x] Reemplazar la fotografía provisoria de Eliana por la imagen cuyo nombre
      identifica a `Eliana`.
- [x] Reemplazar todas las fotografías externas de Unsplash por fotografías
      reales de la oficina.
- [x] Eliminar del contenido y de los textos alternativos todas las menciones a
      “imagen provisoria”, “fotografía provisoria” o similares.

### Criterio de optimización de imágenes

Los archivos originales deben conservarse sin modificaciones fuera de
`assets/`. La web debe utilizar copias optimizadas.

Objetivo por imagen:

- Formato recomendado: WebP.
- Peso ideal: entre 150 KB y 300 KB.
- Lado mayor recomendado: entre 1.400 y 1.800 px para fotografías generales.
- Calidad inicial WebP: 78–82, ajustándola hasta alcanzar el peso objetivo.
- Mantener la relación de aspecto original; no deformar las imágenes.
- Eliminar metadatos EXIF de las copias web.
- Declarar `width` y `height` en el HTML.
- Mantener `loading="lazy"` en las imágenes que no aparecen en la primera
  pantalla.
- No aplicar `loading="lazy"` a la imagen principal de portada.

Archivos seleccionados:

| Contenido | Archivo web |
| --- | --- |
| Retrato de Eliana | `assets/eliana-isbarbo-gfeller.webp` |
| Frente de la oficina | `assets/oficina-frente.webp` |
| Oficina principal | `assets/oficina-eliana.webp` |
| Espacio de consultas | `assets/oficina-consultas.webp` |
| Recepción | `assets/recepcion.webp` |
| Esquina usada en la portada | `assets/esquina-escribania.webp` |

### Implementación de imágenes completada

Las fotografías reales fueron inspeccionadas, convertidas desde sus originales
HEIF y publicadas como WebP. Los originales permanecen sin modificaciones.

| Archivo utilizado por la web | Dimensiones | Peso |
| --- | ---: | ---: |
| `assets/eliana-isbarbo-gfeller.webp` | 1350 × 1800 px | 251 KB |
| `assets/oficina-eliana.webp` | 1800 × 1350 px | 281 KB |
| `assets/oficina-consultas.webp` | 1800 × 1350 px | 294 KB |
| `assets/recepcion.webp` | 1350 × 1800 px | 204 KB |
| `assets/esquina-escribania.webp` | 1800 × 1350 px | 230 KB |
| `assets/oficina-frente.webp` | 1600 × 1200 px | 232 KB |

La página ya no depende de imágenes externas de Unsplash. La portada y la
galería también utilizan las versiones WebP optimizadas de las fotografías que
ya estaban en el proyecto.

El logo definitivo también fue recortado para retirar el margen blanco
innecesario y generar recursos adecuados para cada uso:

| Archivo | Dimensiones | Peso | Uso |
| --- | ---: | ---: | --- |
| `assets/logo-isbarbo-gfeller.webp` | 800 × 800 px | 13 KB | Encabezado, portada y datos estructurados |
| `assets/favicon.png` | 192 × 192 px | 29 KB | Favicon y dispositivos Apple |

### Imagen para WhatsApp y redes sociales

La imagen `assets/og-isbarbo-gfeller.jpg` utiliza la identidad visual real de la
escribanía. Está preparada en formato JPG de 1200 × 630 px y se utiliza tanto
en `og:image` como en los datos estructurados del negocio.

- [ ] Comprobar que la URL declarada en `og:image` responda correctamente
      después de publicar.

## Prioridad 2: SEO local

### Perfil de Empresa en Google

- [ ] Reclamar o verificar el Perfil de Empresa.
- [ ] Elegir la categoría principal más específica disponible para escribanía o
      servicio notarial.
- [ ] Cargar el dominio definitivo.
- [ ] Añadir fotografías reales del frente, interior y profesional.
- [ ] Mantener dirección, teléfono y horario actualizados.
- [ ] Solicitar reseñas legítimas a clientes y responderlas.

### Consistencia de datos

El nombre, dirección, teléfono y horario deben coincidir exactamente en:

- La página web.
- Google Maps y Perfil de Empresa.
- Directorios locales.
- Redes sociales profesionales.

Datos declarados actualmente en la web:

- Nombre: Eliana Isbarbo Gfeller.
- Profesión: Escribana Pública.
- Dirección: Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay.
- Teléfono: +598 91 048 471.
- Correo: esc.isbarbo@gmail.com.
- Horario: lunes a viernes, de 9:30 a 12:30 y de 15:00 a 19:00.

Antes de publicar se debe confirmar que estos datos sean los definitivos. Hay
directorios externos que muestran horarios distintos; si están desactualizados,
conviene solicitar su corrección.

## Prioridad 3: metadatos y contenido

### Encabezado principal

El `h1` actual contiene solamente el nombre. Se recomienda cambiarlo por:

> Eliana Isbarbo Gfeller, escribana pública en Rosario

Puede mantenerse el diseño visual actual, distribuyendo el nombre y la
profesión en elementos internos si fuera necesario.

### Meta description

La descripción actual tiene 178 caracteres y puede truncarse. Texto sugerido:

> Escribana pública en Rosario, Colonia. Asesoramiento en compraventas, automotores, sucesiones, arrendamientos y certificaciones. Coordiná tu consulta.

Este texto tiene aproximadamente 150 caracteres.

### Título

El título actual es correcto y puede mantenerse:

> Escribana Eliana Isbarbo Gfeller | Rosario, Colonia

### Contenido de servicios

La landing es suficiente para el lanzamiento. En una segunda etapa, si existe
demanda real, se pueden crear páginas individuales para los servicios
principales:

1. Títulos y transferencias de automotores.
2. Compraventas de inmuebles.
3. Sucesiones.
4. Certificaciones, poderes y autorizaciones.

Cada página deberá responder preguntas concretas, explicar el proceso y listar
la documentación habitual. No crear páginas repetidas cuyo único cambio sea una
palabra clave.

## Prioridad 4: datos estructurados

Mantener el tipo `LegalService` y completar, después de confirmar los datos:

- [ ] `@id` estable, por ejemplo:
      `https://www.escribaniaisbarbo.com.uy/#escribania`.
- [ ] `postalCode`.
- [ ] `geo.latitude`.
- [ ] `geo.longitude`.
- [ ] `hasMap`.
- [x] `logo` con una URL absoluta al logo definitivo.
- [ ] `image` con una URL absoluta a una fotografía o imagen social existente.
- [ ] `sameAs` con el Perfil de Empresa u otros perfiles oficiales.

Después de publicar, validar el JSON-LD con:

- Rich Results Test de Google.
- Schema Markup Validator.

El bloque `FAQPage` puede permanecer porque representa contenido visible. Sin
embargo, no se debe esperar un resultado enriquecido de FAQ: Google normalmente
lo reserva para sitios gubernamentales y sanitarios reconocidos.

## Prioridad 5: rastreo e indexación

Crear al publicar:

- [ ] `robots.txt`.
- [ ] `sitemap.xml`.

Contenido esperado de `robots.txt`:

```text
User-agent: *
Allow: /

Sitemap: https://www.escribaniaisbarbo.com.uy/sitemap.xml
```

El sitemap debe incluir únicamente la URL canónica:

`https://www.escribaniaisbarbo.com.uy/`

La URL canónica actual es correcta siempre que el dominio definitivo utilice
`www`. Configurar una redirección permanente desde la versión sin `www` hacia la
versión canónica.

## Prioridad 6: publicación y medición

Después de que el dominio esté activo:

- [ ] Confirmar que la portada responde con HTTPS y código 200.
- [ ] Confirmar que no existen recursos con error 404.
- [ ] Verificar que `og:image`, logo, fotos, CSS y JavaScript sean accesibles.
- [ ] Registrar el dominio en Google Search Console.
- [ ] Enviar `sitemap.xml`.
- [ ] Inspeccionar la URL principal y solicitar indexación.
- [ ] Revisar Core Web Vitals y rendimiento móvil.
- [ ] Comprobar la vista previa al compartir por WhatsApp.
- [ ] Confirmar la indexación con una búsqueda `site:escribaniaisbarbo.com.uy`.

## Orden recomendado de ejecución

1. Crear la imagen social.
2. Confirmar los datos locales y horarios definitivos.
3. Ajustar `h1`, descripción y los datos estructurados restantes.
4. Agregar `robots.txt` y `sitemap.xml`.
5. Publicar el dominio definitivo.
6. Validar Search Console, datos estructurados y rendimiento.

## Referencias oficiales

- SEO local y Perfil de Empresa:
  <https://support.google.com/business/answer/7091?hl=es>
- Datos estructurados de negocios locales:
  <https://developers.google.com/search/docs/appearance/structured-data/local-business?hl=es>
- Títulos en los resultados:
  <https://developers.google.com/search/docs/appearance/title-link>
- Sitemaps:
  <https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview>
- Cambios en resultados FAQ:
  <https://developers.google.com/search/blog/2023/08/howto-faq-changes?hl=es>
