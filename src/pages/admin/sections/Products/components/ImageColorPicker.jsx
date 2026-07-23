import { useRef, useState } from 'react'
import { S } from '../../../../../components/admin/AdminKit'

function toSrc(image) {
    return typeof image === 'string' ? image : URL.createObjectURL(image)
}

function toHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

const ZOOM_RADIUS = 6 // radio en píxeles de imagen alrededor del cursor
const ZOOM_PIXEL_SIZE = 14 // tamaño renderizado de cada pixel de imagen, en la lupa

/**
 * Popup anidado dentro del popup de producto: elegí una de las imágenes ya
 * adjuntadas y hacé clic sobre la prenda para tomar ese color exacto —
 * sampleo por canvas, funciona en cualquier navegador (no depende de la
 * EyeDropper API, que solo existe en Chromium).
 */
export default function ImageColorPicker({ images, onPick, onClose }) {
    const [selectedIndex, setSelectedIndex] = useState(images.length === 1 ? 0 : null)
    const [pickError, setPickError] = useState(null)
    const [hoverHex, setHoverHex] = useState(null)
    const canvasRef = useRef(null)
    const imgRef = useRef(null)
    const loupeCanvasRef = useRef(null)

    const selectedSrc = selectedIndex !== null ? toSrc(images[selectedIndex]) : null

    function handleImageLoad() {
        const canvas = canvasRef.current
        const img = imgRef.current
        if (!canvas || !img) return
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
    }

    /* Coordenadas de imagen (no de pantalla) para un evento de mouse sobre el canvas */
    function imagePos(e) {
        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        return {
            x: Math.floor((e.clientX - rect.left) * (canvas.width / rect.width)),
            y: Math.floor((e.clientY - rect.top) * (canvas.height / rect.height)),
        }
    }

    function handleCanvasClick(e) {
        const canvas = canvasRef.current
        if (!canvas) return
        const { x, y } = imagePos(e)
        try {
            const [r, g, b] = canvas.getContext('2d').getImageData(x, y, 1, 1).data
            onPick(toHex(r, g, b))
        } catch {
            setPickError('No se pudo leer el color de esta imagen. Probá con otra o usá el selector manual.')
        }
    }

    /* Dibuja, en un canvas aparte, un acercamiento pixel-a-pixel alrededor de
       (x, y) con grilla y el pixel bajo el cursor resaltado — la ventana se
       clampea a los bordes de la imagen para no leer fuera de rango. */
    function drawLoupe(x, y) {
        const src = canvasRef.current
        const loupe = loupeCanvasRef.current
        if (!src || !loupe) return
        const size = Math.max(1, Math.min(ZOOM_RADIUS * 2 + 1, src.width, src.height))
        const sx = Math.max(0, Math.min(x - ZOOM_RADIUS, src.width - size))
        const sy = Math.max(0, Math.min(y - ZOOM_RADIUS, src.height - size))

        loupe.width = size * ZOOM_PIXEL_SIZE
        loupe.height = size * ZOOM_PIXEL_SIZE
        const lctx = loupe.getContext('2d')
        lctx.imageSmoothingEnabled = false
        lctx.clearRect(0, 0, loupe.width, loupe.height)
        lctx.drawImage(src, sx, sy, size, size, 0, 0, loupe.width, loupe.height)

        lctx.strokeStyle = 'rgba(255,255,255,0.15)'
        lctx.lineWidth = 1
        for (let i = 1; i < size; i++) {
            lctx.beginPath(); lctx.moveTo(i * ZOOM_PIXEL_SIZE, 0); lctx.lineTo(i * ZOOM_PIXEL_SIZE, loupe.height); lctx.stroke()
            lctx.beginPath(); lctx.moveTo(0, i * ZOOM_PIXEL_SIZE); lctx.lineTo(loupe.width, i * ZOOM_PIXEL_SIZE); lctx.stroke()
        }

        // Resalta el pixel exacto que se tomaría con un clic en (x, y)
        const cellX = x - sx
        const cellY = y - sy
        lctx.strokeStyle = '#00f0ff'
        lctx.lineWidth = 2
        lctx.strokeRect(cellX * ZOOM_PIXEL_SIZE + 1, cellY * ZOOM_PIXEL_SIZE + 1, ZOOM_PIXEL_SIZE - 2, ZOOM_PIXEL_SIZE - 2)
    }

    function handleCanvasMouseMove(e) {
        const canvas = canvasRef.current
        if (!canvas) return
        const { x, y } = imagePos(e)
        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return
        try {
            const [r, g, b] = canvas.getContext('2d').getImageData(x, y, 1, 1).data
            setHoverHex(toHex(r, g, b))
            drawLoupe(x, y)
        } catch {
            // El error real ya se muestra en el clic — acá simplemente no hay lupa que dibujar
        }
    }

    function handleCanvasMouseLeave() {
        setHoverHex(null)
    }

    function backToGallery() {
        setSelectedIndex(null)
        setPickError(null)
        setHoverHex(null)
    }

    return (
        <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
            <div
                onClick={e => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-label="Tomar color de una imagen"
                style={{ background: '#161b2e', border: '1px solid #334155', borderRadius: '4px', maxWidth: '520px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #1e293b' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--admin-primary)', fontSize: '1.1rem' }}>colorize</span>
                        Tomar color de una imagen
                    </h3>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div style={{ padding: '1.25rem' }}>
                    {selectedIndex === null ? (
                        <>
                            <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'monospace', marginTop: 0, marginBottom: '0.875rem' }}>
                                Elegí de qué imagen tomar el color:
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.625rem' }}>
                                {images.map((img, i) => (
                                    <button
                                        key={i} type="button" onClick={() => setSelectedIndex(i)}
                                        style={{ aspectRatio: '1', border: '1px solid #334155', borderRadius: '2px', overflow: 'hidden', padding: 0, cursor: 'pointer', background: '#1e293b' }}
                                    >
                                        <img src={toSrc(img)} alt={`Imagen ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            {images.length > 1 && (
                                <button type="button" onClick={backToGallery} style={{ ...S.btnGhost, marginBottom: '0.75rem' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>arrow_back</span>
                                    Elegir otra imagen
                                </button>
                            )}
                            <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace', marginTop: 0, marginBottom: '0.625rem' }}>
                                Hacé clic sobre la prenda para tomar ese color.
                            </p>

                            {/* Vista ampliada — se actualiza al mover el mouse sobre la imagen */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem', padding: '0.625rem', border: '1px solid #1e293b', borderRadius: '2px', background: '#0f172a' }}>
                                <canvas
                                    ref={loupeCanvasRef}
                                    style={{ flexShrink: 0, borderRadius: '2px', border: '1px solid #334155' }}
                                />
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                                        Vista ampliada
                                    </div>
                                    {hoverHex ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ width: '18px', height: '18px', borderRadius: '3px', background: hoverHex, border: '1px solid rgba(255,255,255,0.15)', display: 'inline-block' }} />
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'white' }}>{hoverHex}</span>
                                        </div>
                                    ) : (
                                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569' }}>Pasá el mouse sobre la imagen</span>
                                    )}
                                </div>
                            </div>

                            <div style={{ border: '1px solid #334155', borderRadius: '2px', overflow: 'auto', maxHeight: '55vh', background: '#0f172a' }}>
                                {/* Imagen oculta: solo se usa para cargar los pixeles en el canvas */}
                                <img
                                    ref={imgRef} src={selectedSrc} alt="" crossOrigin="anonymous"
                                    onLoad={handleImageLoad}
                                    onError={() => setPickError('No se pudo cargar la imagen.')}
                                    style={{ display: 'none' }}
                                />
                                <canvas
                                    ref={canvasRef}
                                    onClick={handleCanvasClick}
                                    onMouseMove={handleCanvasMouseMove}
                                    onMouseLeave={handleCanvasMouseLeave}
                                    style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
                                />
                            </div>
                            {pickError && (
                                <p style={{ color: '#ef4444', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: 0 }}>{pickError}</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
