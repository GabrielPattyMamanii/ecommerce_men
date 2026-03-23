# Integración Mercado Pago Checkout PRO — Guía de Implementación

> **Modalidad:** Checkout PRO (redirect al sitio de Mercado Pago)
> **Stack:** React + Vite | Supabase Edge Functions (Deno) | npm:mercadopago@^2
> **Última actualización:** Marzo 2026

---

## Arquitectura

```
[Frontend React]
  MercadoPagoBrick.jsx → useCheckoutPro.js
        │
        │  supabase.functions.invoke("create-mp-preference")
        ▼
[Supabase Edge Function — Deno]
  supabase/functions/create-mp-preference/index.ts
        │
        │  SDK mercadopago@^2 → Preference.create()
        │  Authorization: Bearer MP_ACCESS_TOKEN ← nunca sale del server
        ▼
[API de Mercado Pago]
  Devuelve { id, init_point, sandbox_init_point }
        │
        ▼
[Frontend]
  window.location.href = init_point → Cliente paga en MP
        │
        ▼
  MP redirige a back_urls → /pago-resultado?status=success|failure|pending
```

**Por qué una Edge Function:** El `Access Token` de MP es secreto. Nunca debe estar en el frontend. La Edge Function es el único lugar que conoce el token.

**Credenciales necesarias:** Solo el `Access Token`. La `Public Key` NO se usa en Checkout PRO con redirect.

---

## Requisitos previos

- Cuenta en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
- Aplicación creada (tipo Checkout Pro, integración Online)
- Proyecto en Supabase con Edge Functions habilitadas
- Proyecto React + Vite con `@supabase/supabase-js` instalado
- Archivo `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

---

## PASO 0 — Configurar Secrets en Supabase (HACER PRIMERO)

> **ERROR CRÍTICO si se omite:** La Edge Function fallará con 500 Internal Server Error si los secrets no existen. Los mensajes de error son crípticos (ej. `auto_return invalid. back_url.success must be defined`) porque las variables de entorno devuelven `undefined`.

### 0.1 Ir al Dashboard de Supabase

1. Dashboard → seleccionar proyecto
2. Menú lateral → **Edge Functions** → pestaña **Secrets** (o `Settings → Edge Functions`)
3. Clic en **New secret**

### 0.2 Crear estos secrets

| Nombre exacto | Valor (pruebas) | Valor (producción) |
|---|---|---|
| `MP_ACCESS_TOKEN` | `TEST-XXXX...` (de MP Developers → Credenciales de prueba) | `APP_USR-XXXX...` (Credenciales de producción) |
| `SITE_URL` | `http://localhost:5173` | `https://tu-dominio.com` (sin barra final) |

### 0.3 Verificación

- El nombre del secret debe coincidir EXACTAMENTE con lo que usa `Deno.env.get()` en la Edge Function
- `SITE_URL` NO debe terminar en `/` — el código ya hace `.replace(/\/$/, '')`
- Si usás CLI en lugar del Dashboard:
```bash
supabase secrets set MP_ACCESS_TOKEN=TEST-XXXXXXXXXXXXXXXX
supabase secrets set SITE_URL=http://localhost:5173
```

> **ADVERTENCIA sobre Supabase CLI en Windows:** El comando `npm install -g supabase` instala un paquete incorrecto. En Windows usar `winget install Supabase.CLI` o directamente usar el Dashboard web (recomendado).

---

## PASO 1 — Edge Function: `create-mp-preference/index.ts`

### 1.1 Estructura de archivos

```
supabase/
└── functions/
    └── create-mp-preference/
        └── index.ts
```

### 1.2 Código completo (copiar tal cual)

```typescript
// Supabase Edge Function — Mercado Pago: create payment preference
// Deploy: supabase functions deploy create-mp-preference --no-verify-jwt
// Env vars needed in Supabase Dashboard → Settings → Edge Functions:
//   MP_ACCESS_TOKEN  — Access Token de producción o sandbox
//   SITE_URL         — URL del frontend (ej. https://tudominio.com)

import { MercadoPagoConfig, Preference } from 'npm:mercadopago@^2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CartItem {
  id: string
  name: string
  price: number
  qty: number
  img?: string
}

Deno.serve(async (req: Request) => {
  // Preflight CORS — OBLIGATORIO para que el navegador permita la llamada
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { items }: { items: CartItem[] } = await req.json()

    if (!items?.length) {
      return new Response(
        JSON.stringify({ error: 'El carrito está vacío.' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      )
    }

    const client = new MercadoPagoConfig({
      accessToken: Deno.env.get('MP_ACCESS_TOKEN') ?? '',
      options: { timeout: 8000 },
    })

    const siteUrl = (Deno.env.get('SITE_URL') ?? 'http://localhost:5173').replace(/\/$/, '')

    const response = await new Preference(client).create({
      body: {
        items: items.map((item) => ({
          id: item.id,
          title: item.name,
          unit_price: item.price,
          quantity: item.qty,
          currency_id: 'ARS',
          picture_url: item.img,
        })),
        back_urls: {
          success: `${siteUrl}/pago-resultado?status=success`,
          failure: `${siteUrl}/pago-resultado?status=failure`,
          pending: `${siteUrl}/pago-resultado?status=pending`,
        },
        // NO incluir auto_return hasta tener SITE_URL configurado correctamente.
        // Ver sección "Errores comunes" para más detalles.
        statement_descriptor: 'NOMBRE_DE_TU_TIENDA',
      },
    })

    return new Response(
      JSON.stringify({
        preferenceId: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('MP Error:', JSON.stringify(err, Object.getOwnPropertyNames(err)))
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
```

### 1.3 Notas importantes sobre el código

- **`npm:mercadopago@^2`**: Deno permite importar paquetes npm con el prefijo `npm:`. No se necesita `package.json`.
- **CORS**: Sin el handler de `OPTIONS`, el navegador bloquea la llamada con `net::ERR_FAILED`.
- **`currency_id: 'ARS'`**: Cambiar según el país (BRL, MXN, CLP, COP, etc.).
- **`statement_descriptor`**: Nombre que aparece en el resumen de tarjeta del comprador. Máximo 22 caracteres.
- **`console.error` con `Object.getOwnPropertyNames`**: Necesario porque los errores de MP a veces no se serializan con `JSON.stringify` normal.

---

## PASO 2 — Deploy de la Edge Function

### Opción A: Deploy vía Supabase Dashboard (RECOMENDADO en Windows)

1. Ir al Dashboard de Supabase → **Edge Functions**
2. Si la función no existe: clic en **New function** → nombre: `create-mp-preference`
3. Si ya existe: clic en la función → pestaña **Code**
4. Seleccionar todo el código existente (Ctrl+A)
5. Pegar el código completo del PASO 1.2
6. Clic en **Deploy**
7. Esperar a que el estado cambie a "Active"

> **IMPORTANTE:** Cada vez que se modifique el código de la Edge Function, se debe repetir este proceso: Code → Ctrl+A → Pegar → Deploy.

### Opción B: Deploy vía Supabase CLI

```bash
supabase functions deploy create-mp-preference --no-verify-jwt
```

> **Problema frecuente en Windows:** `supabase: command not found`. Instalar con `winget install Supabase.CLI`, NO con `npm install -g supabase` (ese es un paquete diferente e incorrecto).

### 2.1 Archivo de configuración local (opcional)

Crear `supabase/config.toml` en la raíz del proyecto:

```toml
[functions.create-mp-preference]
verify_jwt = false
```

Esto solo aplica si se usa la CLI. Si se deploya desde el Dashboard, la configuración de JWT se hace en el PASO 3.

---

## PASO 3 — Desactivar JWT Verification (OBLIGATORIO)

> **ERROR si se omite:** La Edge Function responderá `401 Unauthorized` a todas las llamadas desde el frontend.

La verificación JWT está **activada por defecto** en Supabase Edge Functions. Como el checkout es público (no requiere que el usuario esté autenticado), debe desactivarse.

### 3.1 Desactivar desde el Dashboard

1. Dashboard → **Edge Functions** → clic en `create-mp-preference`
2. Ir a la pestaña **Settings** (o el ícono de engranaje)
3. Buscar el toggle **"Verify JWT"** (o "Verify JWT with legacy secret")
4. **Desactivar** el toggle
5. Clic en **Save changes**

### 3.2 Desactivar desde CLI

Usar la flag `--no-verify-jwt` al deployar:
```bash
supabase functions deploy create-mp-preference --no-verify-jwt
```

### 3.3 Verificación

Después de desactivar, hacer una llamada de prueba. Si el toggle está bien configurado, no debería devolver 401.

---

## PASO 4 — Hook React: `useCheckoutPro.js`

### 4.1 Crear el archivo

```
src/
└── hooks/
    └── useCheckoutPro.js
```

### 4.2 Código completo

```javascript
import { useState, useCallback } from 'react'
import { supabase } from '../services/supabaseClient'

export function useCheckoutPro() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const checkout = useCallback(async ({ items }) => {
    setIsLoading(true)
    setError(null)

    try {
      const payload = items.map((i) => ({
        id: String(i.id),
        name: i.name,
        price: i.price,
        qty: i.qty,
        img: i.img ?? '',
      }))

      const { data, error: fnError } = await supabase.functions.invoke(
        'create-mp-preference',
        { body: { items: payload } },
      )

      if (fnError) throw fnError

      // Redirigir al checkout de Mercado Pago
      window.location.href = data.init_point
    } catch (err) {
      setError(err?.message ?? 'Error al procesar el pago. Intente de nuevo.')
      setIsLoading(false)
    }
  }, [])

  return { checkout, isLoading, error }
}
```

### 4.3 Notas

- **`supabase.functions.invoke`**: Usa el `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del `.env.local` automáticamente.
- **El nombre `'create-mp-preference'`** debe coincidir exactamente con el nombre de la Edge Function en Supabase.
- **`window.location.href`**: Redirect completo (no SPA navigation). El usuario sale del sitio y va a MP.
- **`data.init_point`**: Funciona tanto en sandbox como en producción. La diferencia la controla el `MP_ACCESS_TOKEN`: si es TEST, MP muestra sandbox. Si es producción, cobra dinero real.
- **Formato del payload**: Los campos `id`, `name`, `price`, `qty` deben coincidir con la interfaz `CartItem` de la Edge Function.

---

## PASO 5 — Componente: `MercadoPagoBrick.jsx`

### 5.1 Crear el archivo

```
src/
└── components/
    └── payment/
        └── MercadoPagoBrick.jsx
```

### 5.2 Código completo

```jsx
import { useCheckoutPro } from '../../hooks/useCheckoutPro'

export function MercadoPagoBrick({ items }) {
  const { checkout, isLoading, error } = useCheckoutPro()

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-red-400 text-xs font-mono uppercase tracking-wide border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => checkout({ items })}
        disabled={isLoading || !items?.length}
        className="group w-full relative overflow-hidden py-4 text-center transition-all hover:shadow-[0_0_10px_rgba(0,157,227,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#009EE3' }}
      >
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <span className="relative text-white text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3">
          {isLoading ? (
            <>
              <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
              Redirigiendo a Mercado Pago…
            </>
          ) : (
            <>
              <span className="font-bold text-sm font-mono opacity-90">MP</span>
              Pagar con Mercado Pago
              <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </>
          )}
        </span>
      </button>
    </div>
  )
}
```

### 5.3 Notas

- **`#009EE3`**: Color oficial de Mercado Pago.
- **`type="button"`**: Previene que un `<form>` padre haga submit.
- **`disabled` cuando `!items?.length`**: Evita llamar a la Edge Function sin ítems.
- **El componente es agnóstico al design system**: Adaptar clases CSS según el proyecto.

---

## PASO 6 — Integrar en Checkout.jsx

### 6.1 Importar el componente

```jsx
import { MercadoPagoBrick } from '../components/payment/MercadoPagoBrick'
```

### 6.2 Preparar los ítems del carrito

La prop `items` debe ser un array con este formato:

```javascript
const items = cart.map((item) => ({
  id: String(item.id),
  name: item.name,
  price: item.price,        // número, precio unitario
  qty: item.qty,             // número, cantidad
  img: item.img ?? '',       // string, URL de imagen (opcional)
}))
```

### 6.3 Renderizar el componente

```jsx
{/* Dentro del formulario o sección de pago */}
{paymentMethod === 'mp' && (
  <MercadoPagoBrick items={items} />
)}
```

### 6.4 Consideraciones

- Si el checkout tiene un `<form>`, cambiar `onSubmit` a `(e) => e.preventDefault()` para evitar recargas.
- El botón de MP maneja su propio submit — no depende del form.
- Si hay otros métodos de pago, renderizar condicionalmente según la selección del usuario.

---

## PASO 7 — Página de resultado de pago

### 7.1 Crear `PaymentResult.jsx`

```
src/
└── pages/
    └── PaymentResult.jsx
```

### 7.2 Código completo

```jsx
import { Link, useSearchParams } from 'react-router-dom'

const STATUS_CONFIG = {
  success: {
    icon: 'check_circle',
    title: 'Pago Aprobado',
    description: 'Tu pago fue procesado con éxito. Pronto recibirás un email de confirmación.',
    color: 'text-green-400',
    border: 'border-green-500/30',
    bg: 'bg-green-500/10',
    glow: '0 0 20px rgba(34,197,94,0.3)',
  },
  failure: {
    icon: 'cancel',
    title: 'Pago Rechazado',
    description: 'El pago no pudo ser procesado. Podés intentar nuevamente con otro medio de pago.',
    color: 'text-red-400',
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    glow: '0 0 20px rgba(239,68,68,0.3)',
  },
  pending: {
    icon: 'schedule',
    title: 'Pago Pendiente',
    description: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
    color: 'text-yellow-400',
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/10',
    glow: '0 0 20px rgba(234,179,8,0.3)',
  },
}

export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'pending'
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-slate-200 font-body antialiased">
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,240,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,240,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
        aria-hidden="true"
      />

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-20 lg:py-32">
        <div className="max-w-md w-full text-center space-y-8">
          <div
            className={`inline-flex items-center justify-center w-24 h-24 border ${config.border} ${config.bg}`}
            style={{ boxShadow: config.glow }}
          >
            <span className={`material-symbols-outlined text-5xl ${config.color}`}>
              {config.icon}
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
              // Payment_Status
            </p>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-white uppercase font-display">
              {config.title}
            </h1>
            <p className="text-sm text-slate-400 font-mono leading-relaxed">
              {config.description}
            </p>
          </div>

          {searchParams.get('payment_id') && (
            <div className="text-xs font-mono text-slate-500 border border-[#333] bg-[#121212] px-4 py-3">
              <span className="text-slate-400">REF:</span>{' '}
              <span className="text-primary">{searchParams.get('payment_id')}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              to="/"
              className="px-6 py-3 bg-[#121212] border border-[#333] text-white text-sm font-mono uppercase tracking-wider hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">home</span>
              Volver al Inicio
            </Link>

            {status === 'failure' && (
              <Link
                to="/checkout"
                className="group px-6 py-3 bg-primary text-black text-sm font-mono uppercase tracking-wider font-bold hover:shadow-[0_0_10px_rgba(0,240,255,0.3)] transition-all flex items-center justify-center gap-2"
              >
                Reintentar Pago
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
```

### 7.3 Agregar la ruta en App.jsx

```jsx
import PaymentResult from './pages/PaymentResult'

// Dentro del componente de rutas públicas:
<Route path="/pago-resultado" element={<PaymentResult />} />
```

### 7.4 Notas

- Las `back_urls` de la Edge Function apuntan a `/pago-resultado?status=success|failure|pending`
- MP agrega automáticamente query params adicionales como `payment_id`, `status`, `merchant_order_id`
- El componente usa `useSearchParams` de React Router para leer el estado
- Adaptar los estilos CSS al design system del proyecto

---

## PASO 8 — Verificación end-to-end

### 8.1 Checklist antes de probar

- [ ] Secrets configurados en Supabase: `MP_ACCESS_TOKEN` y `SITE_URL`
- [ ] Edge Function deployada y activa
- [ ] JWT verification desactivada en la Edge Function
- [ ] `.env.local` tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- [ ] Ruta `/pago-resultado` registrada en App.jsx
- [ ] `npm run dev` corriendo

### 8.2 Flujo de prueba

1. Agregar productos al carrito
2. Ir a Checkout
3. Seleccionar "Mercado Pago" como método de pago
4. Clic en "Pagar con Mercado Pago"
5. Verificar que redirige al checkout de MP
6. Pagar con tarjeta de prueba (ver sección siguiente)
7. Verificar que MP redirige a `/pago-resultado?status=success`
8. Verificar que la página muestra "Pago Aprobado"

### 8.3 Tarjetas de prueba (Argentina)

| Tarjeta | Número | CVV | Vencimiento | Resultado |
|---|---|---|---|---|
| Visa (aprobada) | 4509 9535 6623 3704 | 123 | 11/25 | Aprobado |
| Mastercard (aprobada) | 5031 7557 3453 0604 | 123 | 11/25 | Aprobado |
| Visa (rechazada) | 4000 0000 0000 0002 | 123 | 11/25 | Rechazado |

Usar las cuentas de prueba generadas en [MP Developers → Test Cards](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-cards).

### 8.4 Dónde ver logs de la Edge Function

Dashboard de Supabase → **Edge Functions** → `create-mp-preference` → pestaña **Logs**

Los errores aparecen con el prefijo `MP Error:` gracias al `console.error` del catch.

---

## Errores comunes y soluciones

### Error 1: `net::ERR_FAILED` / CORS error en la consola del navegador

**Causa:** La Edge Function no está deployada en Supabase, o el nombre no coincide.

**Solución:**
1. Verificar que la función existe en Dashboard → Edge Functions
2. Verificar que el nombre en `supabase.functions.invoke('create-mp-preference')` coincide exactamente con el nombre en Supabase
3. Si se acaba de crear, esperar unos segundos y reintentar

---

### Error 2: `401 Unauthorized` en las invocaciones

**Causa:** JWT verification está activada (es el default). El frontend envía el `anon key`, no un JWT de usuario.

**Solución:**
1. Dashboard → Edge Functions → `create-mp-preference` → Settings
2. Desactivar el toggle "Verify JWT" (o "Verify JWT with legacy secret")
3. Guardar cambios

---

### Error 3: `500 Internal Server Error` — `auto_return invalid. back_url.success must be defined`

**Causa:** Se incluyó `auto_return: 'approved'` en la preferencia pero `SITE_URL` no está configurado como secret, o está vacío. Sin `SITE_URL`, las `back_urls` se generan como URLs relativas inválidas (ej. `/pago-resultado?status=success` en vez de `https://dominio.com/pago-resultado?status=success`).

**Solución:**
1. **Opción rápida:** NO incluir `auto_return` en la preferencia. Sin `auto_return`, MP muestra un botón "Volver al sitio" en vez de redirigir automáticamente. Las `back_urls` siguen funcionando.
2. **Opción completa:** Configurar el secret `SITE_URL` con una URL absoluta válida (ej. `http://localhost:5173` para desarrollo o `https://tu-dominio.com` para producción). Luego agregar `auto_return: 'approved'` a la preferencia.

**Regla:** Solo agregar `auto_return` DESPUÉS de verificar que `SITE_URL` está correctamente configurado como secret.

---

### Error 4: `supabase: command not found` (Windows)

**Causa:** `npm install -g supabase` instala un paquete npm incorrecto que no es la Supabase CLI.

**Solución:**
- Instalar con: `winget install Supabase.CLI`
- O mejor: usar el Dashboard web para deployar (no requiere CLI)

---

### Error 5: `500` pero los logs solo muestran boot/shutdown

**Causa:** El código deployado no es el más reciente. Supabase cachea la función anterior.

**Solución:**
1. Dashboard → Edge Functions → `create-mp-preference` → Code
2. Ctrl+A → Pegar el código actualizado → Deploy
3. Esperar a que el estado sea "Active"
4. Verificar en los logs que la nueva versión está corriendo

---

### Error 6: La función funciona pero devuelve `{ error: "..." }` con status 500

**Causa:** El `MP_ACCESS_TOKEN` es inválido, expiró, o el nombre del secret no coincide con `Deno.env.get('MP_ACCESS_TOKEN')`.

**Solución:**
1. Ir a MP Developers → Credenciales → copiar el Access Token
2. Verificar que el secret en Supabase se llama exactamente `MP_ACCESS_TOKEN`
3. Reemplazar el valor del secret con el token correcto
4. Los secrets se actualizan sin necesidad de re-deployar la función

---

### Error 7: El botón de MP no hace nada / no aparece error

**Causa:** El array `items` está vacío o el botón está `disabled`.

**Solución:**
- Verificar que `items` tiene al menos un elemento
- Verificar que cada ítem tiene `id`, `name`, `price`, `qty`
- Agregar un `console.log(items)` antes de llamar a `checkout()` para debug

---

## Checklist de producción

Cuando la integración funciona en modo pruebas y se quiere pasar a producción:

- [ ] **Cambiar `MP_ACCESS_TOKEN`** en Supabase Secrets: de `TEST-XXXX...` a `APP_USR-XXXX...`
- [ ] **Cambiar `SITE_URL`** en Supabase Secrets: de `http://localhost:5173` a `https://tu-dominio.com`
- [ ] **Re-deployar la Edge Function** (si se cambió código)
- [ ] **Actualizar `statement_descriptor`** con el nombre real del negocio
- [ ] **Agregar `auto_return: 'approved'`** (opcional, solo si `SITE_URL` está bien configurado)
- [ ] **Restringir CORS** (opcional): cambiar `'*'` por el dominio exacto en producción
- [ ] **Verificar `.env`** del frontend: debe apuntar al proyecto Supabase de producción
- [ ] **Hacer una compra de prueba real** con monto mínimo y verificar que el dinero llega

```
PRUEBAS                              PRODUCCIÓN
──────────────────────────────────────────────────────────────
MP_ACCESS_TOKEN = TEST-XXXX...  →   MP_ACCESS_TOKEN = APP_USR-XXXX...
SITE_URL = localhost:5173        →   SITE_URL = https://mi-tienda.com
auto_return: (no incluir)        →   auto_return: 'approved'
CORS: '*'                        →   CORS: 'https://mi-tienda.com'
```

---

## Resumen de archivos

| Archivo | Qué hace |
|---|---|
| `supabase/functions/create-mp-preference/index.ts` | Edge Function: crea preferencia en API de MP |
| `supabase/config.toml` | Config local: `verify_jwt = false` para la función |
| `src/hooks/useCheckoutPro.js` | Hook: invoca Edge Function + redirect a MP |
| `src/components/payment/MercadoPagoBrick.jsx` | Componente: botón visual de pago con estados |
| `src/pages/PaymentResult.jsx` | Página: resultado del pago (success/failure/pending) |
| `src/pages/Checkout.jsx` | Página: checkout, integra MercadoPagoBrick |
| `src/App.jsx` | Ruta `/pago-resultado` registrada |
| `.env.local` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Supabase Secrets | `MP_ACCESS_TOKEN`, `SITE_URL` |

---

## Preguntas frecuentes

**¿Por qué no usamos el SDK embebido (`@mercadopago/sdk-react`)?**
Checkout PRO con redirect es más simple y seguro. MP maneja toda la UI de pago. No se necesita la `Public Key` en el frontend.

**¿Qué pasa si el usuario cierra la pestaña de MP?**
MP no redirige. El usuario puede volver manualmente al sitio. El carrito sigue en localStorage.

**¿La preferencia caduca?**
Sí, a los 30 días por defecto. En la práctica esto no es problema.

**¿Cómo recibir notificaciones de pago en tiempo real?**
Usando Webhooks/IPN de MP. Se configura `notification_url` en la preferencia. Requiere una Edge Function adicional que reciba el POST de MP y actualice la orden en la base de datos.

---

*Documentado con base en implementación real — incluye todos los errores encontrados y sus soluciones. Marzo 2026.*
