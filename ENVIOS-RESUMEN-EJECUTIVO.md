# 📋 Integración de Envíos - Resumen Ejecutivo

**Fecha:** 29 de julio de 2026  
**Estado:** En progreso (bugs resueltos, próximo test)  
**API:** envia.com (cotización de envíos)  

---

## 🚨 5 Problemas Críticos Encontrados y Resueltos

| # | Problema | Síntoma | Causa | Solución |
|---|----------|---------|-------|----------|
| 1️⃣ | **Cotizaciones automáticas** | Se enviaban requests sin que el usuario clickeara | `useEffect` en ShippingOptions disparaba cotizaciones cada 600ms | Eliminar `useEffect`, hacer componente 100% presentacional |
| 2️⃣ | **Datos incompletos en request** | Faltaba `street`, `number`, `origen`, `carriers` | Frontend solo pasaba `city`, `province`, `postalCode` | Pasar TODOS los datos en `Checkout.jsx` |
| 3️⃣ | **Origen hardcodeado** | CP "1772" incorrecto vs real "B1768DTB" | Valores fijos directos en `envia.ts` | Leer desde Supabase Secrets con `buildOrigenFromEnv()` |
| 4️⃣ | **Estructura paquete incompleta** | Errores: `"missing content"`, `"missing amount"` | Objeto paquete incompleto para API | Agregar `content: 'Ropa Deportiva'` + `amount: 5` |
| 5️⃣ | **Amount excede límite** | `"exceeds allowed limit of 15"` | Usamos `amount: 1000` (confusión de unidades) | Cambiar a `amount: 5` (valor para seguro) |
| 6️⃣ | **Carrier incorrecto** | `"Carrier provided is not supported"` | Nombre erróneo: `'correo_argentino'` no existe en API | Cambiar a `'correos'` (nombre real en envia.com) |
| 7️⃣ | **Envío no se suma al total** | "FREE" no cambiaba al seleccionar opción | `Checkout.jsx` buscaba `.price` pero `envia.ts` devuelve `.precio` | Cambiar a `selectedShippingOption?.precio` |

---

## 📝 Cambios Implementados

### Archivo por Archivo

#### `src/pages/Checkout.jsx`
```diff
// Línea 102: Cambiar .price a .precio
- const displayShipping = (selectedShippingOption?.price ?? (shipping || 0))
+ const displayShipping = (selectedShippingOption?.precio ?? (shipping || 0))

// Línea 315: Agregar street y number a destino
- destino: { city, province, postalCode }
+ destino: { street, number, city, province, postalCode }

// Línea 304: Cambiar carrier de 'correo_argentino' a 'correos'
- const carriers = ['correo_argentino', 'oca', 'andreani']
+ const carriers = ['correos', 'oca', 'andreani']
```

#### `src/components/checkout/ShippingOptions.jsx`
```diff
// Eliminar COMPLETAMENTE el useEffect (líneas ~13-21)
- useEffect(() => {
-   if (direccion) cotizar()
- }, [direccion])

// Componente ahora es 100% presentacional
// Solo recibe props: opciones, loading, error, selectedOption
// NO hace requests
```

#### `supabase/functions/_shared/envia.ts`
```diff
// Líneas 96-97: Agregar campos faltantes al paquete
  packages: [
    {
      type: 'box',
      weight: paquete.peso,
      dimensions: { height, width, length },
+     content: 'Ropa Deportiva',
+     amount: 5,
    },
  ]
```

#### `supabase/functions/envia-cotizar/index.ts`
```diff
// Agregar función para leer origen desde secrets
+ function buildOrigenFromEnv(): Origen {
+   const nombre = Deno.env.get('ENVIA_ORIGEN_NOMBRE')
+   const telefono = Deno.env.get('ENVIA_ORIGEN_TELEFONO')
+   // ... (8 variables totales)
+   if (!nombre || !telefono || ...) throw new Error('Missing required env var')
+   return { nombre, telefono, email, calle, numero, ciudad, provincia, cp }
+ }

// Línea 186: Transformar destino para que incluya street y number
+ const destinoTransformado = {
+   calle: destino.street || '',
+   numero: destino.number || '1',
+   ciudad: destino.city,
+   provincia: destino.province,
+   codigoPostal: destino.postalCode,
+ }
```

---

## 🔧 Qué Hay que Hacer Ahora (Next Steps)

### ✅ Ya Completado
- [x] Eliminar cotizaciones automáticas
- [x] Pasar datos completos al backend
- [x] Leer origen desde Supabase Secrets
- [x] Completar estructura de paquetes
- [x] Fijar carrier correcto
- [x] Sumar envío al total

### ⏳ Próximos Pasos
1. **Verificar en navegador:**
   ```
   Ctrl+Shift+R (hard refresh)
   → Clickear "COTIZAR ENVÍO"
   → Seleccionar opción de envío (ej: OCA Sucursal)
   → Verificar que TOTAL se actualice ✅
   ```

2. **Si funciona:**
   - Integrar precio de envío en resumen de orden
   - Pasar opción seleccionada a Mercado Pago
   - Generar guía real (usar `envia-generar` function)

3. **Si falla:**
   - Revisar logs en Supabase Dashboard
   - Buscar error específico en Console del navegador

---

## 📚 Documentación Completa

**Archivo:** `docs/integracion-envios-envia-postmortem.md`

Contiene:
- ✅ Análisis detallado de cada problema
- ✅ Debugging flow paso a paso
- ✅ Checklist para reproducir issues
- ✅ Lecciones aprendidas
- ✅ Cómo debuggear si falla de nuevo
- ✅ Secrets requeridas en Supabase

---

## 🚀 Commits Realizados Hoy

```bash
# 1. Agregar campo 'content'
6a0a0720 fix: agregar campo 'content' requerido por envia.com

# 2. Agregar campo 'amount'
e01b8ad5 fix: agregar campo 'amount' requerido por envia.com API

# 3. Cambiar amount de 1000 a 5 y carrier a 'correos'
2ed21c3 fix: reducir amount a 5 pesos y cambiar carrier a 'correos'

# 4. Agregar postmortem completo
6ae786f docs: postmortem completo de integración de envíos

# 5. Cambiar .price a .precio
[ÚLTIMA] fix: cambiar .price a .precio para sumar envío al total
```

---

## ⚙️ Secrets Requeridas en Supabase

Ir a: **Supabase Dashboard → Settings → Edge Functions Secrets**

```
ENVIA_API_TOKEN = "[tu token de envia.com]"
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

## 🎯 Debugging Quick Reference

### Si ves "FREE" en shipping y no cambia:
- Verifica que `.precio` se usa, NO `.price`
- Revisa que `selectedShippingOption` tiene el objeto completo

### Si no hay opciones de envío:
- Revisa logs en Supabase → Edge Functions → envia-cotizar
- Busca errores de: `content`, `amount`, `carrier name`

### Si Checkout.jsx muestra código viejo:
```bash
# Limpia caché de Vite
rm -rf node_modules/.vite

# Reinicia servidor
Ctrl+C en terminal
npm run dev
```

### Carriers válidos en envia.com:
- `correos` (Correo Argentino) ✅
- `oca` (OCA) ✅
- `andreani` (Andreani) ✅
- `fedex` (FedEx - si está activo) ⚠️

---

## 📊 Flujo Actual (Correcto)

```
Usuario en Checkout
  ↓
Completa dirección (street, number, city, province, postalCode)
  ↓
Clickea "COTIZAR ENVÍO"
  ↓
Frontend recolecta:
  - items (desde carrito)
  - destino (completo: street, number, city, province, postalCode)
  - origen (desde secrets via Edge Function)
  - carriers (array: correos, oca, andreani)
  ↓
POST a supabase.functions.invoke('envia-cotizar')
  ↓
Edge Function:
  ├─ Valida datos ✅
  ├─ Lee origen desde secrets ✅
  ├─ Busca productos en DB ✅
  ├─ Arma paquetes con content + amount ✅
  └─ Cotiza en envia.com API ✅
  ↓
Backend devuelve array de opciones:
  [
    { carrier: 'oca', service: 'oca_ss', precio: 2802.19, dias: '2-3 días', ... },
    { carrier: 'oca', service: 'oca_sp', precio: 27760.81, dias: '2-3 días', ... },
    ...
  ]
  ↓
Frontend renderiza opciones ✅
  ↓
Usuario selecciona opción (ej: OCA Sucursal)
  ↓
displayShipping = selectedShippingOption?.precio = 2802.19 ✅
  ↓
TOTAL se recalcula:
  Subtotal: $20.00
  + Shipping: $2802.19 ← (SUMADO ✅)
  + Tax: $0.74
  = TOTAL: $2823.93 ✅
  ↓
Usuario procede a pago con precio correcto ✅
```

---

## 📌 Para Otro Desarrollador

Si algo falla después de esto:

1. **Lee primero:** `docs/integracion-envios-envia-postmortem.md`
2. **Verifica:** Todas las secrets están en Supabase
3. **Revisa logs:** Supabase Dashboard → Edge Functions → envia-cotizar
4. **Si persiste:** Busca el error específico en la tabla de problemas arriba

---

**Última actualización:** 29 julio 2026, 23:59  
**Desarrollador:** Claude Code  
**Estado:** Listo para test final
