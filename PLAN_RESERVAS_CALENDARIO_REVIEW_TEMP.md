# Guía temporal de implementación y revisión — Reservas con Google Calendar

> **Estado:** documento temporal para orientar la implementación y la revisión final.
> No constituye autorización para publicar. Eliminarlo únicamente después de que
> el reviewer cierre la entrega y deje documentado el resultado.

## 1. Objetivo

Reemplazar el calendario de citas embebido de Google por un flujo de reservas
propio dentro del modal actual. El sistema debe conservar el trámite elegido en
la sección Servicios, mostrar disponibilidad real y crear la cita en el Google
Calendar de la escribanía con el trámite y los datos mínimos necesarios.

La opción de WhatsApp debe permanecer como alternativa para urgencias,
coordinaciones especiales y fechas fuera del horizonte de reserva.

## 2. Contexto del proyecto

- Landing estática en HTML, CSS y JavaScript puro.
- Publicación automática en Vercel desde `main`.
- No existe actualmente un backend ni una base de datos.
- El modal de turnos ya distingue entre Agenda en línea y WhatsApp.
- El sitio anuncia consultas de aproximadamente 45 minutos.
- Horario publicado: lunes a viernes, de 9:30 a 12:30 y de 15:00 a 19:00.
- Correo operativo: `esc.isbarbo@gmail.com`.
- No hay un calendario de prueba separado disponible: la integración usa el
  calendario existente de `esc.isbarbo@gmail.com` y cualquier prueba real debe
  coordinarse como una reserva controlada.

Al comenzar la implementación se debe revisar `git status` y preservar los
cambios locales existentes en `README.md`, `index.html`, `assets/main.js` y
`assets/styles.css`.

## 3. Decisiones acordadas

### 3.1 Horizonte y excepciones

- La agenda en línea ofrecerá fechas hasta **45 días hacia adelante**.
- Fechas posteriores se coordinarán por WhatsApp.
- Fines de semana no serán reservables.
- Los horarios fuera de atención no serán reservables.

### 3.2 Trámite seleccionado

- Si el usuario llega desde un enlace de Servicios, el trámite debe conservarse
  al abrir el modal y durante todo el flujo.
- Se guardará en `sessionStorage` únicamente un código de servicio canónico.
- El trámite aparecerá preseleccionado y podrá corregirse antes de confirmar.
- El backend no confiará en el valor recibido: deberá validarlo contra una lista
  permitida.
- El nombre completo del trámite quedará guardado en el evento de Google
  Calendar.
- Si el usuario entra por el botón general “Reservar turno”, deberá seleccionar
  un trámite o continuar con “Consulta notarial”. La decisión final debe quedar
  explícita en la interfaz y en las pruebas.

### 3.3 Explicación de la consulta

- Incluir el campo “Contanos brevemente qué necesitás consultar”.
- Debe ser texto libre para no limitar el tipo de consulta.
- El campo se inicia con el saludo y la frase del trámite que antes se armaban
  para el correo, incluyendo el nombre ingresado; el usuario puede editarlo.
- Longitud máxima acordada: 400 caracteres.
- Mostrar un aviso para no enviar documentos, información financiera, números
  de documento ni otros datos sensibles.
- La explicación se guardará en la descripción privada del evento.

### 3.4 Disponibilidad visible

- La interfaz debe distinguir claramente:
  - **Disponible:** seleccionable.
  - **No disponible:** visible, pero deshabilitado.
  - **Fuera de horario:** no seleccionable.
- No se debe revelar el título, motivo, asistentes ni ningún otro detalle de los
  eventos que generan un bloqueo.
- La disponibilidad mostrada al cliente es informativa hasta la confirmación:
  el servidor debe comprobar nuevamente el horario al crear la reserva.

### 3.5 Datos en el navegador

- `sessionStorage` puede guardar el servicio, la fecha, el horario y un
  identificador de intento de reserva.
- No guardar en `sessionStorage` nombre, correo, teléfono ni explicación de la
  consulta.
- Cerrar el modal no debe mezclar selecciones entre trámites diferentes.

## 4. Decisiones todavía pendientes

No asumir estos valores durante la implementación sin confirmación:

- Anticipación mínima para reservar.
- Intervalo o descanso entre consultas.
- Máximo de reservas por día.
- Si todos los servicios duran 45 minutos o existen excepciones.
- Si la confirmación será siempre automática o habrá casos sujetos a aprobación.
- Cancelación inicial por WhatsApp o cancelación autoservicio mediante enlace.
- Calendarios personales o secundarios que deben bloquear disponibilidad.

La implementación debe centralizar estas reglas para que puedan modificarse sin
reescribir la interfaz.

## 5. Arquitectura recomendada

```text
Selección de servicio
        ↓
sessionStorage, sin datos personales
        ↓
Modal propio: servicio → fecha → horario → datos → confirmación
        ↓
Funciones de Vercel: validación, Turnstile, firma e idempotencia
        ↓
Google Apps Script ejecutado como Eliana
        ↓
Bloqueo → segunda comprobación → creación del evento → invitación
```

### 5.1 Por qué Apps Script

La cuenta operativa es una cuenta personal `@gmail.com`. Una cuenta de servicio
de Google necesita delegación de dominio para completar asistentes, algo propio
de Google Workspace. Apps Script puede ejecutarse como la propietaria, consultar
sus calendarios, crear eventos, agregar invitados y enviar invitaciones sin
exponer credenciales al navegador.

### 5.2 Responsabilidad de Vercel

Agregar funciones serverless al proyecto estático:

- `GET /api/availability`
- `POST /api/bookings`
- Opcional en una entrega posterior: `POST /api/cancellations`

Vercel debe validar la entrada pública, verificar el control antibot y comunicarse
con Apps Script mediante solicitudes firmadas. El navegador nunca debe conocer
el secreto de Apps Script ni credenciales de Google.

### 5.3 Responsabilidad de Apps Script

- Mantener la configuración horaria canónica.
- Consultar los calendarios configurados.
- Devolver solamente franjas y estados de disponibilidad.
- Adquirir un bloqueo exclusivo antes de reservar.
- Revalidar el horario dentro del bloqueo.
- Crear el evento en el calendario de turnos.
- Guardar el trámite y los datos mínimos.
- Agregar el correo del cliente como invitado y enviar la invitación.
- Registrar idempotencia para que un reintento no duplique la reserva.

El código de Apps Script debe quedar versionado en el repositorio; su URL de
despliegue y secretos deben vivir fuera del código.

## 6. Contratos propuestos

### 6.1 Disponibilidad

Solicitud:

```json
{
  "serviceCode": "string",
  "from": "YYYY-MM-DD",
  "to": "YYYY-MM-DD"
}
```

Respuesta:

```json
{
  "timeZone": "America/Montevideo",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "slots": [
        { "start": "RFC3339", "end": "RFC3339", "status": "available" },
        { "start": "RFC3339", "end": "RFC3339", "status": "unavailable" }
      ]
    }
  ]
}
```

La respuesta nunca debe incluir datos de eventos existentes.

### 6.2 Creación de reserva

Solicitud:

```json
{
  "serviceCode": "string",
  "start": "RFC3339",
  "name": "string",
  "email": "string",
  "phone": "string",
  "details": "string",
  "consent": true,
  "turnstileToken": "string",
  "idempotencyKey": "string"
}
```

Resultados esperados:

- `201`: reserva creada y confirmada.
- `400`: datos inválidos.
- `403`: origen o validación antibot rechazados.
- `409`: el horario dejó de estar disponible.
- `429`: demasiados intentos.
- `502/503`: Google no respondió o el servicio está temporalmente indisponible.

No mostrar confirmación al usuario hasta recibir éxito real del backend.

## 7. Evento de Google Calendar

Contenido mínimo sugerido:

- Título: `Consulta notarial — {trámite}`.
- Inicio y fin en `America/Montevideo`.
- Ubicación del estudio cuando corresponda.
- Invitado: correo proporcionado por el cliente.
- Descripción privada:
  - Nombre.
  - Teléfono.
  - Trámite.
  - Explicación breve.
  - Identificador interno de reserva.
- Invitados sin permiso para modificar la cita ni invitar a terceros.

El reviewer debe comprobar que la explicación y otros datos personales no
aparezcan en logs, respuestas de disponibilidad ni partes públicas del sitio.

## 8. Seguridad y privacidad

- Validar `Origin`/`Host` como defensa adicional; esto no limita el contenido de
  la consulta.
- Validar todos los campos en el servidor.
- Lista cerrada de códigos de servicio.
- Horarios, duración y horizonte calculados en el servidor.
- Cloudflare Turnstile con verificación obligatoria del token en Vercel.
- Límite de solicitudes y protección contra reintentos.
- Solicitudes Vercel → Apps Script firmadas con HMAC, timestamp y nonce.
- Rechazar firmas vencidas y nonces reutilizados.
- Secretos únicamente en variables de Vercel y propiedades privadas de Apps
  Script.
- Nunca registrar cuerpos completos de reservas ni secretos.
- Eventos con visibilidad privada.
- Consentimiento explícito antes de reservar.
- Mantener el aviso de no enviar información sensible.

## 9. Concurrencia e idempotencia

El orden dentro de Apps Script debe ser:

1. Validar firma y datos.
2. Reconocer un reintento ya procesado por su `idempotencyKey`.
3. Adquirir `LockService.getScriptLock()`.
4. Consultar nuevamente todos los calendarios bloqueantes.
5. Rechazar con conflicto si el horario está ocupado.
6. Crear el evento.
7. Guardar el resultado asociado a la clave de idempotencia.
8. Liberar el bloqueo en `finally`.

Dos solicitudes concurrentes para el mismo horario deben producir exactamente
una reserva exitosa.

## 10. Flujo de interfaz

1. Abrir el modal existente.
2. Mostrar Agenda en línea y WhatsApp.
3. Al elegir Agenda, mostrar el trámite seleccionado.
4. Permitir elegir o corregir el trámite.
5. Mostrar calendario dentro del modal.
6. Mostrar días y horarios disponibles/no disponibles.
7. Solicitar nombre, correo, teléfono y explicación breve.
8. Mostrar consentimiento y control antibot.
9. Deshabilitar el botón mientras se procesa.
10. Mostrar confirmación solamente después de crear el evento.

Casos de error:

- Si el horario fue tomado, conservar el formulario y solicitar otro horario.
- Si Google está caído, conservar el trámite y ofrecer reintentar o WhatsApp.
- Si la API devuelve una respuesta inválida o una página HTML, no mostrar el
  error técnico: explicar que la agenda no está disponible y ofrecer un botón
  directo para reservar por WhatsApp conservando el trámite.
- Si el token antibot vence, renovarlo sin borrar el formulario.
- Si se abre el modal desde otro servicio, reemplazar correctamente la selección
  anterior.

## 11. Pruebas requeridas

### 11.1 Unitarias

- Lista permitida de servicios.
- Horizonte exacto de 45 días.
- Lunes a viernes y pausa del mediodía.
- Zona horaria uruguaya.
- Superposición completa y parcial de eventos.
- Límites exactos de inicio y fin.
- Validación y sanitización de todos los campos.
- Firma, expiración y repetición de solicitudes.
- Idempotencia.

### 11.2 Integración

- Consultar el calendario existente con eventos ocupados, sin revelar sus
  detalles.
- Crear un evento con trámite, invitado y descripción.
- Confirmar que la invitación llega al correo de prueba.
- Repetir la misma solicitud sin duplicar el evento.
- Ejecutar dos reservas simultáneas para el mismo horario.
- Simular errores y cuotas de Google.
- Simular éxito, fallo y expiración de Turnstile.

### 11.3 Interfaz y accesibilidad

- Entrada desde cada enlace de Servicios.
- Entrada desde el botón general Reservar turno.
- Persistencia del trámite en la pestaña actual.
- Navegación completa por teclado.
- Foco correcto al avanzar, volver y cerrar el modal.
- Estados anunciados por lector de pantalla.
- Teléfono, tablet y escritorio.
- Horarios disponibles y no disponibles distinguibles sin depender solo del
  color.

## 12. Criterios de aceptación para el reviewer

- El trámite elegido llega automáticamente al evento correcto.
- La entrada directa obliga a elegir un trámite o usa explícitamente la consulta
  general acordada.
- El horizonte máximo es exactamente 45 días.
- Se muestran horarios disponibles y no disponibles sin revelar detalles
  privados.
- El servidor revalida el horario al confirmar.
- Dos usuarios no pueden reservar el mismo horario.
- Un reintento no duplica la cita.
- La invitación se envía al correo indicado.
- No existe ninguna credencial o secreto en HTML, JavaScript público, commits o
  logs.
- No se almacena información personal en `sessionStorage`.
- Los fallos no producen confirmaciones falsas.
- WhatsApp continúa funcionando como alternativa.
- El flujo es usable y accesible en móvil y escritorio.

## 13. Severidad sugerida para hallazgos

- **Crítico:** secretos expuestos, acceso público al calendario, creación de
  eventos arbitrarios o filtración de datos personales.
- **Alto:** doble reserva, disponibilidad incorrecta, confirmación falsa,
  omisión de Turnstile del lado servidor o trámite perdido/manipulado.
- **Medio:** errores de zona horaria, pérdida de estado recuperable, mensajes
  confusos o problemas importantes de accesibilidad/responsive.
- **Bajo:** detalles visuales o de redacción sin impacto operativo.

## 14. Entregables esperados para la revisión

- Diff completo y resumen por responsabilidad.
- Contratos finales de API.
- Configuración documentada sin valores secretos.
- Código versionado de Apps Script.
- Pruebas unitarias e integración con resultados.
- Evidencia de una reserva real controlada en el calendario existente.
- Evidencia de invitación recibida.
- Evidencia de prueba simultánea y ausencia de duplicados.
- Lista de variables requeridas en Vercel y propiedades requeridas en Apps
  Script.
- Procedimiento de despliegue, rotación de secretos y rollback.
- Alcances pendientes, especialmente cancelación o reprogramación.

## 15. Publicación y rollback

1. Implementar en una rama de feature.
2. Usar el calendario existente y el despliegue de Apps Script configurado,
   limitando la validación a una reserva controlada porque no hay un calendario
   de prueba separado.
3. Publicar primero en Preview de Vercel.
4. Ejecutar los casos de aceptación con datos de prueba.
5. Configurar producción sin copiar secretos a archivos locales o commits.
6. Realizar una reserva real controlada.
7. Mantener WhatsApp y el enlace actual de Google como respaldo inicial.
8. Ante un fallo operativo, desactivar la reserva propia y volver al enlace de
   Google/WhatsApp sin perder el resto del sitio.

## 16. Fuera de alcance inicial

- Pagos en línea.
- Carga de documentos.
- Historia clínica, expediente o CRM.
- Múltiples profesionales o sedes con disponibilidad independiente.
- Recordatorios personalizados fuera de Google Calendar.
- Reprogramación autoservicio, salvo que se apruebe como parte de la primera
  entrega.

## 17. Referencias técnicas oficiales

- Google Apps Script Web Apps:
  https://developers.google.com/apps-script/guides/web
- Calendar Service para Apps Script:
  https://developers.google.com/apps-script/reference/calendar
- Creación de eventos, invitados e invitaciones:
  https://developers.google.com/apps-script/reference/calendar/calendar
- Lock Service:
  https://developers.google.com/apps-script/reference/lock
- Cuotas de Apps Script:
  https://developers.google.com/apps-script/guides/services/quotas
- Vercel Functions:
  https://vercel.com/docs/functions
- Variables de entorno de Vercel:
  https://vercel.com/docs/environment-variables
- Validación server-side de Turnstile:
  https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
