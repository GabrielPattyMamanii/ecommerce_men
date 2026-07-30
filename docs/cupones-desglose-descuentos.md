# Descuentos con Desglose Transparente — Sistema de Cupones

## 🎯 Resumen

Cuando un cliente aplica un cupón en el checkout, ahora ve **exactamente a qué productos** se aplica el descuento, no solo el monto total. Esto es crítico para carritos mixtos (Por Mayor + Por Menor) donde el cupón puede ser restricto.

---

## 📋 Desglose Visual en Checkout

### Escenario 1: Carrito **Solo Por Menor** + Cupón **"MENOR15"**

```
Subtotal                     $450.00
Envío                        $50.00

┌─────────────────────────────────────┐
│ 🏷️  Cupón MENOR15 (15%)              │
│                                      │
│ ✓ Camiseta XL (×1)        $382.50   │  ← precio después del 15% descuento
│ ✓ Pantalón (×2)           $765.00   │
│                                      │
│ Ahorro:                    -$172.50  │
└─────────────────────────────────────┘

Descuento               -$172.50
────────────────────────────────
Monto Total             $327.50
```

### Escenario 2: Carrito **Mixto** (Menor + Mayor) + Cupón **"MAYOR25"** (Solo Por Mayor)

```
Subtotal                      $1100.00
Envío                            $50.00

┌──────────────────────────────────────┐
│ 🏷️  Cupón MAYOR25 (25%)              │
│                                       │
│ ✓ Docena Camisetas (×1)   $750.00   │  ← solo el item por mayor
│                                       │
│ ⊘ Pantalón (×1)           $300.00   │  ← NO incluido, es por menor
│                                       │
│ Ahorro:                    -$250.00   │
└──────────────────────────────────────┘

Descuento               -$250.00
────────────────────────────────
Monto Total             $900.00
```

### Escenario 3: Carrito **Mixto** + Cupón **"TODOS10"** (Para Todos)

```
Subtotal                      $1100.00
Envío                            $50.00

┌──────────────────────────────────────┐
│ 🏷️  Cupón TODOS10 (10%)              │
│                                       │
│ ✓ Docena Camisetas (×1)   $900.00   │  ← aplica a todos
│ ✓ Pantalón (×1)           $270.00   │
│                                       │
│ Ahorro:                    -$117.00   │
└──────────────────────────────────────┘

Descuento               -$117.00
────────────────────────────────
Monto Total             $1083.00
```

---

## 🔍 Detalles del Desglose

### ✓ Productos Elegibles (en Verde)

Aparecen cuando el `type` del producto coincide con `applies_to` del cupón:

- **Cupón "ambos"**: todos los productos son elegibles
- **Cupón "retail"**: solo productos con `type: 'retail'`
- **Cupón "wholesale"**: solo productos con `type: 'wholesale'`

Cada línea muestra:
- ✓ (símbolo de éxito)
- Nombre del producto y cantidad
- **Precio final**: `precio_unitario × qty × (1 - discount_percentage/100)`

### ⊘ Productos NO Elegibles (en Gris, si aplica)

Aparecen cuando hay una mezcla y el cupón es restrictivo:

- Solo se muestran si `appliedCoupon.applies_to !== 'ambos'`
- Ayuda al cliente a entender por qué su carrito no recibe descuento total
- Muestra el precio sin descuento (para comparación visual)

### 💰 Total de Ahorro

- **Cálculo**: suma de descuentos en items elegibles
- **Formato**: "Ahorro: -$X.XX"
- **Color**: verde (igual que el monto del descuento abajo)

---

## 🔄 Cálculos Backend (Coinciden Exactamente)

Cuando el cliente abre Mercado Pago, la Edge Function `create-mp-preference` hace **exactamente los mismos cálculos**:

```ts
// Backend (create-mp-preference/index.ts, líneas 125-147)
const eligibleItems = coupon.applies_to === 'ambos'
  ? items
  : items.filter((i) => (i.type ?? 'retail') === coupon.applies_to)

const eligibleSubtotal = eligibleItems.reduce((sum, i) => sum + i.price * i.qty, 0)
const discountAmount = +(eligibleSubtotal * coupon.discount_percentage / 100).toFixed(2)
```

**Garantía**: El monto que paga en MP es el mismo que ve en checkout (nunca puede haber sorpresas).

---

## 📝 Ejemplo: Carrito Mixto con Cupón Por Mayor

### Frontend (Checkout)

Cliente ve el desglose:
```
Subtotal               $1000 + $300 = $1300

Cupón MAYOR25 (25%):
  ✓ Docena (×1)          $750  →  $562.50  (descuento: $187.50)
  ⊘ Camiseta (×1)        $300  (no aplica)

Ahorro: -$187.50
Monto Total: $1112.50
```

### Backend (Edge Function)

Revalida y cobra en MP:
```ts
items = [
  { productId: 'docena-1', price: 750, qty: 1, type: 'wholesale' },
  { productId: 'camiseta-1', price: 300, qty: 1, type: 'retail' },
]
coupon = { applies_to: 'wholesale', discount_percentage: 25 }

// Filtro
eligibleItems = [
  { productId: 'docena-1', price: 750, qty: 1, type: 'wholesale' }
]
eligibleSubtotal = 750
discountAmount = 750 * 25 / 100 = 187.50

// Preferencia de MP
mpItems = [
  { title: 'Docena', unit_price: 750, quantity: 1 },
  { title: 'Camiseta', unit_price: 300, quantity: 1 },
  { title: 'Descuento cupón MAYOR25', unit_price: -187.50, quantity: 1 }  ← Ítem negativo
]

total = 1300 - 187.50 = 1112.50
```

MP muestra exactamente **$1112.50**, coincide con checkout.

---

## ✅ Verificación de Transparencia

### Checklist para Pruebas

- [ ] **Cupón universal**: ¿Se muestra "✓" en todos los productos?
- [ ] **Cupón restrictivo + carrito puro**: ¿Se muestra "✓" en productos elegibles, sin "⊘"?
- [ ] **Cupón restrictivo + carrito mixto**: ¿Se muestran ambos "✓" (elegibles) y "⊘" (no elegibles)?
- [ ] **Monto de ahorro**: ¿Coincide con (elegibles_subtotal × descuento%)?
- [ ] **MP**: ¿El total mostrado en MP coincide con el total de checkout?

### Caso de Prueba Completo

1. Carrito: Pantalón ($100, retail) + Docena ($1000, wholesale)
2. Cupón: MAYOR25 (25%, solo wholesale)
3. Descuento esperado: $1000 × 25% = $250

**Verificar en checkout**:
```
Subtotal                 $1100
Envío                      $50

Cupón MAYOR25 (25%):
  ✓ Docena (×1)  → $750
  ⊘ Pantalón (×1) → $100
  Ahorro: -$250

Descuento               -$250
Total                    $900
```

**Verificar en MP**: Si el monto mostrado es $900, ✅ todo correcto.

---

## 🛡️ Notas de Seguridad

- **Frontend es solo informativo**: El desglose en checkout es visual, para ayudar al cliente.
- **Backend es la verdad**: La Edge Function recalcula **todo** servidor-side, nunca confía en el frontend.
- **Descuento no puede falsificarse**: El cliente no puede mandar un `discountAmount` falso — se recalcula siempre.

---

## 🔧 Archivo Afectado

- `src/pages/Checkout.jsx` — líneas ~571-633: Nuevo bloque "Desglose de descuento" con:
  - Listado de productos elegibles (✓ verde)
  - Listado de productos no elegibles (⊘ gris, si aplica)
  - Total de ahorro

---

## 📊 Casos Limite

### Caso: Cupón expirado
- Backend rechaza antes de que llegue al desglose
- Frontend muestra error: "Este cupón ha expirado"
- Desglose no se renderiza

### Caso: Carrito vacío
- No hay productos elegibles ni no-elegibles
- Desglose no se muestra (no hay `appliedCoupon` porque la validación falla)

### Caso: Carrito con solo 1 tipo + cupón que es para el otro tipo
- Frontend valida y rechaza **antes** de que se aplique
- Usuario ve: "Este cupón solo aplica a productos por mayor. Tu carrito no tiene ese tipo..."
- Desglose nunca se renderiza (es correcto)

---

## 🚀 Próximas Mejoras (Opcionales)

- [ ] Agregar hover sobre cada producto para ver "Ahorro de este producto: -$X"
- [ ] Animación de entrada del desglose (fade-in suave)
- [ ] Símbolo de "restricted" (🚫) más visible en productos no-elegibles
- [ ] Tipografía más grande para el "Ahorro" si es descuento ≥ $100

