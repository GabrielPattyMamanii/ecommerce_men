const DEFAULT_COLUMNS = ['Alto', 'Ancho']

/** Estado vacío de una guía recién activada. */
export function createEmptySizeGuide() {
    return { columns: [...DEFAULT_COLUMNS], values: {} }
}

/** products.size_guide (DB: {columns, rows}) → estado del editor ({columns, values}). */
export function sizeGuideFromDb(guide) {
    if (!guide || !Array.isArray(guide.columns)) return null
    const values = {}
    for (const row of guide.rows ?? []) values[row.size] = [...(row.values ?? [])]
    return { columns: [...guide.columns], values }
}

/** Estado del editor → formato DB. Las filas se arman con los talles actuales. */
export function sizeGuideToDb(guide, sizes) {
    if (!guide) return null
    // Columnas sin nombre se descartan junto con sus valores (índices alineados).
    const kept = guide.columns.map((name, i) => ({ name: name.trim(), i })).filter(c => c.name)
    if (kept.length === 0 || sizes.length === 0) return null
    return {
        columns: kept.map(c => c.name),
        rows: sizes.map(size => ({
            size,
            values: kept.map(c => (guide.values[size]?.[c.i] ?? '').trim()),
        })),
    }
}
