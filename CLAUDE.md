# Instrucciones para agentes

Sitio de la escribana Eliana Isbarbo Gfeller: www.escribaniaisbarbo.com.uy. Es
HTML, CSS y JavaScript puro, publicado en Vercel desde `main`, con funciones en
`api/` para la agenda. El README explica la estructura y la agenda.

## Reglas generales

- **Antes de cualquier cambio visible en la página** (textos, secciones,
  diseño), proponerle a Francisco el cambio con el texto exacto y esperar su
  confirmación. Los cambios invisibles (datos estructurados, metadatos) pueden
  ir directo.
- Los textos de la página usan voseo ("Elegí", "Contanos").
- Trabajar en una rama, abrir un PR y mergear recién cuando Francisco lo pida.
  Los PR se mergean con squash y la rama se borra.
- **Nada secreto en el repositorio, que es público:** las claves (Google,
  Resend, Turnstile) viven solo en variables de Vercel marcadas como
  Sensitive. El código compartido de las funciones va en `api/_lib/`, porque
  el guion bajo evita que Vercel lo publique en la web; una carpeta nueva en
  la raíz se publicaría. Los `.md`, `tests/` y `carteles/` no se publican (ver
  `.vercelignore`).
- **`/reservar` está impreso en carteles con QR** (ver README, "Enlace para
  carteles"): no borrar ni renombrar esa redirección de `vercel.json`.
- Antes de commitear: `node --test tests/*.test.js` y
  `for f in assets/*.js api/*.js api/_lib/*.js; do node --check "$f"; done`.

## Actualizar las reseñas

Cuando Francisco diga **"vamos a actualizar las reseñas"**, "revisá las
reseñas" o algo parecido, seguir estos pasos.

### 1. Leer las reseñas de Google

- Usar Claude in Chrome. Puede que en el grupo de pestañas de Claude ya esté
  abierta la búsqueda "Escribania Eliana Isbarbo Gfeller" con el panel "Tu
  negocio en Google". Si no está, abrir
  `https://www.google.com/search?q=Escribania+Eliana+Isbarbo+Gfeller`. El
  panel de administración aparece porque el navegador tiene la sesión de
  Francisco.
- Tocar **"Leer opiniones"** y anotar el puntaje y la cantidad que muestra
  arriba (por ejemplo, "5.0 · 6 opiniones").
- Recorrer todas las opiniones. Las largas se abren con "Ver la opinión
  completa". De cada una anotar el nombre, las estrellas, "hace N
  semanas/meses" y el texto.
- Si el panel no abre, la ficha pública está en
  `https://www.google.com/maps?cid=14244323416962716893`.

### 2. Comparar con la página

El bloque está en `index.html`, en el comentario `OPINIONES`, justo antes del
pie (`<section … id="opiniones">`). Comparar:

- La línea del puntaje: `5,0 en Google · 6 reseñas`. Usa coma decimal y
  "reseñas" en lugar de "opiniones".
- Las tarjetas publicadas contra las reseñas nuevas. Las reseñas que solo
  tienen estrellas, sin texto, suman a la cantidad pero no llevan tarjeta.

### 3. Proponer antes de tocar nada

Mostrarle a Francisco qué cambió (puntaje, cantidad, reseñas nuevas) y
preguntarle cuáles mostrar. Él elige. No cambiar la página sin su respuesta.

### 4. Aplicar

Reglas acordadas con Francisco (2026-10-06):

- **Texto tal cual está en Google:** mismas palabras, puntuación, espacios y
  mayúsculas, aunque tenga errores.
- **Nombre:** solo el nombre y la inicial del apellido, por privacidad. El
  nombre empieza con mayúscula aunque en Google esté en minúscula ("marisel
  carbajal" se escribe "Marisel C.").
- **Fecha:** mes y año en minúscula ("septiembre de 2026"), calculada a partir
  de "hace N semanas/meses" contando desde el día de la revisión.
- **Orden:** de la más nueva a la más vieja. La grilla muestra dos por fila;
  con un número impar, la última queda sola.
- **Formato de cada tarjeta.** Las estrellas van rellenas (★) o vacías (☆) y
  `aria-label` dice la cantidad:

  ```html
  <li class="review-card">
    <p class="review-stars" role="img" aria-label="5 de 5 estrellas">★★★★★</p>
    <blockquote>Texto tal cual está en Google.</blockquote>
    <p class="review-author"><strong>Nombre I.</strong> · mes de AAAA</p>
  </li>
  ```

- **Línea del puntaje:** actualizar el número y la cantidad. Las cinco
  estrellas de esa línea son decorativas y no se cambian.
- **Los dos botones son parte fija de la sección** y se mantienen al
  actualizar: "Dejá tu reseña en Google"
  (`https://g.page/r/Cd1U15WtAK7FEAE/review`) y "Ver todas las reseñas"
  (`https://www.google.com/maps?cid=14244323416962716893`). Al actualizar solo
  cambian el puntaje, la cantidad y las tarjetas.
- **No agregar datos estructurados de reseñas** (`Review`, `AggregateRating`):
  Google no admite reseñas propias publicadas en el sitio y puede tomarlo como
  manipulación.
- **No usar la API de Google Places:** exige tarjeta de crédito, prohíbe
  guardar las reseñas y le deja a Google elegir cuáles mostrar. Por eso se
  decidió copiarlas a mano.

Si solo cambia `index.html` no hace falta renovar el token `?v=` de los
assets; sí hace falta si se tocan `styles.css` o `main.js`.

### 5. Publicar y verificar

1. Rama (por ejemplo `feat/resenas-AAAA-MM`), commit y PR con el detalle de lo
   que cambió.
2. Pasarle a Francisco la Preview de la rama (`#opiniones`) y esperar su OK
   para mergear.
3. Después del merge, verificar en www.escribaniaisbarbo.com.uy que estén las
   tarjetas nuevas, el puntaje y los dos botones, y que sigan los botones de
   "Reservar turno": aparecen solo si la agenda está prendida.
