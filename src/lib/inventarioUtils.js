/**
 * Lógica de dominio de Inventario (Mercancía por Tandas), sin React.
 * Preserva las reglas de negocio del sistema original: agrupación de
 * `entradas` por marca (con fallback legacy para filas sin marca_id),
 * merge no-destructivo al guardar (evita pisar el progreso de control
 * cuando la cantidad de un producto no cambió), y el cálculo de borde
 * de color por propietario (único o proporcional multi-propietario).
 */

/** Clave de agrupación de una fila de `entradas` dentro de su marca. */
export function groupKeyForMarca(row) {
    if (row.marca_id) return row.marca_id;
    return `${row.marca}_${row.codigo_boleta || 'sin_boleta'}_${row.propietario || 'sin_prop'}`;
}

/** Agrupa filas de `entradas` por marca, devuelve un array de grupos. */
export function groupEntradasByMarca(rows) {
    const grouped = {};
    rows.forEach(row => {
        const key = groupKeyForMarca(row);
        if (!grouped[key]) {
            grouped[key] = {
                key,
                id: row.marca_id || key,
                nombre: row.marca,
                codigo_boleta: row.codigo_boleta || '',
                propietario: row.propietario || '',
                fotos: row.fotos || [],
                productos: [],
            };
        } else if (!grouped[key].propietario && row.propietario) {
            grouped[key].propietario = row.propietario;
        }
        grouped[key].productos.push(row);
    });
    return Object.values(grouped);
}

/** Docenas efectivas: usa la copia de control si existe, si no la cantidad original. */
export function getEffectiveDocenas(row) {
    return row.cant_docenas_copy ?? row.cantidad_docenas ?? 0;
}

/**
 * Reconstruye el estado de formulario { marcas, shippingParams } a partir
 * de las filas de `entradas` de una tanda + su fila de `tandas` (parametros
 * jsonb con marcasMetadata). Usado en modo edición de TandaForm.
 */
export function hydrateTandaForm(entradasRows, tandaRow) {
    const marcasMetadata = tandaRow?.parametros?.marcasMetadata || {};
    const grouped = {};

    entradasRows.forEach(row => {
        const key = groupKeyForMarca(row);
        if (!grouped[key]) {
            grouped[key] = {
                id: row.marca_id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                nombre: row.marca,
                codigo_boleta: row.codigo_boleta || '',
                collapsed: true,
                productos: [],
                fotos: row.fotos || [],
                propietario: row.propietario || '',
                bultos_personalizados: '',
            };

            const meta = (row.marca_id && marcasMetadata[row.marca_id]) || marcasMetadata[row.marca] || {};
            if (meta.bultos_personalizados !== undefined) {
                grouped[key].bultos_personalizados = meta.bultos_personalizados;
            }
            if (!grouped[key].propietario && meta.propietario) {
                grouped[key].propietario = meta.propietario;
            }
        }

        grouped[key].productos.push({
            producto_titulo: row.producto_titulo,
            cantidad_docenas: row.cantidad_docenas,
            precio_docena: row.precio_docena || 0,
            bultos: row.bultos || 0,
            codigo: row.codigo,
            observaciones: row.observaciones || '',
            propietario: row.propietario_producto || '',
        });
    });

    const shippingParams = {
        gastosViaje: tandaRow?.parametros?.gastosViaje || '',
        costoPilotajeXBulto: tandaRow?.parametros?.costoPilotajeXBulto || '',
        cantidadBultosTOTAL: tandaRow?.parametros?.cantidadBultosTOTAL || '',
        cantidadBultosAPagar: tandaRow?.parametros?.cantidadBultosAPagar || '',
        porcentajesMarcas: tandaRow?.parametros?.porcentajesMarcas || [],
    };

    return { marcas: Object.values(grouped), shippingParams };
}

const normalizeCode = (c) => (c || '').trim().toLowerCase();

/**
 * Compara las entradas nuevas (armadas desde el formulario) contra las
 * filas existentes de esa tanda en la base, matcheando por código
 * normalizado para preservar `id`/`created_at` (y por lo tanto el QR ya
 * impreso) cuando se edita un producto sin cambiar su código.
 *
 * @param {Array} existingRows - filas actuales en DB: { id, codigo, cantidad_docenas }
 * @param {Array} newRows - filas armadas desde el formulario (mismo shape que la tabla `entradas`)
 * @returns {{ toInsert: Array, toUpdate: Array<{id, fields}>, toDelete: Array<string> }}
 */
export function diffEntradasByCodigo(existingRows, newRows) {
    const existingByCode = new Map();
    (existingRows || []).forEach(row => {
        const key = normalizeCode(row.codigo);
        if (!existingByCode.has(key)) existingByCode.set(key, []);
        existingByCode.get(key).push({ id: row.id, cantidad_docenas: row.cantidad_docenas });
    });

    const matchedIds = new Set();
    const toUpdate = [];
    const toInsert = [];

    newRows.forEach(entry => {
        const candidates = existingByCode.get(normalizeCode(entry.codigo));
        const match = candidates?.find(r => !matchedIds.has(r.id));
        if (match) {
            matchedIds.add(match.id);
            // No sobreescribir cant_docenas_copy si cantidad_docenas no cambió,
            // para preservar el progreso de control (decrementos externos).
            const { cant_docenas_copy: _cant_docenas_copy, ...fieldsWithoutCopy } = entry;
            const cantidadCambio = parseFloat(entry.cantidad_docenas) !== parseFloat(match.cantidad_docenas);
            const fields = cantidadCambio
                ? { ...fieldsWithoutCopy, cant_docenas_copy: entry.cantidad_docenas }
                : fieldsWithoutCopy;
            toUpdate.push({ id: match.id, fields });
        } else {
            toInsert.push(entry);
        }
    });

    const toDelete = (existingRows || [])
        .map(row => row.id)
        .filter(id => !matchedIds.has(id));

    return { toInsert, toUpdate, toDelete };
}

/**
 * Estilo de borde para una tarjeta de marca: sólido si hay un único
 * propietario con monto, gradiente proporcional al monto de cada uno si hay
 * varios.
 * @param {Record<string, number>} totalsByOwner - monto total por nombre de propietario
 * @param {(username: string) => string} getColor - resuelve el color hex de un propietario
 */
export function ownerBorderStyle(totalsByOwner, getColor) {
    const owners = Object.keys(totalsByOwner);
    if (owners.length === 0) return {};
    if (owners.length === 1) {
        return { borderLeft: `4px solid ${getColor(owners[0]) || '#9ca3af'}` };
    }
    const total = Object.values(totalsByOwner).reduce((s, v) => s + v, 0);
    let pct = 0;
    const stops = Object.entries(totalsByOwner).flatMap(([name, amt]) => {
        const color = getColor(name) || '#9ca3af';
        const start = pct;
        pct += total > 0 ? (amt / total) * 100 : 0;
        return [`${color} ${start.toFixed(1)}%`, `${color} ${pct.toFixed(1)}%`];
    });
    return { borderLeft: '4px solid transparent', borderImage: `linear-gradient(to bottom, ${stops.join(', ')}) 1` };
}

/** URL de escaneo de un producto (la página receptora /scan/:id está fuera de alcance). */
export function buildScanUrl(producto) {
    const base = import.meta.env.VITE_APP_URL || window.location.origin;
    const codigoParam = producto.codigo ? `?c=${encodeURIComponent(producto.codigo)}` : '';
    return `${base}/scan/${producto.id}${codigoParam}`;
}
