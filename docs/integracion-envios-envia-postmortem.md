# Integración de Envíos con envia.com - Postmortem Técnico
**Fecha:** 29 de julio de 2026  
**Objetivo:** Implementar cotización de envíos en checkout mediante API de envia.com  
**Status:** En progreso (fase final de debugging)

---

## Problemas Encontrados y Soluciones

### 1. **Cotizaciones Automáticas Indeseadas (CRÍTICO)**

#### ❌ Problema
El componente `ShippingOptions.jsx` contenía un `useEffect` que disparaba cotizaciones automáticamente cada vez que el campo `direccion` cambiaba, causando:
- Múltiples requests sin control del usuario
- Datos incompletos en requests (faltaba origen y carriers)
- UX confusa (usuario no sabía por qué se enviaban datos)

#### 🔍 Causa Raíz
```javascript
// MALO - Reaccionaba a cambios de prop
useEffect(() => {
  if (direccion) cotizar()  // Se ejecutaba en CADA re-render
}, [direccion])
```

#### ✅ Solución
Eliminamos TODO el `useEffect`. Convertimos `ShippingOptions.jsx` a componente **100% presentacional**:
- Solo recibe props: `opciones`, `loading`, `error`, `selectedOption`
- Solo renderiza lo que recibe
- NO hace requests
- La cotización ahora es controlada SOLO por:
  - Button click en `Checkout.jsx`
  - Handler `onClick` que recolecta todos los datos necesarios

**Resultado:** Una sola cotización POR click del usuario.

---

### 2. **Datos Incompletos Enviados al Backend (CRÍTICO)**

#### ❌ Problema
Cuando `ShippingOptions.jsx` hacía requests, enviaba:
```javascript
{
  items: [...],
  destino: { city, province, postalCode },  // ❌ Falta street y number
  // ❌ Falta origen
  // ❌ Falta carriers
}
```

Edge Function rechazaba: `"Carriers vacío"`, `"Origen incompleto"`

#### 🔍 Causa Raíz
- Frontend solo pasaba datos parciales
- No había validación de qué se enviaba

#### ✅ Solución
Modificar `Checkout.jsx` para pasar **TODOS** los datos necesarios:

```javascript
// BIEN - Completo
const { data, error } = await supabase.functions.invoke('envia-cotizar', {
  body: {
    items: items.map(i => ({ productId: i.productId, qty: i.qty })),
    destino: { street, number, city, province, postalCode },  // ✅ Completo
    origen,  // ✅ Desde secrets
    carriers: ['correos', 'oca', 'andreani'],  // ✅ Array de carriers
  },
})
```

**Cambios requeridos:**
- Leer `street` y `number` del estado del formulario
- Pasarlos al destino
- Incluir `origen` (hardcodeado temporalmente, luego desde secrets)
- Incluir `carriers` (hardcodeado tempor., luego configurable)

---

### 3. **Origen Hardcodeado vs Secrets (SEGURIDAD)**

#### ❌ Problema Inicial
En `envia.ts` había valores hardcodeados:
```javascript
origin: {
  city: 'Buenos Aires',  // ❌ Hardcodeado
  postalCode: '1772',    // ❌ Incorrecto (real es B1768DTB)
  // ... más hardcodeados
}
```

Causaba que cotizaciones se hicieran contra dirección **INCORRECTA**.

#### ✅ Solución
Crear función `buildOrigenFromEnv()` que lee **TODAS** las secrets:

```typescript
function buildOrigenFromEnv(): Origen {
  const nombre = Deno.env.get('ENVIA_ORIGEN_NOMBRE')
  const telefono = Deno.env.get('ENVIA_ORIGEN_TELEFONO')
  const email = Deno.env.get('ENVIA_ORIGEN_EMAIL')
  const calle = Deno.env.get('ENVIA_ORIGEN_CALLE')
  const numero = Deno.env.get('ENVIA_ORIGEN_NUMERO')
  const ciudad = Deno.env.get('ENVIA_ORIGEN_CIUDAD')
  const provincia = Deno.env.get('ENVIA_ORIGEN_PROVINCIA')
  const cp = Deno.env.get('ENVIA_ORIGEN_CP')

  // ✅ Validar que TODAS existan - sin fallbacks
  if (!nombre || !telefono || !calle || !numero || !ciudad || !provincia || !cp) {
    throw new Error('Missing required env var')
  }

  return { nombre, telefono, email, calle, numero, ciudad, provincia, cp }
}
```

**Ventajas:**
- Single source of truth: Supabase Secrets
- Falla explícitamente si falta algo
- No adivina valores

**Secrets requeridas en Supabase:**
```
ENVIA_ORIGEN_NOMBRE = "Aura-Store"
ENVIA_ORIGEN_TELEFONO = "+54 9 11 5969-1014"
ENVIA_ORIGEN_EMAIL = "codebygabrielpatty@gmail.com"
ENVIA_ORIGEN_CALLE = "Soldado Juan Rava"
ENVIA_ORIGEN_NUMERO = "1020"
ENVIA_ORIGEN_CIUDAD = "Ciudad Madero"
ENVIA_ORIGEN_PROVINCIA = "buenos aires"
ENVIA_ORIGEN_CP = "B1768DTB"
```

---

### 4. **Estructura de Paquetes Incompleta (API MISMATCH)**

#### ❌ Problema 1: Falta campo `content`
```
Error: "Required property missing: content"
```

Arreglado: Agregamos `content: 'Ropa Deportiva'`

#### ❌ Problema 2: Falta campo `amount`
```
Error: "Required property missing: amount"
```

Arreglado: Agregamos `amount: 5` (pero con valor INCORRECTO)

#### ❌ Problema 3: `amount` demasiado alto
```
Error: "The total amount of all packages exceeds the allowed limit of 15"
```

**Causa Raíz:** Usamos `amount: 1000` (pensando en pesos), pero envia.com rechaza si > 15.

#### ✅ Solución Final
```javascript
packages: [
  {
    type: 'box',
    weight: paquete.peso,
    dimensions: {
      height: paquete.alto,
      width: paquete.ancho,
      length: paquete.largo,
    },
    content: 'Ropa Deportiva',      // ✅ Descripción
    amount: 5,                       // ✅ Valor bajo (< 15)
  },
]
```

**Nota:** El `amount` es el **valor declarado para seguro**, no el precio total. envia.com tiene límite de 15 pesos.

---

### 5. **Nombre de Carrier Incorrecto (API MISMATCH)**

#### ❌ Problema
```
Error: "Carrier provided is not supported or incorrect."
```

Frontend enviaba: `"correo_argentino"`  
Pero envia.com espera: `"correos"` (sin guión)

#### ✅ Solución
Cambiar en `Checkout.jsx`:
```javascript
// MALO
const carriers = ['correo_argentino', 'oca', 'andreani']

// BIEN
const carriers = ['correos', 'oca', 'andreani']
```

**Carriers válidos en envia.com:**
- `correos` (Correo Argentino)
- `oca` (OCA)
- `andreani` (Andreani)
- `fedex` (FedEx - si está activo en cuenta)

---

### 6. **Código Viejo No Se Actualizaba en Vercel (DEPLOYMENT)**

#### ❌ Problema
Tras hacer cambios en `Checkout.jsx`:
- GitHub tenía código nuevo
- Pero navegador seguía ejecutando código viejo
- Logs mostraban `destino: {street, number, ...}` (estructura antigua)

#### 🔍 Causa Raíz
Vercel/Vite tenía caché muy profundo del build anterior.

#### ✅ Soluciones Aplicadas (en orden)
1. `Ctrl+Shift+R` (hard refresh) - **NO funcionó**
2. Limpiar caché de navegador completamente - **NO funcionó**
3. Restartar servidor Vite local + limpiar `node_modules/.vite` - **SÍ funcionó**
4. Crear commit dummy para forzar rebuild en Vercel - **SÍ funcionó**

**Lección:** Cuando cambios no aparecen:
- Primero: Limpiar caché local (`rm -rf node_modules/.vite`)
- Segundo: Restart dev server
- Tercero: Commit dummy para forzar re-build en producción

---

## Estado Actual

### ✅ Completado
- [x] ShippingOptions 100% presentacional (sin useEffect automático)
- [x] Origen desde Supabase Secrets (sin hardcoding)
- [x] Estructura de paquetes completa (content + amount)
- [x] Carrier correcto (`correos` no `correo_argentino`)
- [x] Edge Function deployada
- [x] Frontend deployado en Vercel

### ⏳ Próximos Pasos
1. Verificar logs en navegador después de próximo click "COTIZAR ENVÍO"
2. Si devuelve opciones: ✅ Feature COMPLETADA
3. Si aún falla: Revisar error específico y aplicar fix

---

## Checklist para Otro Desarrollador

Si alguien retoma esto mañana:

### Setup Inicial
```bash
# Clonar repo
git clone ...
cd ecommerce-men

# Variables de entorno (.env.local para dev)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# Secrets en Supabase Dashboard:
ENVIA_API_TOKEN=...
ENVIA_ORIGEN_NOMBRE=...
ENVIA_ORIGEN_TELEFONO=...
# ... etc (8 secrets totales)
```

### Si no funciona:
1. **Revisar logs de Supabase** (Supabase Dashboard → Edge Functions → envia-cotizar → Logs)
   - Buscar error específico
   - Cada línea tiene estructura: `[MODULO] ✅/❌ mensaje`

2. **Revisar console del navegador** (F12 → Console)
   - Logs con colores indican si request fue enviada
   - Buscar `DESTINO`, `ORIGEN`, `CARRIERS` en mayúsculas

3. **Comunes culprits:**
   - `Carriers vacío` → No se pasó `carriers` array
   - `Origen incompleto` → Falta field en origen
   - `destino: {street, number}` → Código viejo en caché
   - `amount exceeds limit` → Cambiar a valor < 15
   - `Carrier not supported` → Revisar nombre exacto en envia.com docs

### Debugging Flow
```
Usuario clickea "COTIZAR ENVÍO"
  ↓
Checkout.jsx recolecta: items, destino (completo), origen, carriers
  ↓
Invoca Edge Function: supabase.functions.invoke('envia-cotizar')
  ↓
envia-cotizar/index.ts recibe request
  ├─ Valida campos (items, destino, carriers, origen)
  ├─ Lee origen desde SECRETS (si no está en request)
  ├─ Busca productos en DB (dimensions, weight)
  └─ Arma paquetes
  ↓
envia.ts cotizarEnvio()
  ├─ Para cada carrier:
  │  ├─ Arma body para envia.com API
  │  ├─ POST a https://api.envia.com/ship/rate/
  │  └─ Parse respuesta (rates o error)
  └─ Retorna opciones array
  ↓
Frontend renderiza opciones o muestra error
```

---

## Lecciones Aprendidas

### 1. **Automatismo = Debugging Pesadilla**
- ❌ useEffect que cotiza automáticamente
- ✅ Explicit user actions (button click)
- **Regla:** Si está en un input form, cotizar SOLO por button

### 2. **API Contracts Son Estrictos**
- envia.com rechaza si falta UNO de: `content`, `amount`, estructura de dimensions
- Leer docs API = 80% del trabajo
- Logging detallado = crucial para debug

### 3. **Secrets > Hardcoding Siempre**
- Uno de los problemas era postalCode = "1772" (incorrecto)
- Real es B1768DTB (en secrets)
- Nunca hardcodear credenciales, direcciones, o datos de negocio

### 4. **Cache es Enemigo**
- Hard refresh NO siempre funciona
- Restart dev server + limpiar .vite
- En producción: dummy commit para forzar rebuild

### 5. **API Response Structure Matters**
- Error messages de envia.com son claros
- "exceeds the allowed limit of 15" = revisa qué es `amount`
- "not supported or incorrect" = revisa spelling del carrier

---

## Archivos Modificados Hoy

```
✅ src/pages/Checkout.jsx
   - Línea 315: Agregar street, number a destino
   - Línea ~304: Cambiar 'correo_argentino' a 'correos'

✅ src/components/checkout/ShippingOptions.jsx
   - Eliminación completa de useEffect (líneas ~13-21)

✅ supabase/functions/_shared/envia.ts
   - Agregación de `content: 'Ropa Deportiva'`
   - Cambio `amount: 1000` → `amount: 5`

✅ supabase/functions/envia-cotizar/index.ts
   - Agregación de buildOrigenFromEnv()
   - Validación de request completo
   - Transformación destino (street, number, etc.)
```

---

## Próximo Checkpoint

**Cuando funcione (recibe opciones):**
1. Implementar selección de opción → guarda en estado
2. Integrar precio de envío en resumen de orden
3. Pasar opción seleccionada a Mercado Pago
4. Generar guía real (envia-generar function)
5. Notificar usuario con tracking

**Estimado:** 2-3 horas más de trabajo (la cotización fue 50% del esfuerzo).
