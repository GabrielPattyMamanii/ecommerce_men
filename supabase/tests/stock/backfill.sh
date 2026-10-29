#!/bin/bash
# Prueba de la MIGRACIÓN de datos existentes a LOTE-000 (tanda vieja).
# Levanta su propio contenedor: base.sql -> migration-stock-productos.sql -> datos viejos -> migration-stock-lotes.sql
cd "$(dirname "$0")/../.." || exit 1   # carpeta supabase/
C=stocktest_backfill
SQL() { docker exec -i $C psql -U postgres -v ON_ERROR_STOP=1 -tA "$@"; }
res() { if [ "$2" = "0" ]; then echo "PASS  $1"; else echo "FAIL  $1"; fi; }
val() { SQL -c "$1"; }
PA=11111111-1111-1111-1111-111111111111
PB=22222222-2222-2222-2222-222222222222
# Las funciones de lotes exigen un usuario con permiso: se simula al admin de base.sql.
ADM="SET request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a1'; "

docker rm -f $C >/dev/null 2>&1
docker run -d --name $C -e POSTGRES_PASSWORD=x postgres:15-alpine >/dev/null
for i in $(seq 1 30); do docker exec $C pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done; sleep 2
SQL -q < tests/stock/base.sql >/dev/null
SQL -q < migration-stock-productos.sql >/dev/null 2>&1

echo "--- Datos ANTERIORES a los lotes"
SQL -c "INSERT INTO stock_movimientos(product_id,tipo,cantidad) VALUES ('$PA','entrada',10),('$PA','salida',3)" >/dev/null
SQL -c "UPDATE products SET stock=stock+5 WHERE id='$PA'" >/dev/null           # edición manual vieja (sin movimiento)
SQL -c "INSERT INTO products(name,stock) VALUES ('SoloStock',6),('SinNada',0)" >/dev/null
[ "$(val "SELECT stock FROM products WHERE id='$PA'")" = "12" ]; res "partida: PA con stock 12 (10-3+5 manual)" $?

SQL -q < migration-stock-lotes.sql >/dev/null 2>/tmp/bf_err.txt; res "la migración corre sin errores" $?
SQL -q < migration-stock-lotes.sql >/dev/null 2>&1;               res "la migración es idempotente (2ª corrida sin errores)" $?

echo "--- Después de migrar"
[ "$(val "SELECT cantidad_inicial||'/'||cantidad_actual FROM stock_lotes WHERE product_id='$PA' AND codigo='LOTE-000'")" = "12/12" ]; res "PA: LOTE-000 con inicial 12 / actual 12 (= su stock)" $?
[ "$(val "SELECT cantidad_inicial||'/'||cantidad_actual FROM stock_lotes l JOIN products p ON p.id=l.product_id WHERE p.name='SoloStock' AND codigo='LOTE-000'")" = "6/6" ]; res "producto con stock y sin movimientos: LOTE-000 6/6" $?
[ "$(val "SELECT count(*) FROM stock_lotes l JOIN products p ON p.id=l.product_id WHERE p.name='SinNada'")" = "0" ]; res "producto sin stock ni historial: no crea lote vacío" $?
[ "$(val "SELECT count(*) FROM stock_lotes WHERE product_id='$PA'")" = "1" ]; res "la 2ª corrida no duplicó lotes" $?
[ "$(val "SELECT count(*) FROM stock_movimientos WHERE lote_id IS NULL")" = "0" ]; res "todo movimiento histórico quedó asignado a un lote" $?
[ "$(val "SELECT count(*) FROM stock_movimientos WHERE lote_id=(SELECT id FROM stock_lotes WHERE product_id='$PA' AND codigo='LOTE-000')")" = "2" ]; res "los 2 movimientos viejos de PA apuntan a LOTE-000" $?
[ "$(val "SELECT string_agg(motivo, ',' ORDER BY tipo) FROM stock_movimientos WHERE product_id='$PA'")" = "ingreso,venta" ]; res "motivos históricos: entrada=ingreso, salida=venta" $?
[ "$(val "SELECT count(*) FROM products p WHERE p.stock <> coalesce((SELECT sum(cantidad_actual) FROM stock_lotes l WHERE l.product_id=p.id),0)")" = "0" ]; res "products.stock = suma de lotes para TODOS" $?
[ "$(val "SELECT stock FROM products WHERE id='$PA'")" = "12" ]; res "la migración no cambió ningún stock (PA sigue en 12)" $?
[ "$(val "SELECT count(*) FROM stock_movimientos WHERE saldo IS NULL")" = "0" ]; res "los saldos históricos se conservan" $?

echo "--- Lotes como entidad (migration-stock-tandas.sql) sobre datos ya migrados"
# Antes: ya existe una tanda real con 2 productos (creada por la función de ingreso anterior)
SQL -c "$ADM SELECT stock_registrar_ingreso('LOTE-001', CURRENT_DATE, NULL, '[{\"product_id\":\"$PA\",\"cantidad\":4},{\"product_id\":\"$PB\",\"cantidad\":2}]'::jsonb)" >/dev/null
STOCK_ANTES=$(val "SELECT string_agg(id::text||':'||stock, ',' ORDER BY id) FROM products")
LOTES_ANTES=$(val "SELECT string_agg(id::text||':'||cantidad_inicial||'/'||cantidad_actual, ',' ORDER BY id) FROM stock_lotes")
SQL -q < migration-stock-tandas.sql >/dev/null 2>/tmp/bf_err2.txt; res "la migración de lotes corre sin errores" $?
SQL -q < migration-stock-tandas.sql >/dev/null 2>&1;               res "...y es idempotente (2ª corrida)" $?
[ "$(val "SELECT string_agg(codigo, ',' ORDER BY codigo) FROM stock_tandas")" = "LOTE-000,LOTE-001" ]; res "se crea un lote por cada nombre existente (LOTE-000, LOTE-001)" $?
[ -n "$(val "SELECT 1 FROM stock_tandas WHERE codigo='LOTE-000' AND nota LIKE 'Tanda vieja%'")" ]; res "LOTE-000 conserva su descripción de tanda vieja" $?
[ "$(val "SELECT count(*) FROM stock_lotes l WHERE NOT EXISTS (SELECT 1 FROM stock_tandas t WHERE t.codigo=l.codigo)")" = "0" ]; res "todas las filas de producto apuntan a un lote existente" $?
[ "$(val "SELECT string_agg(id::text||':'||stock, ',' ORDER BY id) FROM products")" = "$STOCK_ANTES" ]; res "ningún stock de producto cambió" $?
[ "$(val "SELECT string_agg(id::text||':'||cantidad_inicial||'/'||cantidad_actual, ',' ORDER BY id) FROM stock_lotes")" = "$LOTES_ANTES" ]; res "ninguna cantidad de lote cambió (mismos ids y cantidades)" $?
[ "$(val "SELECT stock_siguiente_codigo_lote()")" = "LOTE-002" ]; res "el próximo nombre sugerido es LOTE-002" $?
[ "$(val "SELECT count(*) FROM stock_movimientos")" = "$(val "SELECT count(*) FROM stock_movimientos WHERE lote_id IS NOT NULL")" ]; res "los movimientos siguen vinculados a su lote" $?

echo "--- Lote VARIOS (migration-stock-varios.sql) sobre datos ya migrados"
STOCK_ANTES=$(val "SELECT string_agg(id::text||':'||stock, ',' ORDER BY id) FROM products")
LOTES_ANTES=$(val "SELECT string_agg(id::text||':'||codigo||':'||cantidad_inicial||'/'||cantidad_actual, ',' ORDER BY id) FROM stock_lotes")
MOVS_ANTES=$(val "SELECT string_agg(id::text||':'||lote_id::text, ',' ORDER BY id) FROM stock_movimientos")
SQL -q < migration-stock-varios.sql >/dev/null 2>/tmp/bf_err3.txt; res "la migración de VARIOS corre sin errores" $?
SQL -q < migration-stock-varios.sql >/dev/null 2>&1;               res "...y es idempotente (2ª corrida)" $?
[ "$(val "SELECT count(*) FROM stock_tandas WHERE codigo='VARIOS' AND es_sistema")" = "1" ]; res "existe el lote VARIOS (del sistema)" $?
[ "$(val "SELECT string_agg(id::text||':'||stock, ',' ORDER BY id) FROM products")" = "$STOCK_ANTES" ]; res "ningún stock de producto cambió" $?
[ "$(val "SELECT string_agg(id::text||':'||codigo||':'||cantidad_inicial||'/'||cantidad_actual, ',' ORDER BY id) FROM stock_lotes")" = "$LOTES_ANTES" ]; res "ningún lote existente cambió (LOTE-000 y LOTE-001 intactos, nada se mueve a VARIOS)" $?
[ "$(val "SELECT string_agg(id::text||':'||lote_id::text, ',' ORDER BY id) FROM stock_movimientos")" = "$MOVS_ANTES" ]; res "ningún movimiento cambió de lote" $?
[ "$(val "SELECT count(*) FROM stock_lotes WHERE codigo='VARIOS'")" = "0" ]; res "VARIOS arranca sin productos adentro" $?

echo "--- Funciona con datos viejos"
LOTE0=$(val "SELECT id FROM stock_lotes WHERE product_id='$PA' AND codigo='LOTE-000'")
SQL -c "INSERT INTO stock_movimientos(product_id,tipo,cantidad,lote_id) VALUES ('$PA','salida',2,'$LOTE0')" >/dev/null
[ "$(val "SELECT stock FROM products WHERE id='$PA'")" = "14" ] && [ "$(val "SELECT cantidad_actual FROM stock_lotes WHERE id='$LOTE0'")" = "10" ]; res "venta manual del LOTE-000: lote 12 -> 10, producto 16 -> 14" $?
SQL -c "UPDATE products SET stock=15 WHERE id='$PA'" >/dev/null
[ "$(val "SELECT cantidad_actual FROM stock_lotes WHERE id='$LOTE0'")" = "10" ] && [ "$(val "SELECT cantidad_actual FROM stock_lotes WHERE product_id='$PA' AND codigo='VARIOS'")" = "1" ]; res "edición manual 14 -> 15 = ajuste +1 en VARIOS; LOTE-000 no se toca (sigue en 10)" $?
SQL -c "$ADM SELECT stock_registrar_ingreso(NULL, CURRENT_DATE, NULL, '[{\"product_id\":\"$PA\",\"cantidad\":5}]'::jsonb)" >/dev/null
[ "$(val "SELECT string_agg(codigo, ',' ORDER BY codigo) FROM stock_lotes WHERE product_id='$PA'")" = "LOTE-000,LOTE-001,LOTE-002,VARIOS" ]; res "la tanda nueva se llama LOTE-002 (sigue a la existente)" $?
[ "$(val "SELECT stock FROM products WHERE id='$PA'")" = "20" ]; res "stock total = LOTE-000 (10) + VARIOS (1) + LOTE-001 (4) + LOTE-002 (5) = 20" $?
echo "--- Eliminar un lote con productos (datos viejos): pasan a VARIOS"
SQL -c "$ADM SELECT stock_eliminar_tanda('LOTE-002')" >/dev/null
[ "$(val "SELECT cantidad_actual FROM stock_lotes WHERE product_id='$PA' AND codigo='VARIOS'")" = "6" ] && [ "$(val "SELECT stock FROM products WHERE id='$PA'")" = "20" ]; res "eliminar LOTE-002: sus 5 docenas pasan a VARIOS (1 + 5) y el stock no cambia" $?
SQL -c "$ADM SELECT stock_eliminar_tanda('VARIOS')" >/dev/null 2>&1; res_fail=$?
[ "$res_fail" != "0" ] && [ "$(val "SELECT count(*) FROM stock_tandas WHERE codigo='VARIOS'")" = "1" ]; res "VARIOS no se puede eliminar" $?
echo "--- Flujo nuevo sobre datos viejos: crear lote vacío y cargarle un producto"
SQL -c "$ADM SELECT stock_crear_tanda(NULL, CURRENT_DATE, NULL)" >/dev/null
[ "$(val "SELECT count(*) FROM stock_tandas WHERE codigo='LOTE-002'")" = "1" ]; res "crear lote vacío: LOTE-002 (el nombre se reutiliza tras eliminar el anterior)" $?
SQL -c "$ADM SELECT stock_agregar_a_tanda('LOTE-002', '$PB', 7, NULL)" >/dev/null
[ "$(val "SELECT cantidad_actual FROM stock_lotes WHERE product_id='$PB' AND codigo='LOTE-002'")" = "7" ]; res "cargarle un producto: 7 docenas en el lote nuevo" $?
[ "$(val "SELECT count(*) FROM products p WHERE p.stock <> coalesce((SELECT sum(cantidad_actual) FROM stock_lotes l WHERE l.product_id=p.id),0)")" = "0" ]; res "stock = suma de lotes para TODOS" $?

docker rm -f $C >/dev/null 2>&1
