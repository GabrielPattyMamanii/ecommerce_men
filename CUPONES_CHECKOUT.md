# Cupones: Sistema Completo de Descuentos por Tipo de Producto

## 🎯 Resumen de Cambios

Se implementó un sistema **funcional completo** de cupones con restricción por tipo de producto (Por Mayor / Por Menor / Ambos) y aplicación real en el checkout. Los cupones ahora realmente aplican descuentos verificables en el monto final cobrado por Mercado Pago.

---

## 📋 Checklist de Verificación

### 1. Base de Datos
- [ ] Aplicar la migración SQL en Supabase Dashboard → SQL Editor:
  ```sql
  -- Copiar contenido de: supabase/migration-coupons-checkout.sql
  ```
  Esto agrega:
  - `applies_to` (text) en tabla `coupons` — valores: `'retail'`, `'wholesale'`, `'ambos'`
  - `coupon_code` (text) en tabla `orders`
  - `discount_amount` (numeric) en tabla `orders`

### 2. Admin → `/admin/cupones` — Crear Cupones de Prueba

**Cupón 1: Solo Por Mayor**
- Nombre: "Test Mayorista"
- Código: `MAYOR25`
- Descuento: 25%
- **Aplica a**: `Solo Por Mayor`
- Estado: Publicado
- ✅ Guardar

**Cupón 2: Solo Por Menor**
- Nombre: "Test Minorista"
- Código: `MENOR15`
- Descuento: 15%
- **Aplica a**: `Solo Por Menor`
- Estado: Publicado
- ✅ Guardar

**Cupón 3: Todos los Productos**
- Nombre: "Test Universal"
- Código: `TODOS10`
- Descuento: 10%
- **Aplica a**: `Todos los productos`
- Estado: Publicado
- ✅ Guardar

### 3. Admin → Banner Activo

- En `/admin/cupones`, haz clic en "Activar en banner" en uno de los cupones (ej. `MAYOR25`)
- Deberías ver:
  - Badge en la tarjeta: "✓ Banner activo"
  - Badge adicional en el cupón: "· Solo Por Mayor" (en color ámbar)

### 4. Storefront → Banner Público

- Ve a `http://localhost:5173` (página principal)
- En el header, debería aparecer una sección "Promo Banner" con:
  - Mensaje: "25% OFF con el código MAYOR25"
  - Badge: "SOLO POR MAYOR" (en ámbar, junto al countdown si tienes uno)
- El banner se actualiza cada 30s, así que si cambias algo en admin deberías verlo reflejado

### 5. Storefront → Carrito y Cupones

#### Caso 1: Cupón incompatible con el carrito
1. **Agrega un producto POR MENOR** al carrito (desde `/catalogo`)
2. Ve a `/checkout`
3. En la sección "Código de Promoción", ingresa: `MAYOR25`
4. Haz clic en "Aplicar"
5. **Resultado esperado**:
   - Mensaje de error rojo: "Este cupón solo aplica a productos por mayor. Tu carrito no tiene ese tipo de productos."
   - El cupón NO se aplica
   - El total sigue igual

#### Caso 2: Cupón válido - Por Menor
1. Vacía el carrito (si lo hiciste en Caso 1)
2. **Agrega un producto POR MENOR** nuevamente
3. Ve a `/checkout`
4. Ingresa: `MENOR15`
5. Haz clic en "Aplicar"
6. **Resultado esperado**:
   - Chip verde: "✓ MENOR15 · -15%"
   - Botón "Quitar" disponible
   - En el resumen de orden: aparece línea "Descuento: -$X.XX" en verde
   - El "Monto Total" se reduce correctamente (subtotal - descuento)
   - **Ejemplo**: Si subtotal es $100, descuento es $15, total = $85

#### Caso 3: Cupón válido - Por Mayor
1. Vacía el carrito
2. **Agrega un producto POR MAYOR** (desde `/catalogo`, modo "Por Mayor")
3. Ve a `/checkout`
4. Ingresa: `MAYOR25`
5. Haz clic en "Aplicar"
6. **Resultado esperado**:
   - Chip verde: "✓ MAYOR25 · -25%"
   - Descuento se calcula sobre el monto mayorista
   - Total disminuye

#### Caso 4: Carrito Mixto (Mayor + Menor)
1. Vacía el carrito
2. **Agrega 1 producto POR MENOR** ($100)
3. **Agrega 1 DOCENA POR MAYOR** ($1000)
4. Ve a `/checkout`
5. Ingresa: `MAYOR25`
6. Haz clic en "Aplicar"
7. **Resultado esperado**:
   - Cupón se acepta (porque el carrito tiene productos por mayor)
   - Descuento se calcula **SOLO sobre la docena**: $1000 × 25% = $250
   - El producto por menor ($100) NO recibe descuento
   - Monto Total = $100 + $1000 + $0 (envío) - $250 = **$850**

#### Caso 5: Cupón Universal
1. Vacía el carrito
2. Agrega mezcla de productos (menor + mayor)
3. Ve a `/checkout`
4. Ingresa: `TODOS10`
5. Haz clic en "Aplicar"
6. **Resultado esperado**:
   - Cupón se acepta
   - Descuento se calcula sobre el **subtotal completo** (ambos tipos)
   - Monto Total = (subtotal de todos) - 10%

---

## 🔄 Flujo Completo: Compra con Cupón

### Cuando seleccionas Mercado Pago:

1. Validas el cupón en checkout (como en los casos arriba)
2. Haces clic en "Pagar con Mercado Pago"
3. Se invoca la Edge Function `create-mp-preference` que:
   - **Re-valida el cupón server-side** (nunca confía en el frontend)
   - Verifica que no haya expirado (contador regresivo)
   - Calcula el descuento nuevamente
   - Crea una orden en `orders` con:
     - `coupon_code: "MAYOR25"`
     - `discount_amount: 250.00`
     - `total: 850.00` (ya con descuento aplicado)
   - Agrega un ítem negativo en la preferencia de Mercado Pago: `unit_price: -250`

4. Se abre Mercado Pago y el monto mostrado coincide con el total de checkout (incluido descuento)
5. Completas el pago
6. El webhook actualiza la orden a `status: 'paid'`
7. Email de confirmación se envía con el monto final pagado

### Verificación en base de datos:

Después de hacer una compra con cupón, puedes verificar en Supabase:

```sql
SELECT id, coupon_code, discount_amount, total FROM orders 
ORDER BY created_at DESC LIMIT 1;
```

Deberías ver:
- `coupon_code`: "MAYOR25" (o el cupón usado)
- `discount_amount`: 250.00 (o el monto descontado)
- `total`: 850.00 (el monto real que se cobró)

---

## 🛠️ Arquitectura Técnica

### Frontend
- **CartContext** → No se modificó (carrito sigue igual)
- **Checkout.jsx** → Nuevo estado `couponCode`, `appliedCoupon`, validación en tiempo real
- **MercadoPagoBrick** → Pasa `couponCode` al hook
- **useCheckoutPro** → Envía `couponCode` y `type` por ítem al backend
- **PromoBanner** → Muestra badge de alcance del cupón

### Admin
- **CouponsTable** → Campo "Aplica a" en form + badge en tarjeta
- Cupones existentes se migran a `applies_to: 'ambos'` (sin romper el banner activo)

### Backend
- **Migration SQL** → Agrega columnas a `orders` y `coupons`
- **Edge Function** (`create-mp-preference`) → Revalidación y descuento real
- **Mercado Pago** → Recibe el descuento como un ítem con `unit_price` negativo

---

## 📊 Validaciones

| Escenario | Frontend | Backend | Resultado |
|---|---|---|---|
| Cupón inválido | ❌ Mensaje error | ✓ Rechazado | No aplica |
| Cupón expirado | ✓ Rechazado | ✓ Rechazado (doble check) | No aplica |
| Tipo incompatible | ❌ Mensaje error | ✓ Rechazado | No aplica |
| Carrito vacío | - | ✓ Error pedido | Error al pagar |
| Carrito mixto + cupón específico | ✓ Descuento parcial | ✓ Descuento parcial (revalidado) | Descuento solo en ítems elegibles |

---

## 🐛 Testing Edge Cases

### Cupón con Contador Regresivo (opcional)
1. En admin, crea un cupón con "Contador regresivo" activado (ej. 5 minutos)
2. Lo activas como banner
3. El countdown aparece en el banner público
4. Después de 5 minutos, el banner desaparece automáticamente
5. Al intentar usar el cupón en checkout después del plazo → se rechaza con "Este cupón ha expirado"

### Cambiar `applies_to` después de activar como banner
1. Tienes un cupón "MAYOR25" de tipo "Solo Por Mayor" → activado en banner
2. Lo editas y cambias a "Solo Por Menor"
3. El banner sigue mostrando el cupón (OK)
4. Pero el badge ahora dice "SOLO POR MENOR" (correcto)
5. Al intentar usarlo en un carrito de mayor → se rechaza (correcto)

---

## 📝 Notas Importantes

1. **Cupones existentes**: Si tenías cupones antes de este cambio, quedan automáticamente con `applies_to: 'ambos'` (no rompe nada).

2. **Seguridad**: El descuento se valida **siempre server-side** en la Edge Function — el frontend no puede "engañar" al backend.

3. **Descuento en Mercado Pago**: Se representa como un ítem adicional con `unit_price` negativo. Esto es estándar en la API de Mercado Pago y el resumen en MP coincide exactamente con el checkout.

4. **Carrito mixto**: Si tienes mayor + menor y aplicas un cupón "Solo Por Mayor", **solo** se descuenta la porción de mayor. El cliente ve claramente qué parte del carrito recibió descuento (línea "Descuento" en el resumen).

5. **Performance**: El banner re-consulta el cupón cada 30s (`POLL_INTERVAL_MS`) para reflejar cambios sin recargar la página.

---

## 🚀 Próximas Mejoras (Opcionales)

- [ ] Agregar límite de usos por cupón en la tabla `coupons`
- [ ] Tracking de cupones usados (tabla `coupon_usage`)
- [ ] Admin: gráficos de cupones más usados
- [ ] Descuentos escalonados según monto mínimo de compra
- [ ] Cupones por categoría específica (no solo por tipo)

