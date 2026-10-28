/**
 * productCodeUtils — comparación de códigos de producto al cargar/editar.
 *
 * - Código EXACTO repetido (mismo texto en mayúsculas): lo rechaza la base (índice único);
 *   el popup lo advierte y bloquea el guardado.
 * - Código SIMILAR: uno contiene al otro una vez quitados guiones/espacios
 *   (ej. "96267" y "N96267"). No es un error: el popup pregunta si es el mismo producto.
 */

/** Mayúsculas y sin espacios, guiones ni símbolos: "n-96267" → "N96267". */
export function compactCode(code) {
    return String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Largo mínimo (ya compactado) para buscar similares; evita ruido con 1-2 caracteres. */
export const MIN_SIMILAR_LENGTH = 3

/**
 * Productos con código igual o parecido al tipeado.
 * @returns {{ exact: object|null, similar: object[] }}
 */
export function findCodeMatches(typedCode, products, currentId = null, limit = 5) {
    const typed = String(typedCode ?? '').trim().toUpperCase()
    const typedCompact = compactCode(typed)
    if (!typed) return { exact: null, similar: [] }

    let exact = null
    const similar = []
    for (const p of products) {
        if (!p.code || p.id === currentId) continue
        const other = String(p.code).trim().toUpperCase()
        if (other === typed) { exact = p; continue }
        const otherCompact = compactCode(other)
        const [short, long] = typedCompact.length <= otherCompact.length ? [typedCompact, otherCompact] : [otherCompact, typedCompact]
        if (short.length >= MIN_SIMILAR_LENGTH && long.includes(short)) similar.push(p)
    }
    similar.sort((a, b) =>
        Math.abs(compactCode(a.code).length - typedCompact.length) - Math.abs(compactCode(b.code).length - typedCompact.length))
    return { exact, similar: similar.slice(0, limit) }
}

/**
 * ¿El código del producto coincide con lo escrito en el buscador de Productos?
 * Mismo criterio que el popup (sin mayúsculas, guiones ni espacios; uno contiene al otro):
 *  - lo escrito está dentro del código: "96267" encuentra "N96267", "001" encuentra "REM-001";
 *  - el código está dentro de lo escrito (solo con 3+ caracteres): "N96267-X" encuentra "N96267".
 * En el buscador se filtra desde el primer carácter, a diferencia del aviso del popup.
 */
export function matchesCodeSearch(productCode, query) {
    const code = compactCode(productCode)
    const q = compactCode(query)
    if (!code || !q) return false
    return code.includes(q) || (code.length >= MIN_SIMILAR_LENGTH && q.includes(code))
}
