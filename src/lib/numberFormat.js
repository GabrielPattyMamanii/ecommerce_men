/**
 * numberFormat — formato de números mientras se escriben (estilo es-AR):
 * punto = separador de miles, coma = decimales.  1234567,5  →  "1.234.567,5"
 *
 * El valor "crudo" que se guarda en el formulario usa punto decimal y no tiene
 * separadores ("1234567.5"), así parseFloat/parseInt y la base siguen funcionando igual.
 */

/** Crudo → texto visible. "1234.5" → "1.234,5"; "12." → "12,"; "" → "". */
export function formatRaw(raw) {
    const s = String(raw ?? '')
    if (s === '') return ''
    const [int, dec] = s.split('.')
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return s.includes('.') ? `${grouped},${dec ?? ''}` : grouped
}

/**
 * Texto escrito por el usuario → crudo.
 * Solo cuentan los dígitos y la PRIMERA coma (decimal); los puntos y cualquier otro
 * carácter se descartan (los puntos los vuelve a poner formatRaw).
 * `decimals` = máximo de decimales (0 = solo enteros).
 */
export function parseTyped(text, decimals = 2) {
    const clean = String(text ?? '').replace(/[^\d,]/g, '')
    const commaAt = clean.indexOf(',')
    const hasComma = decimals > 0 && commaAt !== -1
    const intDigits = (commaAt === -1 ? clean : clean.slice(0, commaAt)).replace(/,/g, '')
    const decDigits = hasComma ? clean.slice(commaAt + 1).replace(/,/g, '').slice(0, decimals) : ''

    // Sin ceros a la izquierda ("007" → "7"), pero "0" y "0,5" se conservan.
    let int = intDigits.replace(/^0+(?=\d)/, '')
    if (int === '' && hasComma) int = '0'
    return hasComma ? `${int}.${decDigits}` : int
}

/** Cuántos caracteres "con significado" (dígitos y coma) hay en un texto. */
export function countSignificant(text) {
    return (String(text).match(/[\d,]/g) ?? []).length
}

/** Posición del cursor en `formatted` tras `significant` caracteres con significado. */
export function caretPosition(formatted, significant) {
    if (significant <= 0) return 0
    let seen = 0
    for (let i = 0; i < formatted.length; i++) {
        if (/[\d,]/.test(formatted[i])) seen += 1
        if (seen === significant) return i + 1
    }
    return formatted.length
}
