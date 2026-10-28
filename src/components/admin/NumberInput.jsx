import { useLayoutEffect, useReducer, useRef } from 'react'
import { formatRaw, parseTyped, countSignificant, caretPosition } from '../../lib/numberFormat'

/**
 * Campo numérico con separador de miles (punto) y decimales con coma.
 *
 *  - `value`: crudo con punto decimal y sin separadores ("1234567.5"), '' si está vacío.
 *  - `onChange(raw)`: recibe el crudo, igual que antes con <input type="number">.
 *  - `decimals`: máximo de decimales (default 2; 0 = solo enteros).
 * El resto de las props (style, placeholder, readOnly, aria-*, id…) pasan al <input>.
 */
export default function NumberInput({ value, onChange, decimals = 2, ...rest }) {
    const ref = useRef(null)
    const caret = useRef(null)
    const [, rerender] = useReducer(x => x + 1, 0)
    const display = formatRaw(value == null ? '' : String(value))

    // Tras reformatear, devolver el cursor al lugar lógico (no al final).
    useLayoutEffect(() => {
        if (caret.current !== null && ref.current) {
            ref.current.setSelectionRange(caret.current, caret.current)
            caret.current = null
        }
    })

    function apply(text, caretInText) {
        const next = parseTyped(text, decimals)
        caret.current = caretPosition(formatRaw(next), countSignificant(text.slice(0, caretInText)))
        onChange(next)
        rerender() // fuerza reponer el cursor aunque el valor no haya cambiado (ej. letra ignorada)
    }

    function handleChange(e) {
        apply(e.target.value, e.target.selectionStart ?? e.target.value.length)
    }

    // Pegar "1234.56" (punto decimal estilo EE.UU.) se interpreta como 1234,56 y no como 123456.
    function handlePaste(e) {
        const pasted = e.clipboardData.getData('text').trim()
        if (decimals > 0 && /^\d+\.\d{1,2}$/.test(pasted)) {
            e.preventDefault()
            const el = e.target
            const start = el.selectionStart ?? el.value.length
            const end = el.selectionEnd ?? start
            const insert = pasted.replace('.', ',')
            apply(el.value.slice(0, start) + insert + el.value.slice(end), start + insert.length)
        }
    }

    return (
        <input
            {...rest}
            ref={ref}
            type="text"
            inputMode={decimals > 0 ? 'decimal' : 'numeric'}
            autoComplete="off"
            value={display}
            onChange={handleChange}
            onPaste={handlePaste}
        />
    )
}
