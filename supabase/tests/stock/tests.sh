#!/bin/bash
# Pruebas del control de stock sobre products.stock. Cada test imprime PASS/FAIL.
ADMIN="00000000-0000-0000-0000-0000000000a1"
STAFF_PROD="00000000-0000-0000-0000-0000000000b1"   # staff con permiso 'productos'
STAFF_NONE="00000000-0000-0000-0000-0000000000c1"   # staff sin permisos
CUSTOMER="00000000-0000-0000-0000-0000000000d1"
PA=11111111-1111-1111-1111-111111111111
PB=22222222-2222-2222-2222-222222222222
SQL() { docker exec -i stocktest psql -U postgres -v ON_ERROR_STOP=1 -tA "$@"; }
# Ejecuta SQL como usuario autenticado (rol authenticated + claims sub/role)
AS() { local sub=$1; shift; docker exec -i stocktest psql -U postgres -tA -c \
  "SET request.jwt.claim.sub='$sub'; SET request.jwt.claim.role='authenticated'; SET ROLE authenticated; $*" 2>&1 | grep -v -E '^(SET|INSERT 0 [0-9]+|UPDATE [0-9]+|DELETE [0-9]+)$'; }
ANON() { docker exec -i stocktest psql -U postgres -tA -c "SET ROLE anon; $*" 2>&1 | grep -v -E '^SET$'; }
res() { if [ "$2" = "0" ]; then echo "PASS  $1"; else echo "FAIL  $1"; fi; }
expect_err() { echo "$2" | grep -qi "$3"; res "$1  [${3}]" $?; }
val() { SQL -c "$1"; }
stock() { val "SELECT stock FROM products WHERE id='$1'"; }
lote() { val "SELECT id FROM stock_lotes WHERE product_id='$1' AND codigo='$2'"; }
lactual() { val "SELECT cantidad_actual FROM stock_lotes WHERE product_id='$1' AND codigo='$2'"; }

echo "--- 1. Entradas y salidas"
AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','entrada',10)" >/dev/null
[ "$(stock $PA)" = "10" ]; res "entrada 10 -> stock 10" $?
L1=$(lote $PA LOTE-001)
[ -n "$L1" ] && [ "$(lactual $PA LOTE-001)" = "10" ]; res "entrada sin lote crea LOTE-001 con 10" $?
AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',3,'$L1')" >/dev/null
[ "$(stock $PA)" = "7" ]; res "salida 3 -> stock 7 (un solo descuento)" $?
[ "$(val "SELECT saldo FROM stock_movimientos WHERE tipo='salida'")" = "7" ]; res "saldo del movimiento = 7" $?
[ "$(val "SELECT entradas||'/'||salidas FROM stock_control_productos WHERE product_id='$PA'")" = "10/3" ]; res "vista: entradas 10 / salidas 3" $?

echo "--- 2. Stock negativo"
OUT=$(AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',8,'$L1')")
expect_err "salida 8 > 7 rechazada" "$OUT" "Stock insuficiente"
[ "$(stock $PA)" = "7" ]; res "stock intacto (7)" $?
OUT=$(AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',0,'$L1')")
expect_err "cantidad 0 rechazada" "$OUT" "check"
OUT=$(AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',4,'$L1'),('$PA','salida',4,'$L1')")
expect_err "lote 4+4 > 7 rechazado completo" "$OUT" "Stock insuficiente"
[ "$(stock $PA)" = "7" ]; res "lote atómico: stock sigue 7" $?

echo "--- 3. Dos salidas simultáneas (7 disponibles; 5 + 5)"
( docker exec -i stocktest psql -U postgres -tA -c "SET request.jwt.claim.sub='$ADMIN'; SET request.jwt.claim.role='authenticated'; SET ROLE authenticated; BEGIN; INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',5,'$L1'); SELECT pg_sleep(4); COMMIT;" > /tmp/s1.out 2>&1 ) &
sleep 1
docker exec -i stocktest psql -U postgres -tA -c "SET request.jwt.claim.sub='$ADMIN'; SET request.jwt.claim.role='authenticated'; SET ROLE authenticated; INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',5,'$L1');" > /tmp/s2.out 2>&1
wait
expect_err "segunda salida simultánea rechazada" "$(cat /tmp/s2.out)" "Stock insuficiente"
[ "$(stock $PA)" = "2" ]; res "stock final 2, nunca negativo" $?

echo "--- 4. products.stock se edita a mano desde el panel"
AS $ADMIN "UPDATE products SET stock=9 WHERE id='$PA'" >/dev/null
[ "$(stock $PA)" = "9" ]; res "UPDATE stock desde el panel permitido (2 -> 9)" $?
L0=$(lote $PA VARIOS)
[ "$(lactual $PA VARIOS)" = "7" ]; res "edición manual 2 -> 9 = ajuste +7 en VARIOS (no en LOTE-000)" $?
[ -z "$(lote $PA LOTE-000)" ]; res "el producto NO tiene LOTE-000 (la tanda vieja no se toca)" $?
[ "$(val "SELECT motivo||'/'||tipo||'/'||cantidad FROM stock_movimientos WHERE lote_id='$L0'")" = "ajuste/entrada/7" ]; res "queda registrado como movimiento 'ajuste'" $?
AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',2,'$L1')" >/dev/null
[ "$(stock $PA)" = "7" ]; res "una salida parte del stock editado (9 -> 7)" $?
OUT=$(AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',8,'$L0')")
expect_err "salida mayor al stock editado rechazada" "$OUT" "Stock insuficiente"
TMP=$(val "SELECT id FROM stock_movimientos WHERE tipo='salida' AND cantidad=2")
AS $ADMIN "UPDATE stock_movimientos SET anulado_at=now() WHERE id='$TMP'" >/dev/null
SQL -c "UPDATE products SET stock=2 WHERE id='$PA'" >/dev/null   # vuelve al estado que esperan las secciones siguientes
AS $ADMIN "INSERT INTO products(name,stock) VALUES ('Nuevo',50)" >/dev/null
[ "$(val "SELECT stock FROM products WHERE name='Nuevo'")" = "50" ]; res "producto nuevo puede nacer con stock inicial" $?
AS $ADMIN "UPDATE products SET name='Remera A2' WHERE id='$PA'" >/dev/null
[ "$(val "SELECT name FROM products WHERE id='$PA'")" = "Remera A2" ]; res "editar otros campos sigue funcionando" $?

echo "--- 5. Anulación (no se borra)"
MID=$(val "SELECT id FROM stock_movimientos WHERE tipo='salida' AND cantidad=3")
AS $ADMIN "UPDATE stock_movimientos SET anulado_at=now() WHERE id='$MID'" >/dev/null
[ "$(stock $PA)" = "5" ]; res "anular salida 3 devuelve stock (2 -> 5)" $?
OUT=$(AS $ADMIN "UPDATE stock_movimientos SET anulado_at=now() WHERE id='$MID'")
expect_err "no se anula dos veces" "$OUT" "ya está anulado"
OUT=$(AS $ADMIN "UPDATE stock_movimientos SET cantidad=1 WHERE id='$MID'")
expect_err "no se edita un movimiento" "$OUT" "solo se anula\|ya está anulado"
OUT=$(AS $ADMIN "DELETE FROM stock_movimientos WHERE id='$MID'")
expect_err "DELETE rechazado" "$OUT" "permission denied\|no se borran"
EID=$(val "SELECT id FROM stock_movimientos WHERE product_id='$PA' AND motivo='ingreso' AND cantidad=10")
OUT=$(AS $ADMIN "UPDATE stock_movimientos SET anulado_at=now() WHERE id='$EID'")
expect_err "anular entrada que dejaría stock negativo rechazado (5 - 10)" "$OUT" "Stock insuficiente"
[ "$(val "SELECT entradas||'/'||salidas FROM stock_control_productos WHERE product_id='$PA'")" = "17/12" ]; res "vista ignora anulados (17/12: incluye los 2 ajustes de 7)" $?

echo "--- 6. Vista: costo, margen, nivel (precio por docena = retail_price)"
AS $ADMIN "UPDATE product_costs SET cost_price=60.4, cost_price_rounded=60 WHERE product_id='$PA'" >/dev/null
[ "$(val "SELECT margen||'/'||margen_pct||'/'||valor_costo||'/'||valor_venta FROM stock_control_productos WHERE product_id='$PA'")" = "40/40.0/300/500" ]; res "margen 40 (40%), valor costo 300, valor venta 500 (stock 5)" $?
AS $ADMIN "UPDATE product_costs SET cost_price_rounded=NULL WHERE product_id='$PA'" >/dev/null
[ "$(val "SELECT costo_efectivo FROM stock_control_productos WHERE product_id='$PA'")" = "60.4" ]; res "sin redondeado usa cost_price" $?
[ "$(val "SELECT coalesce(margen::text,'NULL')||'/'||coalesce(valor_costo::text,'NULL')||'/'||coalesce(valor_venta::text,'NULL') FROM stock_control_productos WHERE product_id='$PB'")" = "NULL/NULL/NULL" ]; res "sin precio ni costo -> NULL (no 0 ni NaN)" $?
[ "$(val "SELECT nivel FROM stock_control_productos WHERE product_id='$PB'")" = "agotado" ]; res "stock 0 -> agotado" $?
[ "$(val "SELECT nivel FROM stock_control_productos WHERE product_id='$PA'")" = "bajo" ]; res "stock 5 -> bajo (umbral 5)" $?
OUT=$(AS $ADMIN "INSERT INTO product_costs(product_id,cost_price) VALUES ('$PB',-1)")
expect_err "costo negativo rechazado" "$OUT" "check"

echo "--- 7. Seguridad"
OUT=$(ANON "SELECT count(*) FROM product_costs"); expect_err "anon no lee costos" "$OUT" "permission denied"
OUT=$(ANON "SELECT count(*) FROM stock_movimientos"); expect_err "anon no lee movimientos" "$OUT" "permission denied"
OUT=$(ANON "SELECT count(*) FROM stock_control_productos"); expect_err "anon no lee la vista" "$OUT" "permission denied"
OUT=$(ANON "SELECT name FROM products LIMIT 1"); echo "$OUT" | grep -q "Remera"; res "anon sigue leyendo products (catálogo)" $?
OUT=$(ANON "SELECT cost_price FROM products"); expect_err "products no tiene columnas de costo" "$OUT" "does not exist"
[ "$(AS $CUSTOMER "SELECT count(*) FROM product_costs")" = "0" ]; res "cliente logueado ve 0 costos" $?
OUT=$(AS $CUSTOMER "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','entrada',1)")
expect_err "cliente no registra movimientos" "$OUT" "row-level security"
OUT=$(AS $STAFF_NONE "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','entrada',1)")
expect_err "staff sin permiso no registra movimientos" "$OUT" "row-level security"
[ "$(AS $STAFF_PROD "SELECT count(*) FROM product_costs")" = "$(val "SELECT count(*) FROM product_costs")" ]; res "staff con 'productos' ve todos los costos" $?
OUT=$(AS $STAFF_PROD "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','entrada',1)")
expect_err "staff con 'productos' (sin 'stock') no mueve stock" "$OUT" "row-level security"
SQL -c "INSERT INTO admin_permissions VALUES ('$STAFF_NONE','stock')" >/dev/null
AS $STAFF_NONE "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','entrada',1)" >/dev/null
[ "$(stock $PA)" = "6" ]; res "staff con permiso 'stock' sí registra (5 -> 6)" $?

echo "--- 8. Código de producto"
AS $ADMIN "UPDATE products SET code='  rem-001 ' WHERE id='$PA'" >/dev/null
[ "$(val "SELECT code FROM products WHERE id='$PA'")" = "REM-001" ]; res "código se guarda sin espacios y en mayúsculas" $?
OUT=$(AS $ADMIN "UPDATE products SET code='rem-001' WHERE id='$PB'")
expect_err "código repetido (aunque cambie mayúsculas) rechazado" "$OUT" "products_code_key"
AS $ADMIN "UPDATE products SET code='   ' WHERE id='$PB'" >/dev/null
[ "$(val "SELECT coalesce(code,'NULL') FROM products WHERE id='$PB'")" = "NULL" ]; res "código vacío -> NULL" $?
SQL -c "UPDATE products SET code=NULL WHERE name='Nuevo'" >/dev/null
AS $ADMIN "INSERT INTO products(name,code) VALUES ('Otro1',NULL),('Otro2','')" >/dev/null
[ "$(val "SELECT count(*) FROM products WHERE name LIKE 'Otro%' AND code IS NULL")" = "2" ]; res "varios productos sin código conviven" $?
[ "$(val "SELECT codigo FROM stock_control_productos WHERE product_id='$PA'")" = "REM-001" ]; res "la vista de Control expone el código" $?

echo "--- 9. Sincronía products <-> product_costs"
[ "$(val "SELECT count(*) FROM products p WHERE NOT EXISTS (SELECT 1 FROM product_costs c WHERE c.product_id=p.id)")" = "0" ]; res "todo producto existente tiene su fila de costos (backfill)" $?
AS $ADMIN "INSERT INTO products(name) VALUES ('Sincro')" >/dev/null
[ "$(val "SELECT count(*) FROM product_costs c JOIN products p ON p.id=c.product_id WHERE p.name='Sincro' AND c.cost_price IS NULL AND c.cost_price_rounded IS NULL")" = "1" ]; res "producto nuevo crea su fila de costos vacía" $?
SID=$(val "SELECT id FROM products WHERE name='Sincro'")
AS $ADMIN "INSERT INTO product_costs(product_id,cost_price,cost_price_rounded) VALUES ('$SID',50,60) ON CONFLICT (product_id) DO UPDATE SET cost_price=EXCLUDED.cost_price, cost_price_rounded=EXCLUDED.cost_price_rounded" >/dev/null
[ "$(val "SELECT cost_price||'/'||cost_price_rounded FROM product_costs WHERE product_id='$SID'")" = "50/60" ]; res "upsert guarda el costo sobre la misma fila (50/60)" $?
[ "$(val "SELECT count(*) FROM product_costs WHERE product_id='$SID'")" = "1" ]; res "sigue habiendo una sola fila por producto" $?
OUT=$(AS $ADMIN "INSERT INTO product_costs(product_id) VALUES ('99999999-9999-9999-9999-999999999999')")
expect_err "no se puede crear costo de un producto inexistente" "$OUT" "foreign key"
SQL -c "DELETE FROM products WHERE id='$SID'" >/dev/null
[ "$(val "SELECT count(*) FROM product_costs WHERE product_id='$SID'")" = "0" ]; res "al borrar el producto se borra su costo" $?

echo "--- 10. Lotes (tandas)"
PA_STOCK=$(stock $PA)
[ "$(val "SELECT coalesce(sum(cantidad_actual),0) FROM stock_lotes WHERE product_id='$PA'")" = "$PA_STOCK" ]; res "products.stock = suma de lotes del producto ($PA_STOCK)" $?
[ "$(val "SELECT count(*) FROM products p WHERE p.stock <> coalesce((SELECT sum(cantidad_actual) FROM stock_lotes l WHERE l.product_id=p.id),0)")" = "0" ]; res "ningún producto desincronizado con sus lotes" $?
OUT=$(AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','salida',1)")
expect_err "venta sin lote rechazada" "$OUT" "Elige el lote"
OUT=$(AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PB','salida',1,'$L1')")
expect_err "venta con lote de OTRO producto rechazada" "$OUT" "no existe para este producto"

# Ingreso de tanda: mismo nombre en dos productos, una transacción
NEXT=$(AS $ADMIN "SELECT stock_siguiente_codigo_lote()")
SB=$(stock $PB)
OUT=$(AS $ADMIN "SELECT stock_registrar_ingreso(NULL, CURRENT_DATE, 'tanda de prueba', '[{\"product_id\":\"$PA\",\"cantidad\":4},{\"product_id\":\"$PB\",\"cantidad\":2}]'::jsonb)")
[ "$OUT" = "$NEXT" ]; res "ingreso usa el nombre por defecto sugerido ($NEXT)" $?
[ "$(lactual $PA $NEXT)/$(lactual $PB $NEXT)" = "4/2" ]; res "ingreso crea un lote por producto con el mismo nombre (4 y 2)" $?
[ "$(val "SELECT cantidad_inicial FROM stock_lotes WHERE product_id='$PA' AND codigo='$NEXT'")" = "4" ]; res "cantidad_inicial queda fija en 4" $?
[ "$(stock $PB)" = "$((SB+2))" ]; res "ingreso suma al stock del producto" $?
AS $ADMIN "SELECT stock_registrar_ingreso('  tanda marzo ', CURRENT_DATE, NULL, '[{\"product_id\":\"$PA\",\"cantidad\":3}]'::jsonb)" >/dev/null
[ "$(lactual $PA 'TANDA MARZO')" = "3" ]; res "nombre editable: se guarda sin espacios y en mayúsculas" $?
OUT=$(AS $ADMIN "SELECT stock_registrar_ingreso('tanda marzo', CURRENT_DATE, NULL, '[{\"product_id\":\"$PA\",\"cantidad\":1}]'::jsonb)")
expect_err "mismo nombre de lote en el mismo producto rechazado" "$OUT" "stock_lotes_prod_codigo_key"
OUT=$(AS $ADMIN "SELECT stock_registrar_ingreso(NULL, CURRENT_DATE, NULL, '[]'::jsonb)")
expect_err "ingreso sin productos rechazado" "$OUT" "al menos un producto"
OUT=$(AS $ADMIN "SELECT stock_registrar_ingreso(NULL, CURRENT_DATE, NULL, '[{\"product_id\":\"$PA\",\"cantidad\":0}]'::jsonb)")
expect_err "ingreso con cantidad 0 rechazado" "$OUT" "check"
[ "$(val "SELECT count(*) FROM stock_lotes WHERE product_id='$PA' AND cantidad_inicial=0")" = "0" ]; res "ingreso fallido no deja lotes sueltos" $?

# Venta manual por lote elegido
LN=$(lote $PA "$NEXT")
SA=$(stock $PA)
AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',3,'$LN')" >/dev/null
[ "$(lactual $PA $NEXT)" = "1" ] && [ "$(stock $PA)" = "$((SA-3))" ]; res "venta de 3 descuenta del lote elegido (4 -> 1) y del stock" $?
[ "$(val "SELECT motivo FROM stock_movimientos WHERE lote_id='$LN' AND tipo='salida'")" = "venta" ]; res "la salida queda con motivo 'venta'" $?
OUT=$(AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',2,'$LN')")
expect_err "no se vende más de lo que tiene el lote" "$OUT" "Stock insuficiente en el lote"
IID=$(val "SELECT id FROM stock_movimientos WHERE lote_id='$LN' AND motivo='ingreso'")
OUT=$(AS $ADMIN "UPDATE stock_movimientos SET anulado_at=now() WHERE id='$IID'")
expect_err "no se anula el ingreso de un lote ya vendido" "$OUT" "ya no tiene esas docenas"
VID=$(val "SELECT id FROM stock_movimientos WHERE lote_id='$LN' AND tipo='salida'")
AS $ADMIN "UPDATE stock_movimientos SET anulado_at=now() WHERE id='$VID'" >/dev/null
[ "$(lactual $PA $NEXT)" = "4" ]; res "anular la venta devuelve las docenas a SU lote (1 -> 4)" $?
AS $ADMIN "UPDATE stock_movimientos SET anulado_at=now() WHERE id='$IID'" >/dev/null
[ "$(lactual $PA $NEXT)" = "0" ] && [ "$(val "SELECT cantidad_inicial FROM stock_lotes WHERE id='$LN'")" = "4" ]; res "anular el ingreso deja el lote en 0 (inicial sigue 4)" $?

# Edición manual de stock que LOTE-000 no puede absorber: rechazada y sin cambios
S0=$(stock $PA); L0A=$(lactual $PA VARIOS)
OUT=$(AS $ADMIN "UPDATE products SET stock=stock-$((L0A+1)) WHERE id='$PA'")
expect_err "bajar a mano más de lo que tiene VARIOS rechazado" "$OUT" "Stock insuficiente en el lote VARIOS"
[ "$(stock $PA)" = "$S0" ]; res "edición manual rechazada deja el stock intacto" $?
AS $ADMIN "INSERT INTO products(name,stock) VALUES ('ConStock',8)" >/dev/null
CS=$(val "SELECT id FROM products WHERE name='ConStock'")
[ "$(lactual $CS VARIOS)" = "8" ] && [ "$(val "SELECT cantidad_inicial FROM stock_lotes WHERE product_id='$CS'")" = "8" ]; res "producto creado fuera de lotes con stock 8 nace en VARIOS (8/8)" $?
[ "$(val "SELECT motivo||'/'||saldo FROM stock_movimientos WHERE product_id='$CS'")" = "ajuste/8" ]; res "su stock inicial queda registrado como ajuste (saldo 8)" $?

# Seguridad de lotes
OUT=$(AS $ADMIN "UPDATE stock_lotes SET cantidad_actual=999 WHERE id='$LN'")
expect_err "cantidad_actual no se edita desde el cliente" "$OUT" "permission denied"
OUT=$(AS $ADMIN "UPDATE stock_lotes SET cantidad_inicial=999 WHERE id='$LN'")
expect_err "cantidad_inicial no se edita desde el cliente" "$OUT" "permission denied"
OUT=$(AS $ADMIN "INSERT INTO stock_lotes(product_id,codigo,cantidad_inicial,cantidad_actual) VALUES ('$PA','TRUCO',5,5)")
expect_err "no se puede crear un lote con cantidad_actual a mano" "$OUT" "permission denied"
OUT=$(AS $ADMIN "DELETE FROM stock_lotes WHERE id='$LN'")
expect_err "los lotes no se borran" "$OUT" "permission denied"
OUT=$(AS $ADMIN "SELECT stock_aplicar_delta('$PA', 100)")
expect_err "stock_aplicar_delta no es invocable por clientes" "$OUT" "permission denied"
OUT=$(AS $ADMIN "UPDATE stock_lotes SET codigo='otro' WHERE id='$LN'")
expect_err "el nombre no se edita directo en stock_lotes" "$OUT" "permission denied"
AS $ADMIN "SELECT stock_renombrar_tanda('$NEXT', 'tanda-renombrada')" >/dev/null
[ "$(lote $PA TANDA-RENOMBRADA)" = "$LN" ] && [ "$(lote $PB TANDA-RENOMBRADA)" != "" ]; res "renombrar el lote (en mayúsculas) lo cambia en todos sus productos, mismo id" $?
OUT=$(ANON "SELECT count(*) FROM stock_lotes"); expect_err "anon no lee lotes" "$OUT" "permission denied"
[ "$(AS $CUSTOMER "SELECT count(*) FROM stock_lotes")" = "0" ]; res "cliente logueado ve 0 lotes" $?
OUT=$(AS $CUSTOMER "SELECT stock_registrar_ingreso(NULL, CURRENT_DATE, NULL, '[{\"product_id\":\"$PA\",\"cantidad\":1}]'::jsonb)")
expect_err "un cliente no ingresa tandas" "$OUT" "permission denied"
OUT=$(ANON "SELECT stock_registrar_ingreso(NULL, CURRENT_DATE, NULL, '[{\"product_id\":\"$PA\",\"cantidad\":1}]'::jsonb)")
expect_err "anon no ingresa tandas" "$OUT" "permission denied"
[ "$(val "SELECT count(*) FROM products p WHERE p.stock <> coalesce((SELECT sum(cantidad_actual) FROM stock_lotes l WHERE l.product_id=p.id),0)")" = "0" ]; res "ningún producto desincronizado con sus lotes (antes de corregir)" $?

echo "--- 11. Corregir la cantidad de un lote (sin perder ventas)"
# Tanda nueva de 10 en PB, se venden 4 → actual 6. Se descubre que eran 12.
AS $ADMIN "SELECT stock_registrar_ingreso('tanda fix', CURRENT_DATE, NULL, '[{\"product_id\":\"$PB\",\"cantidad\":10}]'::jsonb)" >/dev/null
LF=$(lote $PB 'TANDA FIX')
AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PB','salida',4,'$LF')" >/dev/null
VENTA_ID=$(val "SELECT id FROM stock_movimientos WHERE lote_id='$LF' AND motivo='venta'")
SB=$(stock $PB)
AS $ADMIN "SELECT stock_corregir_lote('$LF', 12, NULL)" >/dev/null
[ "$(val "SELECT cantidad_inicial||'/'||cantidad_actual FROM stock_lotes WHERE id='$LF'")" = "12/8" ]; res "subir 10 -> 12 con 4 vendidas: inicial 12, actual 6 -> 8 (no se pisa)" $?
[ "$(stock $PB)" = "$((SB+2))" ]; res "el stock del producto sube por la diferencia (+2)" $?
[ "$(val "SELECT count(*) FROM stock_lotes WHERE id='$LF'")" = "1" ] && [ "$(val "SELECT count(*) FROM stock_movimientos WHERE id='$VENTA_ID' AND lote_id='$LF' AND anulado_at IS NULL")" = "1" ]; res "el lote conserva su id y la venta sigue vinculada y vigente" $?
[ "$(val "SELECT motivo||'/'||tipo||'/'||cantidad FROM stock_movimientos WHERE lote_id='$LF' AND nota LIKE 'Corrección%' ")" = "ajuste/entrada/2" ]; res "queda registrado en el Kardex como ajuste +2 con su nota" $?
[ -n "$(val "SELECT user_id FROM stock_movimientos WHERE lote_id='$LF' AND nota LIKE 'Corrección%'")" ]; res "el ajuste guarda quién lo hizo (user_id)" $?

# Bajar sin pasar lo vendido: ya salieron 4 → mínimo 4
AS $ADMIN "SELECT stock_corregir_lote('$LF', 5, 'se contó mal')" >/dev/null
[ "$(val "SELECT cantidad_inicial||'/'||cantidad_actual FROM stock_lotes WHERE id='$LF'")" = "5/1" ]; res "bajar 12 -> 5 (>= 4 vendidas): inicial 5, actual 1" $?
[ "$(val "SELECT nota FROM stock_movimientos WHERE lote_id='$LF' AND motivo='ajuste' AND tipo='salida'")" = "se contó mal" ]; res "la nota del usuario se guarda" $?
AS $ADMIN "SELECT stock_corregir_lote('$LF', 4, NULL)" >/dev/null
[ "$(lactual $PB 'TANDA FIX')" = "0" ]; res "bajar justo hasta lo vendido (4): actual 0, sin negativos" $?

# Bajar por debajo de lo vendido: rechazado y sin cambios
SB=$(stock $PB)
OUT=$(AS $ADMIN "SELECT stock_corregir_lote('$LF', 3, NULL)")
expect_err "bajar a 3 (< 4 vendidas) rechazado" "$OUT" "No puedes cargar menos de 4"
[ "$(val "SELECT cantidad_inicial||'/'||cantidad_actual FROM stock_lotes WHERE id='$LF'")" = "4/0" ] && [ "$(stock $PB)" = "$SB" ]; res "rechazo sin efectos: lote y stock intactos" $?
OUT=$(AS $ADMIN "SELECT stock_corregir_lote('$LF', 4, NULL)")
expect_err "misma cantidad rechazada" "$OUT" "la misma"
OUT=$(AS $ADMIN "SELECT stock_corregir_lote('$LF', -1, NULL)")
expect_err "cantidad negativa rechazada" "$OUT" "mayor o igual a 0"
OUT=$(AS $ADMIN "SELECT stock_corregir_lote('99999999-9999-9999-9999-999999999999', 5, NULL)")
expect_err "lote inexistente rechazado" "$OUT" "no existe"
[ "$(val "SELECT count(*) FROM stock_movimientos WHERE lote_id='$LF' AND motivo='venta' AND anulado_at IS NULL")" = "1" ]; res "las ventas del lote siguen intactas tras todas las correcciones" $?

# Seguridad
OUT=$(AS $STAFF_PROD "SELECT stock_corregir_lote('$LF', 9, NULL)")
expect_err "staff sin permiso 'stock' no corrige" "$OUT" "permission denied"
OUT=$(AS $CUSTOMER "SELECT stock_corregir_lote('$LF', 9, NULL)")
expect_err "cliente no corrige" "$OUT" "permission denied"
OUT=$(ANON "SELECT stock_corregir_lote('$LF', 9, NULL)")
expect_err "anon no corrige" "$OUT" "permission denied"

# Concurrencia: la corrección (4 -> 6 ... con lote de 5) y una venta que se pisan
AS $ADMIN "SELECT stock_registrar_ingreso('tanda conc', CURRENT_DATE, NULL, '[{\"product_id\":\"$PA\",\"cantidad\":5}]'::jsonb)" >/dev/null
LC=$(lote $PA 'TANDA CONC')
( docker exec -i stocktest psql -U postgres -tA -c "SET request.jwt.claim.sub='$ADMIN'; SET request.jwt.claim.role='authenticated'; SET ROLE authenticated; BEGIN; SELECT stock_corregir_lote('$LC', 3, NULL); SELECT pg_sleep(4); COMMIT;" > /tmp/c1.out 2>&1 ) &
sleep 1
docker exec -i stocktest psql -U postgres -tA -c "SET request.jwt.claim.sub='$ADMIN'; SET request.jwt.claim.role='authenticated'; SET ROLE authenticated; INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',5,'$LC');" > /tmp/c2.out 2>&1
wait
expect_err "venta de 5 mientras se corrige a 3: la venta espera y se rechaza" "$(cat /tmp/c2.out)" "Stock insuficiente en el lote"
[ "$(val "SELECT cantidad_inicial||'/'||cantidad_actual FROM stock_lotes WHERE id='$LC'")" = "3/3" ]; res "resultado consistente tras la carrera: lote 3/3, sin negativos" $?

# Invariantes finales
[ "$(val "SELECT count(*) FROM products p WHERE p.stock <> coalesce((SELECT sum(cantidad_actual) FROM stock_lotes l WHERE l.product_id=p.id),0)")" = "0" ]; res "al final: ningún producto desincronizado con sus lotes" $?
[ "$(val "SELECT count(*) FROM (SELECT l.id FROM stock_lotes l LEFT JOIN stock_movimientos m ON m.lote_id=l.id AND m.anulado_at IS NULL WHERE l.codigo <> 'LOTE-000' GROUP BY l.id, l.cantidad_actual HAVING l.cantidad_actual <> COALESCE(SUM(CASE m.tipo WHEN 'entrada' THEN m.cantidad ELSE -m.cantidad END),0)) x")" = "0" ]; res "cada lote (salvo LOTE-000) = suma de sus movimientos vigentes" $?

echo "--- 12. Lotes como entidad: crear vacío, cargar productos, eliminar (desde Productos)"
[ "$(val "SELECT count(*) FROM stock_lotes l WHERE NOT EXISTS (SELECT 1 FROM stock_tandas t WHERE t.codigo = l.codigo)")" = "0" ]; res "todo nombre de lote en stock_lotes tiene su lote (FK)" $?
[ "$(val "SELECT count(*) FROM stock_tandas WHERE codigo='LOTE-000'")" = "0" ] && [ "$(val "SELECT count(*) FROM stock_tandas WHERE codigo='VARIOS' AND es_sistema")" = "1" ]; res "VARIOS existe como lote del sistema (y en esta base de prueba no hay LOTE-000)" $?

# Crear un lote vacío con nombre por defecto
SUG=$(AS $ADMIN "SELECT stock_siguiente_codigo_lote()")
CRE=$(AS $ADMIN "SELECT codigo FROM stock_crear_tanda(NULL, CURRENT_DATE, 'lote de prueba')")
[ "$CRE" = "$SUG" ]; res "crear lote sin nombre usa el sugerido ($SUG)" $?
[ "$(val "SELECT count(*) FROM stock_lotes WHERE codigo='$CRE'")" = "0" ]; res "el lote nace vacío (sin productos)" $?
SUG2=$(AS $ADMIN "SELECT stock_siguiente_codigo_lote()")
[ "$SUG2" != "$SUG" ]; res "el siguiente nombre sugerido cuenta también los lotes vacíos ($SUG -> $SUG2)" $?
CRE2=$(AS $ADMIN "SELECT codigo FROM stock_crear_tanda('  mi lote  ', NULL, NULL)")
[ "$CRE2" = "MI LOTE" ]; res "nombre propio: sin espacios y en mayúsculas" $?
OUT=$(AS $ADMIN "SELECT codigo FROM stock_crear_tanda('mi lote', NULL, NULL)")
expect_err "nombre de lote repetido rechazado" "$OUT" "stock_tandas_codigo_key"

# Cargar productos al lote: existente y nuevo (nace con stock 0 y entra por el lote)
SA=$(stock $PA)
AS $ADMIN "SELECT stock_agregar_a_tanda('$CRE', '$PA', 6, NULL)" >/dev/null
[ "$(val "SELECT cantidad_inicial||'/'||cantidad_actual FROM stock_lotes WHERE product_id='$PA' AND codigo='$CRE'")" = "6/6" ]; res "agregar producto existente: lote 6/6" $?
[ "$(stock $PA)" = "$((SA+6))" ]; res "suma 6 al stock del producto" $?
[ "$(val "SELECT motivo||'/'||tipo FROM stock_movimientos WHERE lote_id=(SELECT id FROM stock_lotes WHERE product_id='$PA' AND codigo='$CRE')")" = "ingreso/entrada" ]; res "queda el movimiento de ingreso en el Kardex" $?
AS $ADMIN "INSERT INTO products(name,stock) VALUES ('Prod en lote',0)" >/dev/null
PN=$(val "SELECT id FROM products WHERE name='Prod en lote'")
AS $ADMIN "SELECT stock_agregar_a_tanda('$CRE', '$PN', 3, NULL)" >/dev/null
[ "$(stock $PN)" = "3" ] && [ "$(val "SELECT count(*) FROM stock_lotes WHERE product_id='$PN'")" = "1" ] && [ "$(lactual $PN $CRE)" = "3" ]; res "producto nuevo (stock 0) entra SOLO por el lote elegido: 3, sin crear VARIOS" $?
[ "$(val "SELECT count(*) FROM stock_lotes WHERE codigo='$CRE'")" = "2" ]; res "el lote ahora tiene 2 productos" $?
OUT=$(AS $ADMIN "SELECT stock_agregar_a_tanda('$CRE', '$PA', 2, NULL)")
expect_err "el mismo producto no se agrega dos veces al lote" "$OUT" "ya está en el lote"
OUT=$(AS $ADMIN "SELECT stock_agregar_a_tanda('$CRE', '$PB', 0, NULL)")
expect_err "cantidad 0 rechazada" "$OUT" "mayor a 0"
OUT=$(AS $ADMIN "SELECT stock_agregar_a_tanda('NO EXISTE', '$PB', 2, NULL)")
expect_err "lote inexistente rechazado" "$OUT" "no existe"
OUT=$(AS $ADMIN "SELECT stock_agregar_a_tanda('$CRE', '99999999-9999-9999-9999-999999999999', 2, NULL)")
expect_err "producto inexistente rechazado" "$OUT" "foreign key"

# Eliminar
AS $ADMIN "SELECT stock_eliminar_tanda('MI LOTE')" >/dev/null
[ "$(val "SELECT count(*) FROM stock_tandas WHERE codigo='MI LOTE'")" = "0" ]; res "un lote vacío se puede eliminar" $?
OUT=$(AS $ADMIN "SELECT stock_eliminar_tanda('MI LOTE')")
expect_err "eliminar un lote inexistente rechazado" "$OUT" "no existe"

# Permisos: lo hace quien tiene 'productos' o 'stock'; clientes y anónimos no
OUT=$(AS $STAFF_PROD "SELECT codigo FROM stock_crear_tanda('LOTE STAFF', NULL, NULL)")
echo "$OUT" | grep -q "LOTE STAFF"; res "staff con 'productos' (sin 'stock') puede crear un lote" $?
AS $STAFF_PROD "SELECT stock_agregar_a_tanda('LOTE STAFF', '$PB', 2, NULL)" >/dev/null
[ "$(lactual $PB 'LOTE STAFF')" = "2" ]; res "staff con 'productos' carga un producto al lote" $?
[ "$(AS $STAFF_PROD "SELECT count(*) FROM stock_lotes WHERE codigo='LOTE STAFF'")" = "1" ]; res "staff con 'productos' ve los lotes (para las tarjetas de Productos)" $?
OUT=$(AS $STAFF_PROD "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PB','entrada',1)")
expect_err "...pero sigue sin poder mover stock directo en Kardex" "$OUT" "row-level security"
OUT=$(AS $CUSTOMER "SELECT codigo FROM stock_crear_tanda('LOTE X', NULL, NULL)")
expect_err "cliente no crea lotes" "$OUT" "permission denied"
OUT=$(AS $CUSTOMER "SELECT stock_agregar_a_tanda('LOTE STAFF', '$PB', 1, NULL)")
expect_err "cliente no carga productos a un lote" "$OUT" "permission denied"
OUT=$(ANON "SELECT codigo FROM stock_crear_tanda('LOTE X', NULL, NULL)")
expect_err "anon no crea lotes" "$OUT" "permission denied"
[ "$(AS $CUSTOMER "SELECT count(*) FROM stock_tandas")" = "0" ]; res "cliente ve 0 lotes" $?
OUT=$(ANON "SELECT count(*) FROM stock_tandas"); expect_err "anon no lee lotes (cabecera)" "$OUT" "permission denied"
OUT=$(AS $ADMIN "INSERT INTO stock_tandas(codigo) VALUES ('DIRECTO')")
expect_err "no se crea un lote con INSERT directo" "$OUT" "permission denied"
OUT=$(AS $ADMIN "UPDATE stock_tandas SET codigo='X' WHERE codigo='LOTE-000'")
expect_err "no se edita un lote con UPDATE directo" "$OUT" "permission denied"
OUT=$(AS $ADMIN "DELETE FROM stock_tandas WHERE codigo='LOTE-000'")
expect_err "no se borra un lote con DELETE directo" "$OUT" "permission denied"

# Invariantes finales
[ "$(val "SELECT count(*) FROM products p WHERE p.stock <> coalesce((SELECT sum(cantidad_actual) FROM stock_lotes l WHERE l.product_id=p.id),0)")" = "0" ]; res "al final: ningún producto desincronizado con sus lotes" $?
[ "$(val "SELECT count(*) FROM stock_lotes l WHERE NOT EXISTS (SELECT 1 FROM stock_tandas t WHERE t.codigo = l.codigo)")" = "0" ]; res "al final: ninguna fila de producto apunta a un lote inexistente" $?

echo "--- 13. VARIOS: el lote de los productos sin lote (no se elimina) y eliminar lotes con productos"
# VARIOS protegido
OUT=$(AS $ADMIN "SELECT stock_eliminar_tanda('VARIOS')")
expect_err "VARIOS no se puede eliminar (función)" "$OUT" "es del sistema"
OUT=$(AS $ADMIN "SELECT stock_renombrar_tanda('VARIOS', 'OTRO')")
expect_err "VARIOS no se puede renombrar (función)" "$OUT" "es del sistema"
OUT=$(SQL -c "DELETE FROM stock_tandas WHERE codigo='VARIOS'" 2>&1)
expect_err "VARIOS no se puede borrar ni con SQL directo (trigger)" "$OUT" "es del sistema"
OUT=$(SQL -c "UPDATE stock_tandas SET es_sistema=false WHERE codigo='VARIOS'" 2>&1)
expect_err "VARIOS no deja de ser del sistema" "$OUT" "es del sistema"
OUT=$(AS $ADMIN "SELECT codigo FROM stock_crear_tanda('varios', NULL, NULL)")
expect_err "no se puede crear otro lote llamado VARIOS" "$OUT" "stock_tandas_codigo_key"

# Producto creado fuera de lotes con stock: va a VARIOS, no a LOTE-000
AS $ADMIN "INSERT INTO products(name,stock) VALUES ('Suelto',5)" >/dev/null
PS=$(val "SELECT id FROM products WHERE name='Suelto'")
[ "$(val "SELECT string_agg(codigo||':'||cantidad_actual, ',') FROM stock_lotes WHERE product_id='$PS'")" = "VARIOS:5" ]; res "producto creado fuera de lotes con stock 5 -> VARIOS:5" $?
AS $ADMIN "UPDATE products SET stock=9 WHERE id='$PS'" >/dev/null
[ "$(lactual $PS VARIOS)" = "9" ]; res "editar su stock a mano (5 -> 9) suma en VARIOS" $?
AS $ADMIN "UPDATE products SET stock=6 WHERE id='$PS'" >/dev/null
[ "$(lactual $PS VARIOS)" = "6" ]; res "...y bajarlo (9 -> 6) descuenta de VARIOS" $?
AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,motivo,cantidad) VALUES ('$PS','entrada','ajuste',2)" >/dev/null
[ "$(lactual $PS VARIOS)" = "8" ]; res "un ajuste de entrada sin lote elegido cae en VARIOS (6 -> 8)" $?
AS $ADMIN "INSERT INTO products(name,stock) VALUES ('Sin nada',0)" >/dev/null
PZ=$(val "SELECT id FROM products WHERE name='Sin nada'")
AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,motivo,cantidad) VALUES ('$PZ','entrada','ajuste',3)" >/dev/null
[ "$(lactual $PZ VARIOS)" = "3" ] && [ "$(val "SELECT cantidad_inicial FROM stock_lotes WHERE product_id='$PZ' AND codigo='VARIOS'")" = "3" ]; res "producto sin filas de lote: el ajuste crea su fila en VARIOS (3/3)" $?

# Producto "viejo" con todo su stock en LOTE-000 (tanda vieja)
AS $ADMIN "SELECT codigo FROM stock_crear_tanda('LOTE-000', NULL, 'tanda vieja')" >/dev/null
AS $ADMIN "INSERT INTO products(name,stock) VALUES ('Viejo',0)" >/dev/null
PV=$(val "SELECT id FROM products WHERE name='Viejo'")
AS $ADMIN "SELECT stock_agregar_a_tanda('LOTE-000', '$PV', 10, NULL)" >/dev/null
AS $ADMIN "UPDATE products SET stock=7 WHERE id='$PV'" >/dev/null
[ "$(lactual $PV LOTE-000)" = "7" ] && [ -z "$(lote $PV VARIOS)" ]; res "baja manual (10 -> 7) de un producto de la tanda vieja se descuenta de LOTE-000, sin crear VARIOS" $?
AS $ADMIN "UPDATE products SET stock=9 WHERE id='$PV'" >/dev/null
[ "$(lactual $PV LOTE-000)/$(lactual $PV VARIOS)" = "7/2" ]; res "suba manual (7 -> 9) va a VARIOS (+2); LOTE-000 no se toca" $?
S9=$(stock $PV)
OUT=$(AS $ADMIN "UPDATE products SET stock=0 WHERE id='$PV'")
expect_err "bajar a 0 (9) rechazado: ni VARIOS (2) ni LOTE-000 (7) alcanzan solos" "$OUT" "Stock insuficiente en el lote VARIOS"
[ "$(stock $PV)" = "$S9" ]; res "...y el stock queda intacto" $?

# Eliminar un lote CON productos: pasan a VARIOS con cantidades e historial
AS $ADMIN "SELECT codigo FROM stock_crear_tanda('lote del', NULL, NULL)" >/dev/null
AS $ADMIN "SELECT stock_agregar_a_tanda('LOTE DEL', '$PA', 6, NULL)" >/dev/null
AS $ADMIN "SELECT stock_agregar_a_tanda('LOTE DEL', '$PB', 4, NULL)" >/dev/null
LD=$(lote $PA 'LOTE DEL')
AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',2,'$LD')" >/dev/null
AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',1,'$LD')" >/dev/null
AS $ADMIN "UPDATE stock_movimientos SET anulado_at=now() WHERE lote_id='$LD' AND motivo='venta' AND cantidad=1" >/dev/null
LDB=$(lote $PB 'LOTE DEL')
MOVS_ANTES=$(val "SELECT count(*) FROM stock_movimientos WHERE lote_id IN ('$LD','$LDB')")
SPA=$(stock $PA); SPB=$(stock $PB)
VA=$(val "SELECT coalesce(cantidad_inicial,0)||'/'||coalesce(cantidad_actual,0) FROM stock_lotes WHERE product_id='$PA' AND codigo='VARIOS'")
VAI=${VA%/*}; VAA=${VA#*/}
VB=$(val "SELECT coalesce(cantidad_inicial,0)||'/'||coalesce(cantidad_actual,0) FROM stock_lotes WHERE product_id='$PB' AND codigo='VARIOS'")
VBI=${VB%/*}; VBA=${VB#*/}
N=$(AS $ADMIN "SELECT stock_eliminar_tanda('lote del')")
[ "$N" = "2" ]; res "eliminar un lote con 2 productos devuelve 2" $?
[ "$(val "SELECT count(*) FROM stock_tandas WHERE codigo='LOTE DEL'")" = "0" ] && [ "$(val "SELECT count(*) FROM stock_lotes WHERE codigo='LOTE DEL'")" = "0" ]; res "el lote y sus filas dejan de existir" $?
[ "$(stock $PA)" = "$SPA" ] && [ "$(stock $PB)" = "$SPB" ]; res "el stock total de cada producto NO cambia" $?
[ "$(val "SELECT cantidad_inicial||'/'||cantidad_actual FROM stock_lotes WHERE product_id='$PA' AND codigo='VARIOS'")" = "$((VAI+6))/$((VAA+4))" ]; res "PA: su parte (inicial 6, actual 4 = 6-2-1+1) se suma a VARIOS" $?
[ "$(val "SELECT cantidad_inicial||'/'||cantidad_actual FROM stock_lotes WHERE product_id='$PB' AND codigo='VARIOS'")" = "$((VBI+4))/$((VBA+4))" ]; res "PB: su parte (4/4) se suma a VARIOS" $?
[ "$(val "SELECT count(*) FROM stock_movimientos WHERE nota LIKE '%(lote LOTE DEL eliminado: pasó a VARIOS)%'")" = "$MOVS_ANTES" ]; res "los $MOVS_ANTES movimientos del lote se conservan (ahora en VARIOS, con marca de origen)" $?
[ "$(val "SELECT count(*) FROM stock_movimientos m JOIN stock_lotes l ON l.id=m.lote_id WHERE m.nota LIKE '%LOTE DEL eliminado%' AND l.codigo='VARIOS'")" = "$MOVS_ANTES" ]; res "...y todos apuntan a VARIOS" $?
[ "$(val "SELECT count(*) FROM stock_movimientos WHERE nota LIKE '%LOTE DEL eliminado%' AND anulado_at IS NOT NULL")" = "1" ]; res "el movimiento ya anulado sigue anulado" $?
# Un movimiento de la tanda eliminada se puede anular: devuelve a VARIOS
MV=$(val "SELECT id FROM stock_movimientos WHERE nota LIKE '%LOTE DEL eliminado%' AND motivo='venta' AND cantidad=2 AND anulado_at IS NULL")
AS $ADMIN "UPDATE stock_movimientos SET anulado_at=now() WHERE id='$MV'" >/dev/null
[ "$(val "SELECT cantidad_actual FROM stock_lotes WHERE product_id='$PA' AND codigo='VARIOS'")" = "$((VAA+6))" ]; res "anular una venta de la tanda eliminada devuelve las docenas a VARIOS (4 + 2)" $?

# Eliminar un lote vacío, inexistente, y permisos
AS $ADMIN "SELECT codigo FROM stock_crear_tanda('vacio', NULL, NULL)" >/dev/null
[ "$(AS $ADMIN "SELECT stock_eliminar_tanda('vacio')")" = "0" ]; res "eliminar un lote vacío devuelve 0" $?
OUT=$(AS $ADMIN "SELECT stock_eliminar_tanda('no existe')")
expect_err "eliminar un lote inexistente rechazado" "$OUT" "no existe"
AS $ADMIN "SELECT codigo FROM stock_crear_tanda('de staff', NULL, NULL)" >/dev/null
OUT=$(AS $CUSTOMER "SELECT stock_eliminar_tanda('de staff')")
expect_err "cliente no elimina lotes" "$OUT" "permission denied"
OUT=$(ANON "SELECT stock_eliminar_tanda('de staff')")
expect_err "anon no elimina lotes" "$OUT" "permission denied"
[ "$(AS $STAFF_PROD "SELECT stock_eliminar_tanda('de staff')")" = "0" ]; res "staff con 'productos' puede eliminar un lote" $?

# Eliminar la tanda vieja (LOTE-000): su stock pasa a VARIOS, el producto no pierde nada
SV=$(stock $PV)
AS $ADMIN "SELECT stock_eliminar_tanda('LOTE-000')" >/dev/null
[ "$(stock $PV)" = "$SV" ] && [ "$(lactual $PV VARIOS)" = "$SV" ] && [ -z "$(lote $PV LOTE-000)" ]; res "eliminar LOTE-000: el producto 'Viejo' queda con todo en VARIOS ($SV)" $?

# Invariantes finales
[ "$(val "SELECT count(*) FROM products p WHERE p.stock <> coalesce((SELECT sum(cantidad_actual) FROM stock_lotes l WHERE l.product_id=p.id),0)")" = "0" ]; res "al final: ningún producto desincronizado con sus lotes" $?
[ "$(val "SELECT count(*) FROM (SELECT l.id FROM stock_lotes l LEFT JOIN stock_movimientos m ON m.lote_id=l.id AND m.anulado_at IS NULL GROUP BY l.id, l.cantidad_actual HAVING l.cantidad_actual <> COALESCE(SUM(CASE m.tipo WHEN 'entrada' THEN m.cantidad ELSE -m.cantidad END),0)) x")" = "0" ]; res "al final: cada lote = suma de sus movimientos vigentes (incluido VARIOS tras recibir lotes eliminados)" $?
[ "$(val "SELECT count(*) FROM stock_movimientos m WHERE NOT EXISTS (SELECT 1 FROM stock_lotes l WHERE l.id=m.lote_id)")" = "0" ]; res "al final: ningún movimiento quedó sin lote" $?
