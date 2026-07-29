# Limpieza de Campos Redundantes en Dimensiones

## Problema Identificado

La tabla `products` en Supabase tenía campos redundantes que generaban confusión:

### ❌ Campos Eliminados
- `unit_length` — duplicado de `length_cm`
- `unit_width` — duplicado de `width_cm`
- `unit_height` — duplicado de `height_cm`

Estos campos hacían lo mismo que sus contrapartes `*_cm`, causando confusión al cargar datos en el admin y generando inconsistencias.

---

## Estado Final (Limpio) ✅

Después de esta limpieza, la tabla `products` usa **una convención clara y única**:

### Para dimensiones por unidad (retail/menor):
```sql
- weight_kg NUMERIC      — Peso por unidad en kilogramos
- height_cm NUMERIC      — Alto por unidad en centímetros
- width_cm NUMERIC       — Ancho por unidad en centímetros
- length_cm NUMERIC      — Largo por unidad en centímetros
```

### Para dimensiones de la docena (wholesale/mayor):
```sql
- dozen_weight NUMERIC   — Peso de la docena completa (12 unidades)
- dozen_height NUMERIC   — Alto de la docena en centímetros
- dozen_width NUMERIC    — Ancho de la docena en centímetros
- dozen_length NUMERIC   — Largo de la docena en centímetros
```

---

## Cambios en el Código

### ProductFormModal.jsx
✅ Ya usa correctamente los campos estándar:
```javascript
const EMPTY_FORM = {
  // ... otros campos ...
  weight_kg: '', height_cm: '', width_cm: '', length_cm: '',  // ✅ Por unidad
  dozen_height: '', dozen_width: '', dozen_length: '', dozen_weight: '',  // ✅ Por docena
}
```

### ProductDetail.jsx
✅ Query que obtiene solo campos correctos (línea 50):
```javascript
.select('id, name, description, retail_price, wholesale_price, 
        weight_kg, height_cm, width_cm, length_cm, 
        dozen_height, dozen_width, dozen_length, dozen_weight, 
        price_on_request, stock, images, sizes, colors')
```

### CartContext.jsx
✅ Guarda las dimensiones correctas según tipo:
- **retail**: usa `weight_kg`, `height_cm`, `width_cm`, `length_cm`
- **wholesale**: usa `dozen_height`, `dozen_width`, `dozen_length`, `dozen_weight`

---

## Cómo Aplicar la Migración

### En Supabase Dashboard:
1. Ve a **SQL Editor**
2. Crea una nueva query
3. Copia el contenido de `supabase/migration-cleanup-dimensions.sql`
4. Ejecuta la migración

```sql
alter table products drop column if exists unit_length;
alter table products drop column if exists unit_width;
alter table products drop column if exists unit_height;
```

### O desde CLI de Supabase:
```bash
supabase migration new cleanup-dimensions
# Pega el contenido del archivo en la migración
supabase db push
```

---

## Validación Posterior

Después de aplicar la migración, verifica que:

1. **Los campos correctos existen:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name='products' 
   AND column_name LIKE '%height%' OR column_name LIKE '%width%' 
   OR column_name LIKE '%length%' OR column_name LIKE '%weight%';
   ```

2. **Los productos que existían mantienen sus datos:**
   - Los valores en `weight_kg`, `height_cm`, etc. se conservan
   - Los valores en `dozen_*` se conservan
   - Solo se eliminan las columnas `unit_*`

3. **En la aplicación:**
   - Carga un producto en el admin
   - Verifica que aparezcan los campos de dimensión correctamente
   - Agrega al carrito y verifica que se guarden las dimensiones

---

## Beneficios

✅ **Claridad**: Una única convención de nombres
✅ **Consistencia**: No hay duplicación de datos
✅ **Mantenibilidad**: Menos campos = menos confusión en el futuro
✅ **Compatibilidad**: Todo el código ya usa los campos estándar

---

## Campos de Referencia

Para futuro desarrollo, estos son los **únicos campos de dimensión** que deberían existir en la tabla `products`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `weight_kg` | numeric | Peso de **1 unidad** en kg |
| `height_cm` | numeric | Alto de **1 unidad** en cm |
| `width_cm` | numeric | Ancho de **1 unidad** en cm |
| `length_cm` | numeric | Largo de **1 unidad** en cm |
| `dozen_weight` | numeric | Peso de **12 unidades** (1 docena) en kg |
| `dozen_height` | numeric | Alto de **la docena empacada** en cm |
| `dozen_width` | numeric | Ancho de **la docena empacada** en cm |
| `dozen_length` | numeric | Largo de **la docena empacada** en cm |

