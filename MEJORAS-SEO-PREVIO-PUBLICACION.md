# Estado SEO y sugerencias de mejora posteriores a la publicación

## Objetivo

Este documento reúne el estado SEO verificado del sitio oficial de la escribana
Eliana Isbarbo Gfeller y ordena las mejoras recomendadas después de su
publicación.

Sitio oficial y URL canónica elegida:

`https://www.escribaniaisbarbo.com.uy/`

Fecha de la revisión: 31 de julio de 2026.

## Alcance y decisiones confirmadas

Estas decisiones son parte del criterio del proyecto y no deben reinterpretarse
como errores SEO:

1. **El sitio oficial es la fuente correcta para horarios y datos de contacto.**
   El horario oficial es de lunes a viernes, de 9:30 a 12:30 y de 15:00 a
   19:00. Si un directorio externo informa otra cosa, debe actualizarse el
   directorio; no debe cambiarse el sitio para coincidir con información
   incorrecta.
2. **El Perfil de Empresa de Google ya muestra el horario oficial correcto.**
   Coincide con el sitio: lunes a viernes, de 9:30 a 12:30 y de 15:00 a 19:00.
   No corresponde modificar ese horario en Google; deben corregirse los otros
   directorios que publican información diferente.
3. **Las preguntas frecuentes se mantienen.** Representan dudas reales de las
   personas antes de una consulta. La mejora consiste en hacer coincidir el
   contenido visible con los datos estructurados, no en eliminar preguntas
   útiles.
4. **El asesoramiento es personal.** Cualquier contenido futuro sobre servicios
   o trámites debe ser informativo y general. No debe diagnosticar situaciones
   particulares ni sustituir el análisis directo de la escribana.
5. **El contacto se realiza por WhatsApp o correo electrónico.** El sitio no
   gestiona horarios ni datos personales; prepara un mensaje editable según el
   servicio seleccionado.
6. **Rosario se mantiene como la única ubicación oficial publicada.** En
   Tarariras existe una oficina de apoyo con dirección fija y secretaria, pero
   no es la sede central y su cartel corresponde a la inmobiliaria. Por el
   momento no debe presentarse como una segunda escribanía ni crearse otra ficha
   de Google. Tarariras y las demás localidades donde exista una prestación real
   se comunicarán como zona de atención coordinada dentro del departamento de
   Colonia.

## Estado actual verificado

La página cuenta con una base SEO correcta:

- Idioma `es-UY`.
- Un único `h1` con el nombre y la profesión.
- Título relevante y descripción presentes.
- Contenido principal disponible en HTML sin depender de JavaScript.
- URL canónica absoluta.
- `meta robots` permite indexar y seguir enlaces.
- Estructura semántica con encabezados, secciones y artículos.
- Datos estructurados `LegalService` sintácticamente válidos.
- Preguntas frecuentes visibles.
- Nombre, dirección, teléfono, correo y horario coherentes dentro del sitio.
- Imágenes con texto alternativo, ancho y alto declarados.
- Imagen social Open Graph de 1200 por 630 px accesible en producción.
- Imagen principal precargada, JavaScript con `defer`, retrato y mapa con carga
  diferida.
- HTTPS activo y recursos principales accesibles.
- La versión publicada coincide con los archivos revisados del repositorio.

## Prioridad 1: descubrimiento e indexación

### Crear `robots.txt` y `sitemap.xml`

En la revisión, ambos archivos respondían con código 404.

La ausencia de `robots.txt` no bloquea el rastreo, porque Google interpreta ese
404 como ausencia de restricciones. Aun así, conviene crearlo para declarar el
sitemap.

El sitemap debe contener únicamente la URL canónica:

`https://www.escribaniaisbarbo.com.uy/`

Acciones:

- [x] Crear `robots.txt` permitiendo el rastreo y declarando el sitemap.
- [x] Crear `sitemap.xml` con la URL canónica.
- [ ] Verificar el dominio en Google Search Console.
- [ ] Enviar el sitemap desde Search Console.
- [ ] Inspeccionar la portada y solicitar su indexación.
- [ ] Revisar posteriormente qué URL eligió Google como canónica.

Una búsqueda `site:escribaniaisbarbo.com.uy` no mostró todavía el sitio durante
la auditoría. Esto es solo un indicio y puede ser normal para un dominio recién
publicado; Search Console será la fuente confiable para confirmar el estado.

### Consolidar las variantes del dominio

Durante la revisión, estas direcciones servían la misma página:

- `https://escribaniaisbarbo.com.uy/`
- `https://www.escribaniaisbarbo.com.uy/`
- La dirección pública del proyecto en Vercel.

El HTML declara `www` como canónica, pero el dominio sin `www` también respondía
con código 200.

Acciones:

- [x] Mantener `www` como versión canónica en HTML, Open Graph y JSON-LD.
- [x] Configurar una redirección permanente 308 desde el dominio sin `www` hacia
  `www`.
- [x] Confirmar que la redirección conserva la ruta y los parámetros.
- [ ] Repetir la prueba desde distintas redes después de finalizar la propagación
  DNS.

Los DNS públicos de Google y Cloudflare ya respondían con la configuración de
Vercel. Durante la revisión, un resolvedor local todavía conservaba una IP
anterior para `www`, por lo que conviene verificar nuevamente después de que
expiren las cachés. No se recomienda cambiar la configuración basándose
solamente en ese caché local.

## Prioridad 2: SEO local y fuentes externas

### Mantener los datos oficiales

Datos que deben utilizar Google y los directorios:

- Nombre: Eliana Isbarbo Gfeller.
- Profesión principal: Escribana Pública.
- Dirección: Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay.
- Teléfono y WhatsApp: +598 91 048 471.
- Correo: esc.isbarbo@gmail.com.
- Horario: lunes a viernes, de 9:30 a 12:30 y de 15:00 a 19:00.

Acciones:

- [x] Confirmar que el horario del Perfil de Empresa de Google coincide con el
  sitio oficial.
- [ ] Verificar que los demás datos de Google —categoría, dirección, teléfono,
  sitio web y fotografías— también estén completos y actualizados.
- [ ] Usar la categoría principal más específica disponible para escribanía o
  servicio notarial.
- [x] Mantener un único Perfil de Empresa, correspondiente a la sede oficial de
  Rosario; no crear una segunda ficha ni publicar una segunda dirección para
  Tarariras mientras funcione como oficina de apoyo.
- [ ] Configurar en el perfil las zonas de servicio reales del departamento de
  Colonia, incluyendo Tarariras y otras localidades donde efectivamente se
  trabaje, sin modificar el nombre comercial con palabras clave.
- [ ] Completar en Google la lista de servicios notariales reales para reforzar
  la relevancia del perfil ante búsquedas relacionadas.
- [ ] Sustituir el enlace genérico de Maps por el Perfil de Empresa oficial
  cuando esté verificado.
- [ ] Solicitar en Guía 1122 la actualización del horario.
- [ ] Solicitar la corrección o eliminación de directorios que clasifiquen la
  escribanía como agencia inmobiliaria si esa clasificación es incorrecta.
- [ ] Mantener los mismos datos en todos los perfiles profesionales legítimos.
- [ ] Solicitar reseñas reales a clientes, sin incentivos ni textos preparados,
  y responderlas profesionalmente.

Google y el sitio oficial ya coinciden en el horario. Las discrepancias de los
otros directorios no justifican modificar los datos correctos del sitio ni del
Perfil de Empresa de Google.

### Posicionar la atención en el departamento de Colonia sin declarar otra sede

El objetivo es que Google pueda considerar a la escribanía para búsquedas como
`escribanos en Colonia`, `escribanos en el departamento de Colonia` o
`escribanos en la zona`, manteniendo Rosario como única ubicación oficial.

Tarariras es una zona de trabajo real: existe una oficina de apoyo con secretaria
y allí se coordinan actuaciones con frecuencia. Sin embargo, no debe comunicarse
como una segunda sede de la escribanía porque no es la oficina central y el
cartel exterior pertenece a la inmobiliaria.

Sugerencias:

- [ ] Sustituir la frase `contamos con escritorio en la ciudad de Tarariras` por
  una redacción que describa el servicio sin afirmar que existe otra sede.
- [ ] Utilizar en la página un texto como:

  > Atención notarial en Rosario y actuaciones coordinadas en Tarariras y otras
  > localidades del departamento de Colonia, según el trámite y la
  > disponibilidad.

- [x] Mantener en el pie, contacto, mapa y datos estructurados únicamente la
  dirección oficial de Rosario.
- [x] No publicar para Tarariras una dirección, horario, mapa, datos
  estructurados `LocalBusiness` ni un segundo Perfil de Empresa de Google.
- [ ] Mencionar el departamento de Colonia de forma natural en el título, la
  introducción, la sección de contacto y el texto sobre zonas de atención.
- [ ] Incluir en `areaServed` el departamento de Colonia y solo las localidades
  donde exista una prestación real, dando prioridad a Rosario y Tarariras.
- [ ] Revisar periódicamente en Search Console las consultas e impresiones para
  Rosario, Tarariras y Colonia antes de crear contenido adicional.

No se evalúa en este documento si la oficina de apoyo debe declararse ante BPS.
Esa situación administrativa debe confirmarse por la vía profesional
correspondiente antes de presentarla públicamente como una sede o sucursal.

Esta estrategia mejora la relevancia geográfica, pero no garantiza una posición
determinada. Google combina relevancia, distancia y notoriedad, por lo que una
persona físicamente alejada de Rosario puede recibir antes otros resultados.

## Prioridad 3: datos estructurados

### Conservar y sincronizar las preguntas frecuentes

El bloque JSON-LD y la sección visible incluyen las mismas ocho preguntas y
respuestas.

Las preguntas frecuentes deben mantenerse porque reflejan dudas reales. Para
que el marcado represente fielmente la página:

- [x] Mostrar en la sección visible todas las preguntas reales incluidas en el
  JSON-LD, incluida la atención en el mismo día, si sigue vigente.
- [x] Usar exactamente la misma pregunta y respuesta en el HTML y en el JSON-LD.
- [x] Revisar ambos bloques juntos cada vez que se modifique una respuesta.
- [x] Mantener respuestas generales y derivar los casos particulares a una
  consulta personal.

Google dejó de mostrar resultados enriquecidos de tipo FAQ en mayo de 2026. Por
eso, este marcado ya no debe considerarse una mejora visual en Google. Puede
mantenerse por consistencia semántica y compatibilidad con otros sistemas,
siempre que coincida con el contenido visible.

### Unificar la descripción profesional

Se confirmó que los títulos profesionales comunicados son `Escribana Pública` y
`Rematadora`. El JSON-LD y la biografía visible utilizan ahora la misma
descripción, sin incluir otros títulos.

Acciones:

- [x] Confirmar cuáles son los títulos profesionales que deben comunicarse.
- [x] Utilizar la misma descripción profesional en el contenido visible y en el
  JSON-LD.
- [x] No incluir títulos o afiliaciones que no puedan verificarse.

### Completar `LegalService` con información verificada

Campos recomendados:

- [ ] `@id` estable, por ejemplo
  `https://www.escribaniaisbarbo.com.uy/#escribania`.
- [ ] `postalCode`.
- [ ] `geo.latitude` y `geo.longitude`.
- [ ] `hasMap` con el Perfil de Empresa oficial.
- [ ] `sameAs` con perfiles oficiales y verificables.
- [ ] Revisar `areaServed`: priorizar `Departamento de Colonia`, Rosario,
  Tarariras y las demás localidades donde exista una prestación real; retirar
  zonas lejanas que no formen parte de la atención habitual.

No se deben completar propiedades con datos aproximados o no confirmados.

## Prioridad 4: contenido de la portada

### Reforzar Rosario y el departamento de Colonia en la portada

El `h1` conserva el nombre y la profesión. Por decisión de contenido, el texto
inmediato mantiene el mensaje personal solicitado por la escribana; la ubicación
se refuerza en el título, la descripción, los datos estructurados y la sección de
contacto.

Implementación:

- [x] Usar el siguiente título para buscadores:

  > Escribana en Rosario, Colonia | Eliana Isbarbo Gfeller

- [x] Conservar la esencia del texto personal solicitado por la escribana:

  > El verdadero valor de mi profesión está en acompañar a las personas con
  > cercanía, responsabilidad y confianza. Como Escribana, trabajo para ofrecer
  > seguridad jurídica y un asesoramiento claro, haciendo que cada cliente se
  > sienta respaldado en cada decisión que tome.

Las búsquedas como `escribano en Rosario` o `escribano en Colonia` se trabajan
con los elementos SEO y las secciones informativas, sin forzar palabras clave en
este mensaje personal ni cambiar incorrectamente la profesión visible de
`Escribana Pública`.

La ubicación oficial sigue siendo Rosario. La forma de comunicar Tarariras y
otras zonas de atención queda pendiente de definición para no presentarlas como
sedes adicionales.

### Acortar la descripción para buscadores

La descripción anterior tenía aproximadamente 178 caracteres y podía truncarse.

- [x] Utilizar una descripción más breve y enfocada en los servicios principales:

  > Escribana pública en Rosario, departamento de Colonia. Servicios notariales
  > para automotores, inmuebles, sucesiones, arrendamientos y certificaciones.

No existe una penalización por una descripción larga; el objetivo es controlar
mejor qué mensaje puede ver la persona en los resultados.

### Unificar el tono editorial

La mayor parte del sitio utiliza voseo rioplatense, pero la introducción de
servicios contiene expresiones como `Explora`, `si tienes` y `puedes`.

Acciones:

- [x] Usar voseo de manera consistente: `Explorá`, `si tenés` y `podés`.
- [x] Cambiar `asesoría` por `asesoramiento` para mantener el vocabulario del
  resto del sitio.
- [x] Corregir `Ademas` por `Además`.
- [ ] Uniformar mayúsculas en los nombres de servicios.
- [ ] Revisar ortografía y tono antes de cada publicación.

### Evitar textos que envejezcan

La tarjeta de experiencia muestra `7 años`, por lo que requerirá actualización
manual.

Conviene utilizar una formulación estable y verificable, por ejemplo `En
ejercicio desde 2019`, si ese es el año oficial que se desea comunicar.

## Prioridad 5: crecimiento de contenido sin sustituir la consulta personal

La landing permite posicionar la marca y una búsqueda general de escribana en
Rosario. Sin embargo, todos los servicios comparten una sola URL, lo que limita
la posibilidad de responder búsquedas específicas.

En una segunda etapa se pueden crear páginas informativas para:

1. Títulos y transferencias de automotores.
2. Compraventas de inmuebles.
3. Sucesiones.
4. Certificaciones, poderes y autorizaciones.

Cada página puede incluir:

- Para qué tipo general de trámite sirve.
- Etapas habituales, aclarando que pueden variar según el caso.
- Documentación que suele solicitarse, sujeta a confirmación personal.
- Preguntas generales frecuentes.
- Situaciones que requieren estudiar antecedentes antes de responder.
- Una llamada clara para coordinar una consulta.
- El aviso de que la información es general y no sustituye asesoramiento
  profesional individual.

No se deben publicar diagnósticos, conclusiones legales o listas definitivas de
requisitos aplicables a todos los casos. Tampoco deben crearse páginas casi
idénticas cambiando únicamente el nombre de una ciudad.

Si posteriormente existe suficiente contenido útil, puede crearse una página
sobre la cobertura en el departamento de Colonia. Debe explicar de forma real
cómo se coordinan las actuaciones y qué servicios se prestan; no debe ser una
colección de páginas duplicadas para cada localidad.

Tradeoff:

- Mantener solo la landing requiere menos mantenimiento y es suficiente para la
  presencia inicial.
- Crear páginas sustantivas exige revisión profesional periódica, pero permite
  responder mejor búsquedas concretas y construir autoridad temática.

## Prioridad 6: rendimiento y experiencia móvil

Las imágenes actuales están optimizadas y no existe un problema grave de peso.
Las mejoras recomendadas son incrementales:

- [x] Evitar el texto justificado en pantallas angostas para no forzar espacios
  irregulares, manteniendo las palabras completas y sin guionado.
- [ ] Crear variantes responsive de la imagen principal y del retrato para
  evitar que un teléfono descargue siempre las versiones completas.
- [ ] Utilizar `srcset` y `sizes`, `<picture>` o `image-set()` según corresponda.
- [x] Mantener la precarga de la imagen principal.
- [x] Mantener carga diferida en el retrato y el mapa.
- [ ] Usar nombres de archivo versionados y caché larga `immutable` para CSS,
  JavaScript e imágenes.
- [ ] Evaluar si conviene reducir o alojar localmente las tres familias
  tipográficas solo si las métricas muestran un beneficio real.
- [ ] Revisar Core Web Vitals en Search Console cuando exista suficiente tráfico
  y datos de campo.

## Prioridad 7: documentación operativa

El README documenta Vercel como plataforma vigente, el host canónico y la
redirección permanente. La guía heredada de la plataforma anterior fue retirada
porque el dominio ya está configurado y operativo en Vercel.

- [x] Actualizar el README para documentar Vercel como plataforma vigente.
- [x] Documentar cuál es el host canónico y dónde se configura la redirección.
- [ ] Registrar la fecha de verificación de Search Console y del Perfil de
  Empresa.
- [x] Mantener este documento como lista vigente y retirar tareas que dejen de
  ser aplicables.

## Orden recomendado de ejecución

1. Verificar Search Console, enviar el sitemap e inspeccionar la portada.
2. Verificar que los demás datos del Perfil de Empresa de Google estén completos,
   configurar las zonas de servicio reales del departamento de Colonia y
   mantener Rosario como única ubicación oficial; el horario ya fue confirmado
   como correcto.
3. Solicitar la actualización de horarios y categorías únicamente en los
   directorios externos que contienen información incorrecta.
4. Resolver el texto sobre Tarariras y sincronizar las preguntas frecuentes
   visibles con el JSON-LD.
5. Completar `LegalService` con datos verificados.
6. Evaluar páginas informativas de servicios con revisión profesional.
7. Implementar mejoras responsive y de caché si las métricas lo justifican.

## Referencias oficiales

- Posicionamiento local y Perfil de Empresa:
  <https://support.google.com/business/answer/7091?hl=es-ES>
- Directrices para representar una empresa en Google:
  <https://support.google.com/business/answer/3038177?hl=es>
- Configuración de zonas de servicio:
  <https://support.google.com/business/answer/9157481?hl=es>
- Servicios del Perfil de Empresa:
  <https://support.google.com/business/answer/9455399?hl=es>
- Creación y envío de sitemaps:
  <https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap>
- Tratamiento de errores en `robots.txt`:
  <https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec>
- Redirecciones y canonicalización:
  <https://developers.google.com/search/docs/crawling-indexing/301-redirects>
- Políticas de datos estructurados:
  <https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=es>
- Actualizaciones de Google Search:
  <https://developers.google.com/search/updates>
