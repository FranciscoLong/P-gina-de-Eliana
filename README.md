# Escribana Eliana Isbarbo Gfeller

Sitio web de la escribana **Eliana Isbarbo Gfeller**, en Rosario, departamento
de Colonia (Uruguay). Landing de una sola página con información de servicios
notariales, formulario de reserva de turnos (vía WhatsApp), ubicación y
preguntas frecuentes.

🔗 **En línea:** https://www.escribaniaisbarbo.com.uy/

---

## Tecnología

HTML, CSS y JavaScript puro. **Sin frameworks, sin dependencias y sin paso de
compilación** — se abre directamente en el navegador.

## Estructura

```
.
├── index.html                      Página completa (contenido y datos estructurados)
├── robots.txt                      Reglas de rastreo y ubicación del sitemap
├── sitemap.xml                     URL canónica enviada a buscadores
├── vercel.json                     Redirección del dominio sin www al host canónico
├── .vercelignore                   Exclusiones del despliegue público
├── assets/
│   ├── styles.css                  Todos los estilos
│   ├── main.js                     Menú móvil, formulario de turnos, copiar dirección
│   ├── logo-isbarbo-gfeller.webp   Logo definitivo optimizado
│   ├── eliana-isbarbo-gfeller.webp Retrato optimizado de la escribana
│   ├── *.webp                      Fotografías optimizadas de la oficina
│   └── favicon.png                 Ícono de la pestaña y dispositivos
├── tests/                          Pruebas de los mensajes de consulta
├── MEJORAS-SEO-PREVIO-PUBLICACION.md Seguimiento de mejoras SEO
└── README.md
```

## Ver el sitio localmente

No necesita instalar nada. Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Luego abrir http://localhost:8000 en el navegador.

> Se recomienda servirlo así (y no abriendo el `index.html` con doble clic),
> porque algunas funciones —como el ícono de WhatsApp o el mapa— se comportan
> mejor sobre `http://` que sobre `file://`.

## Publicación

El sitio se publica automáticamente con **Vercel** desde la rama `main`. Cada
`git push` inicia un nuevo despliegue.

El host canónico es `www.escribaniaisbarbo.com.uy`. La redirección permanente
desde el dominio sin `www` se configura en `vercel.json` y conserva la ruta y
los parámetros. Los documentos de trabajo y las pruebas quedan fuera del
despliegue mediante `.vercelignore`.

## Pendientes de contenido

- [ ] Conectar el calendario cuando se defina el proveedor y el enlace final.
- [ ] Cargar coordenadas verificadas y el Perfil de Empresa oficial en los datos
      estructurados.

## Contacto de la escribanía

- **Dirección:** Sarandí 294 esquina 18 de Julio, Rosario, Colonia, Uruguay
- **Teléfono / WhatsApp:** +598 91 048 471
- **Correo:** esc.isbarbo@gmail.com
- **Horario:** lunes a viernes, de 9:30 a 12:30 y de 15:00 a 19:00
