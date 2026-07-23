import { useEffect, useRef, useState } from 'react'
import { convertToWebP, validateImageFile } from '../../../../../lib/imageUtils'

export default function BrandPhotoUploader({ photos = [], onPhotosChange, maxPhotos = 5, brandName = '', onError }) {
    const fileInputRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    const reportError = (msg) => (onError ? onError(msg) : alert(msg))

    const handleFileSelect = async (files) => {
        const fileArray = Array.from(files || [])
        const remainingSlots = maxPhotos - photos.length
        if (fileArray.length > remainingSlots) {
            reportError(`Solo puedes agregar ${remainingSlots} foto(s) más. Límite: ${maxPhotos} fotos.`)
        }

        const filesToProcess = fileArray.slice(0, remainingSlots)
        const convertedFiles = []

        for (const file of filesToProcess) {
            try {
                const validation = validateImageFile(file, 10)
                if (!validation.isValid) {
                    reportError(validation.error)
                    continue
                }
                const webpFile = await convertToWebP(file, { quality: 0.85, maxWidth: 1920, maxHeight: 1920 })
                convertedFiles.push(webpFile)
            } catch (error) {
                reportError(`Error al procesar ${file.name}: ${error.message}`)
            }
        }

        if (convertedFiles.length > 0) {
            onPhotosChange([...photos, ...convertedFiles])
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleRemovePhoto = (index) => {
        onPhotosChange(photos.filter((_, i) => i !== index))
    }

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }
    const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); handleFileSelect(e.dataTransfer.files) }

    const openLightbox = (index) => { setCurrentImageIndex(index); setLightboxOpen(true) }
    const closeLightbox = () => setLightboxOpen(false)
    const goToPrevious = () => setCurrentImageIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1))
    const goToNext = () => setCurrentImageIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1))

    const handleDownload = async () => {
        const photo = photos[currentImageIndex]
        const imageUrl = typeof photo === 'string' ? photo : URL.createObjectURL(photo)
        try {
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${brandName || 'foto'}_${currentImageIndex + 1}.jpg`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch {
            reportError('Error al descargar la imagen')
        }
    }

    useEffect(() => {
        if (!lightboxOpen) return
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') closeLightbox()
            if (e.key === 'ArrowLeft') goToPrevious()
            if (e.key === 'ArrowRight') goToNext()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lightboxOpen, currentImageIndex, photos.length])

    const atLimit = photos.length >= maxPhotos

    return (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>photo_camera</span>
                    Fotos de la marca
                    <span style={{ opacity: 0.6, fontWeight: 400 }}>(opcional)</span>
                </label>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(13,70,242,0.15)', color: 'var(--admin-primary)' }}>
                    {photos.length}/{maxPhotos}
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
                            {photos.length === 0 ? 'Adjuntar fotos de la marca' : 'Agregar más fotos'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Arrastra archivos o hacé clic — JPG, PNG, WebP (máx. 5MB)</div>
                    </div>
                </button>
                <input
                    ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
                    onChange={e => handleFileSelect(e.target.files)} style={{ display: 'none' }}
                />
            </div>

            {photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.625rem', marginTop: '0.75rem' }}>
                    {photos.map((photo, index) => (
                        <div key={index} style={{ position: 'relative', aspectRatio: '1', borderRadius: '2px', overflow: 'hidden', border: '1px solid #334155', background: '#1e293b' }}>
                            <img
                                src={typeof photo === 'string' ? photo : URL.createObjectURL(photo)}
                                alt={`${brandName} - Foto ${index + 1}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() => openLightbox(index)}
                            />
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemovePhoto(index) }}
                                title="Eliminar foto"
                                style={{
                                    position: 'absolute', top: '0.25rem', right: '0.25rem', display: 'flex',
                                    background: 'rgba(239,68,68,0.9)', color: 'white', border: 'none', borderRadius: '999px',
                                    padding: '0.25rem', cursor: 'pointer',
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>close</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {lightboxOpen && photos.length > 0 && (
                <div
                    onClick={closeLightbox}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                >
                    <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', zIndex: 1310 }}>
                        <button onClick={closeLightbox} style={{ ...lightboxBtn, background: '#ef4444' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span> Salir
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownload() }} style={{ ...lightboxBtn, background: '#10b981' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>download</span> Descargar
                        </button>
                    </div>

                    {photos.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); goToPrevious() }}
                                style={{ ...lightboxNavBtn, left: '1rem' }}
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); goToNext() }}
                                style={{ ...lightboxNavBtn, right: '1rem' }}
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </>
                    )}

                    <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                        <img
                            src={typeof photos[currentImageIndex] === 'string' ? photos[currentImageIndex] : URL.createObjectURL(photos[currentImageIndex])}
                            alt={`${brandName} - Foto ${currentImageIndex + 1}`}
                            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '4px' }}
                        />
                        {photos.length > 1 && (
                            <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '0.4rem 0.9rem', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                {currentImageIndex + 1} / {photos.length}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

const lightboxBtn = {
    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem',
    borderRadius: '4px', color: 'white', fontWeight: 600, fontSize: '0.85rem',
    border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
}

const lightboxNavBtn = {
    position: 'fixed', top: '50%', transform: 'translateY(-50%)', padding: '0.75rem',
    background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '999px',
    cursor: 'pointer', zIndex: 1305, display: 'flex',
}
