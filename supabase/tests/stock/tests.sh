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

echo "--- 1. Entradas y salidas"
AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','entrada',10)" >/dev/null
[ "$(stock $PA)" = "10" ]; res "entrada 10 -> stock 10" $?
AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','salida',3)" >/dev/null
[ "$(stock $PA)" = "7" ]; res "salida 3 -> stock 7 (un solo descuento)" $?
[ "$(val "SELECT saldo FROM stock_movimientos WHERE tipo='salida'")" = "7" ]; res "saldo del movimiento = 7" $?
[ "$(val "SELECT entradas||'/'||salidas FROM stock_control_productos WHERE product_id='$PA'")" = "10/3" ]; res "vista: entradas 10 / salidas 3" $?

echo "--- 2. Stock negativo"
OUT=$(AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','salida',8)")
expect_err "salida 8 > 7 rechazada" "$OUT" "Stock insuficiente"
[ "$(stock $PA)" = "7" ]; res "stock intacto (7)" $?
OUT=$(AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','salida',0)")
expect_err "cantidad 0 rechazada" "$OUT" "check"
OUT=$(AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','salida',4),('$PA','salida',4)")
expect_err "lote 4+4 > 7 rechazado completo" "$OUT" "Stock insuficiente"
[ "$(stock $PA)" = "7" ]; res "lote atómico: stock sigue 7" $?

echo "--- 3. Dos salidas simultáneas (7 disponibles; 5 + 5)"
( docker exec -i stocktest psql -U postgres -tA -c "SET request.jwt.claim.sub='$ADMIN'; SET request.jwt.claim.role='authenticated'; SET ROLE authenticated; BEGIN; INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','salida',5); SELECT pg_sleep(4); COMMIT;" > /tmp/s1.out 2>&1 ) &
sleep 1
docker exec -i stocktest psql -U postgres -tA -c "SET request.jwt.claim.sub='$ADMIN'; SET request.jwt.claim.role='authenticated'; SET ROLE authenticated; INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','salida',5);" > /tmp/s2.out 2>&1
wait
expect_err "segunda salida simultánea rechazada" "$(cat /tmp/s2.out)" "Stock insuficiente"
[ "$(stock $PA)" = "2" ]; res "stock final 2, nunca negativo" $?

echo "--- 4. products.stock se edita a mano desde el panel"
AS $ADMIN "UPDATE products SET stock=9 WHERE id='$PA'" >/dev/null
[ "$(stock $PA)" = "9" ]; res "UPDATE stock desde el panel permitido (2 -> 9)" $?
AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','salida',2)" >/dev/null
[ "$(stock $PA)" = "7" ]; res "una salida parte del stock editado (9 -> 7)" $?
OUT=$(AS $ADMIN "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','salida',8)")
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
EID=$(val "SELECT id FROM stock_movimientos WHERE tipo='entrada'")
OUT=$(AS $ADMIN "UPDATE stock_movimientos SET anulado_at=now() WHERE id='$EID'")
expect_err "anular entrada que dejaría stock negativo rechazado (5 - 10)" "$OUT" "Stock insuficiente"
[ "$(val "SELECT entradas||'/'||salidas FROM stock_control_productos WHERE product_id='$PA'")" = "10/5" ]; res "vista ignora anulados (10/5)" $?

echo "--- 6. Vista: costo, margen, nivel (precio por docena = retail_price)"
AS $ADMIN "INSERT INTO product_costs(product_id,cost_price,cost_price_rounded) VALUES ('$PA',60.4,60)" >/dev/null
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
[ "$(AS $STAFF_PROD "SELECT count(*) FROM product_costs")" = "1" ]; res "staff con 'productos' ve costos" $?
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
