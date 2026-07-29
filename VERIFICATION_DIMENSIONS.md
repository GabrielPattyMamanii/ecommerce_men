# Verificación de Dimensiones en el Carrito

## ¿Qué se corrigió?

Ahora cuando un cliente agrega un producto al carrito, **las dimensiones se guardan automáticamente según el tipo de compra**:

### Por Menor (Retail)
Cuando se agrega un producto por unidad individual, el carrito guarda:
- `weight_kg` — Peso por unidad en kg
- `height_cm` — Alto por unidad en cm
- `width_cm` — Ancho por unidad en cm
- `length_cm` — Largo por unidad en cm

### Por Mayor (Wholesale)
Cuando se agrega una compra por docena, el carrito guarda:
- `dozen_height` — Alto de la docena en cm
- `dozen_width` — Ancho de la docena en cm
- `dozen_length` — Largo de la docena en cm
- `dozen_weight` — Peso de la docena en kg

---

## Cómo verificar que funciona

### Opción 1: Ver las dimensiones en el carrito (UI)

1. **Abre el navegador** y dirígete a `http://localhost:5173` (o tu URL local)
2. **Navega a un producto** que tenga dimensiones cargadas en el admin
   - En el admin, ve a **Productos** y edita/crea un producto
   - Carga las dimensiones por unidad (peso/alto/ancho/largo)
   - Carga las dimensiones de la docena (opcional, solo si tiene precio mayorista)
3. **Desde la página de producto:**
   - Selecciona **"Por Menor"** y agrega el producto al carrito
   - Abre el carrito (esquina superior derecha)
   - Verás las dimensiones mostradas debajo del nombre/talla, precedidas por un ícono de regla

4. **Para probar Por Mayor:**
   - Regresa a la página de producto
   - Selecciona **"Por Mayor"**
   - Agrega docenas al carrito
   - En el carrito verás las dimensiones de la docena

### Opción 2: Inspeccionar localStorage (Console DevTools)

1. **Abre DevTools** (`F12` o click derecho → Inspeccionar)
2. **Ve a la pestaña "Console"**
3. Ejecuta este comando:
   ```javascript
   JSON.parse(localStorage.getItem('cart'))
   ```
4. **Verás la estructura del carrito con las dimensiones:**
   - Retail: Contiene `dimensions.weight_kg`, `dimensions.height_cm`, etc.
   - Wholesale: Contiene `dimensions.dozen_height`, `dimensions.dozen_width`, etc.

### Opción 3: Usar la función de debugging

1. **En la console de DevTools, ejecuta:**
   ```javascript
   import { logCartDimensions } from '/src/lib/cartDimensions.js'
   const cart = JSON.parse(localStorage.getItem('cart'))
   logCartDimensions(cart)
   ```

2. **Verás un reporte formateado** mostrando:
   - Nombre del producto
   - Tipo (retail/wholesale)
   - Dimensiones guardadas
   - Si tiene dimensiones o no

---

## Estructura esperada en localStorage

### Para un producto por menor (retail):
```json
{
  "id": "prod-1-black-m",
  "productId": "prod-1",
  "type": "retail",
  "name": "Mi Producto",
  "spec": "Black // Sz: M",
  "price": 450,
  "qty": 1,
  "img": "url...",
  "dimensions": {
    "weight_kg": 0.5,
    "height_cm": 30,
    "width_cm": 20,
    "length_cm": 15
  }
}
```

### Para un producto por mayor (wholesale):
```json
{
  "id": "prod-1-wholesale",
  "productId": "prod-1",
  "type": "wholesale",
  "name": "Mi Producto",
  "spec": "Por Mayor // Docena (12 uds) // Talles surtidos",
  "price": 3600,
  "qty": 2,
  "img": "url...",
  "dimensions": {
    "dozen_height": 45,
    "dozen_width": 35,
    "dozen_length": 25,
    "dozen_weight": 6.0
  }
}
```

---

## Checklist de verificación

- [ ] Cargo un producto en el admin con dimensiones por unidad
- [ ] Cargo dimensiones de docena (opcional) en el admin
- [ ] Navego a ese producto en la tienda
- [ ] Agrego 1 unidad por menor al carrito
- [ ] Verifico que veo las dimensiones en el carrito (UI)
- [ ] Verifico localStorage y veo `dimensions.weight_kg`, etc.
- [ ] Limpio el carrito
- [ ] Cambio a "Por Mayor" en la página de producto
- [ ] Agrego 1 docena al carrito
- [ ] Verifico que veo las dimensiones de docena (dozen_height, etc.)
- [ ] Verifico localStorage y veo `dimensions.dozen_*` campos

---

## Notas técnicas

### Archivos modificados
- **`src/context/CartContext.jsx`** — Actualizado `addItem()` y `addWholesaleItem()` para guardar dimensiones
- **`src/components/MiniCart.jsx`** — Actualizado para mostrar dimensiones en UI
- **`src/lib/cartDimensions.js`** — Nueva utilidad para trabajar con dimensiones

### Campos que se guardan
Todos los valores de dimensión vienen del objeto `product` que se obtiene en ProductDetail.jsx de Supabase:
```sql
SELECT id, name, ..., weight_kg, height_cm, width_cm, length_cm, dozen_height, dozen_width, dozen_length, dozen_weight
FROM products
```

Si alguna dimensión es `null` o `0` en la BD, se guardará como tal en el carrito. La función `formatDimensions()` solo mostrará en UI las dimensiones que tengan valores reales.

---

## Próximos pasos (Opcional)

Si necesitas usar estas dimensiones para:
- **Cotizar envío**: Usa `item.dimensions` junto con la API de [Envia.com](https://envia.com) o similar
- **Mostrar en checkout**: Importa `formatDimensions()` desde `src/lib/cartDimensions.js`
- **Enviar a base de datos**: Las dimensiones ya están en `items` del carrito cuando se envía la orden

