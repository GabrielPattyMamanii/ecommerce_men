import { useRef, useState } from 'react'
import { convertToWebP, validateImageFile } from '../../../../../lib/imageUtils'

/**
 * Sección de adjuntar imágenes para el formulario de producto.
 * Acepta clic-para-explorar y arrastrar-y-soltar. Convierte cada imagen
 * a WebP antes de agregarla (mismo patrón que BrandPhotoUploader).
 */
export default function ProductImageUploader({ images = [], onImagesChange, maxImages = 6, onError }) {
    const fileInputRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)

    const reportError = (msg) => (onError ? onError(msg) : alert(msg))

    const handleFileSelect = async (files) => {
        const fileArray = Array.from(files || [])
        const remainingSlots = maxImages - images.length
        if (fileArray.length > remainingSlots) {
            reportError(`Solo puedes agregar ${remainingSlots} imagen(es) más. Límite: ${maxImages}.`)
        }

        const filesToProcess = fileArray.slice(0, remainingSlots)
        const convertedFiles = []

        for (const file of filesToProcess) {
            const validation = validateImageFile(file, 10)
            if (!validation.isValid) {
                reportError(validation.error)
                continue
            }
            try {
                const webpFile = await convertToWebP(file, { quality: 0.85, maxWidth: 1600, maxHeight: 1600 })
                convertedFiles.push(webpFile)
            } catch (error) {
                reportError(`Error al procesar ${file.name}: ${error.message}`)
            }
        }

        if (convertedFiles.length > 0) onImagesChange([...images, ...convertedFiles])
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleRemove = (index) => onImagesChange(images.filter((_, i) => i !== index))

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); handleFileSelect(e.dataTransfer.files) }

    const atLimit = images.length >= maxImages

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>photo_camera</span>
                    Imágenes del producto
                    <span style={{ opacity: 0.6, fontWeight: 400 }}>(opcional)</span>
                </label>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(13,70,242,0.15)', color: 'var(--admin-primary)' }}>
                    {images.length}/{maxImages}
                </span>
            </div>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                    position: 'relative', overflow: 'hidden', borderRadius: '2px',
                    border: `2px dashed ${isDragging ? 'var(--admin-primary)' : '#334155'}`,
                    background: isDragging ? 'rgba(13,70,242,0.08)' : 'rgba(15,23,42,0.4)',
                    opacity: atLimit ? 0.5 : 1, transition: 'all 0.15s',
                }}
            >
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={atLimit}
                    style={{
                        width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                        background: 'transparent', border: 'none', cursor: atLimit ? 'not-allowed' : 'pointer',
                    }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.5rem', color: 'var(--admin-primary)' }}>upload</span>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>
                            {images.length === 0 ? 'Adjuntar imágenes del producto' : 'Agregar más imágenes'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Arrastra archivos aquí o hacé clic — JPG, PNG, WebP (máx. 10MB)</div>
                    </div>
                </button>
                <input
                    ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
                    onChange={e => handleFileSelect(e.target.files)} style={{ display: 'none' }}
                />
            </div>

            {images.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.625rem', marginTop: '0.75rem' }}>
                    {images.map((image, index) => (
                        <div key={index} style={{ position: 'relative', aspectRatio: '1', borderRadius: '2px', overflow: 'hidden', border: '1px solid #334155', background: '#1e293b' }}>
                            <img
                                src={typeof image === 'string' ? image : URL.createObjectURL(image)}
                                alt={`Producto - imagen ${index + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                title="Eliminar imagen"
                                style={{
                                    position: 'absolute', top: '0.25rem', right: '0.25rem', display: 'flex',
                                    background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: '999px',
                                    padding: '0.2rem', cursor: 'pointer',
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '0.85rem' }}>close</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
