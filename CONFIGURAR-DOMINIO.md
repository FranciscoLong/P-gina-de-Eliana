# Cómo activar el dominio (www.escribaniaisbarbo.com.uy)

El sitio ya está publicado en GitHub Pages y funcionando en la URL provisoria:
**https://franciscolong.github.io/P-gina-de-Eliana/**

Para que ande en tu dominio propio, falta **un solo paso**: cargar unos
registros DNS en el panel de NIC Uruguay. Cuando lo hagas, en unas horas el
sitio queda accesible en https://www.escribaniaisbarbo.com.uy

---

## Qué cargar en NIC Uruguay (nic.com.uy)

Entrá a tu cuenta en https://nic.com.uy → tu dominio → **Gestión de DNS / Zona**.

### 1. Subdominio principal `www` (registro CNAME)

| Campo    | Valor                    |
|----------|--------------------------|
| Tipo     | CNAME                    |
| Nombre   | `www`                    |
| Valor / Destino | `franciscolong.github.io.` |
| TTL      | 3600 (o el que venga por defecto) |

> Ese punto final en `franciscolong.github.io.` es correcto; algunos paneles
> lo agregan solos.

### 2. Dominio "pelado" `escribaniaisbarbo.com.uy` (4 registros A)

Para que también funcione **sin** el `www` (y redirija al www), agregá estos
cuatro registros de tipo A, todos con el nombre vacío o `@`:

| Tipo | Nombre | Valor            |
|------|--------|------------------|
| A    | `@`    | 185.199.108.153  |
| A    | `@`    | 185.199.109.153  |
| A    | `@`    | 185.199.110.153  |
| A    | `@`    | 185.199.111.153  |

*(Son las IP oficiales de GitHub Pages. Si el panel no acepta `@`, dejá el
campo Nombre vacío.)*

### 3. (Opcional, IPv6) 4 registros AAAA en `@`

Si el panel lo permite, mejora la cobertura:

| Tipo | Nombre | Valor                    |
|------|--------|--------------------------|
| AAAA | `@`    | 2606:50c0:8000::153      |
| AAAA | `@`    | 2606:50c0:8001::153      |
| AAAA | `@`    | 2606:50c0:8002::153      |
| AAAA | `@`    | 2606:50c0:8003::153      |

---

## Después de cargar el DNS

1. Esperá de **1 a 24 horas** a que se propague (suele ser menos).
2. Entrá a GitHub → repo → **Settings → Pages** y verificá que el dominio
   `www.escribaniaisbarbo.com.uy` aparezca con el tilde verde.
3. Marcá la casilla **"Enforce HTTPS"** (recién se puede activar cuando el DNS
   ya resolvió; GitHub emite el certificado gratis y automático).

Listo: el sitio queda en https://www.escribaniaisbarbo.com.uy con candado.

---

## Verificar que el DNS ya propagó (opcional)

Desde una terminal:

```bash
dig www.escribaniaisbarbo.com.uy +short      # debe mostrar franciscolong.github.io
dig escribaniaisbarbo.com.uy +short          # debe mostrar las 4 IP 185.199.10x.153
```
