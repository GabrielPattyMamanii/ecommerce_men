/**
 * Tokens de diseño para el popup de Agregar/Editar Producto — portados del
 * diseño Stitch "Edición de Producto - Vista Completa SaaS Limpia"
 * (proyecto ecommerce-men, projects/11880103943447007113). Deliberadamente
 * aislado del resto del admin (TEKGEAR / AdminKit): el pedido fue aplicar
 * esta identidad visual únicamente al formulario de producto, no a todo
 * /admin, así que no se toca --admin-primary ni AdminKit.
 *
 * Ahora sí respeta el toggle de tema oscuro/claro del admin: PF.color.* son
 * referencias a variables CSS (--pf-*) en vez de hex fijos, y el valor real
 * de esas variables se inyecta inline en la raíz del popup (ver
 * ProductFormModal.jsx) según PF_VARS_DARK / PF_VARS_LIGHT de abajo. Esto
 * evita tener que pasar el tema como prop a cada subcomponente — todos
 * heredan el color correcto vía cascada CSS normal, incluso estando
 * portados fuera de .admin-layout.
 */
export const PF = {
    font: {
        headline: "'Space Grotesk', sans-serif",
        body: "'Geist', 'Inter', sans-serif",
    },
    color: {
        bg: 'var(--pf-bg)',
        surfaceLow: 'var(--pf-surface-low)',
        surfaceLowest: 'var(--pf-surface-lowest)',
        surfaceContainer: 'var(--pf-surface-container)',
        surfaceHigh: 'var(--pf-surface-high)',
        border: 'var(--pf-border)',
        borderStrong: 'var(--pf-border-strong)',
        text: 'var(--pf-text)',
        textMuted: 'var(--pf-text-muted)',
        accent: 'var(--pf-accent)',
        accentSoft: 'var(--pf-accent-soft)',
        accentText: 'var(--pf-accent-text)',
        danger: 'var(--pf-danger)',
        dangerSoft: 'var(--pf-danger-soft)',
        success: 'var(--pf-success)',
    },
    radius: { sm: '6px', md: '10px', lg: '14px', xl: '18px', full: '9999px' },
}

/* ── Valores reales de las variables --pf-*, uno por tema ──
   Oscuro: el cyan original (#00f2ff) brilla sobre azul-noche profundo.
   Claro: mismo cyan vira a un teal más saturado (#0891b2) porque el cyan
   puro pierde casi todo el contraste sobre blanco — mantiene la misma
   familia de color (identidad del popup) sin sacrificar legibilidad. */
export const PF_VARS_DARK = {
    '--pf-bg': '#071626',
    '--pf-surface-low': '#0d1c2d',
    '--pf-surface-lowest': '#061322',
    '--pf-surface-container': '#122131',
    '--pf-surface-high': '#1c2b3c',
    '--pf-border': '#22354a',
    '--pf-border-strong': '#2c3a4c',
    '--pf-text': '#e2edf8',
    '--pf-text-muted': '#92a6bc',
    '--pf-placeholder': '#4d6479',
    '--pf-accent': '#00f2ff',
    '--pf-accent-soft': 'rgba(0, 242, 255, 0.12)',
    '--pf-accent-text': '#002022',
    '--pf-danger': '#fb7185',
    '--pf-danger-soft': 'rgba(251, 113, 133, 0.12)',
    '--pf-success': '#34d399',
    '--pf-header-bg': 'rgba(7, 22, 38, 0.92)',
    '--pf-overlay': 'rgba(0, 0, 0, 0.75)',
    '--pf-modal-shadow': 'rgba(0, 0, 0, 0.5)',
}

export const PF_VARS_LIGHT = {
    '--pf-bg': '#f5f8fb',
    '--pf-surface-low': '#ffffff',
    '--pf-surface-lowest': '#f1f5f9',
    '--pf-surface-container': '#eef2f6',
    '--pf-surface-high': '#e2e8f0',
    '--pf-border': '#dbe3ea',
    '--pf-border-strong': '#c7d2dc',
    '--pf-text': '#101a24',
    '--pf-text-muted': '#5b6b7c',
    '--pf-placeholder': '#94a3b4',
    '--pf-accent': '#0891b2',
    '--pf-accent-soft': 'rgba(8, 145, 178, 0.1)',
    '--pf-accent-text': '#ffffff',
    '--pf-danger': '#dc2626',
    '--pf-danger-soft': 'rgba(220, 38, 38, 0.08)',
    '--pf-success': '#059669',
    '--pf-header-bg': 'rgba(255, 255, 255, 0.92)',
    '--pf-overlay': 'rgba(15, 23, 32, 0.55)',
    '--pf-modal-shadow': 'rgba(15, 23, 32, 0.25)',
}

export function getPfVars(theme) {
    return theme === 'light' ? PF_VARS_LIGHT : PF_VARS_DARK
}

export const pfStyles = {
    card: {
        background: PF.color.surfaceLow,
        border: `1px solid ${PF.color.border}`,
        borderRadius: PF.radius.xl,
        padding: '1.25rem',
    },
    cardTitle: {
        margin: 0, fontSize: '0.95rem', fontWeight: 600, color: PF.color.text,
        fontFamily: PF.font.headline,
    },
    cardSubtitle: {
        margin: '0.2rem 0 0', fontSize: '0.75rem', color: PF.color.textMuted,
        fontFamily: PF.font.body,
    },
    sidebarCardTitle: {
        margin: '0 0 1rem', paddingBottom: '0.6rem', borderBottom: `1px solid ${PF.color.border}`,
        fontSize: '0.75rem', fontWeight: 600, color: PF.color.text, textTransform: 'uppercase',
        letterSpacing: '0.08em', fontFamily: PF.font.headline,
    },
    label: {
        display: 'block', fontSize: '0.68rem', fontWeight: 500, color: PF.color.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem',
        fontFamily: PF.font.body,
    },
    input: {
        width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.85rem',
        background: PF.color.surfaceLowest, border: `1px solid ${PF.color.borderStrong}`,
        borderRadius: PF.radius.md, color: PF.color.text, fontFamily: PF.font.body,
        fontSize: '0.85rem', outline: 'none',
    },
    btnPrimary: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        padding: '0.6rem 1.25rem', background: PF.color.accent, border: 'none',
        borderRadius: PF.radius.md, color: PF.color.accentText, cursor: 'pointer',
        fontFamily: PF.font.headline, fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.02em',
    },
    btnGhost: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
        padding: '0.55rem 1rem', background: 'transparent', border: `1px solid ${PF.color.borderStrong}`,
        borderRadius: PF.radius.md, color: PF.color.textMuted, cursor: 'pointer',
        fontFamily: PF.font.body, fontSize: '0.8rem', fontWeight: 500,
    },
    chip: {
        display: 'flex', alignItems: 'stretch', height: '34px', borderRadius: PF.radius.md, overflow: 'hidden',
        background: PF.color.surfaceContainer, border: `1px solid ${PF.color.border}`,
    },
    chipRemove: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px',
        background: PF.color.dangerSoft, color: PF.color.danger, border: 'none',
        borderLeft: `1px solid ${PF.color.border}`, cursor: 'pointer',
        transition: 'background-color 0.15s, color 0.15s',
    },
}

/** Theme opcional que ProductImageUploader acepta para verse consistente
 *  dentro del popup de producto sin afectar sus otros usos (Config. de Logo
 *  y Banner), que siguen usando la paleta TEKGEAR por defecto. */
export const PF_UPLOADER_THEME = {
    accent: PF.color.accent,
    accentSoft: PF.color.accentSoft,
    border: PF.color.borderStrong,
    surfaceLowest: PF.color.surfaceLowest,
    surfaceContainer: PF.color.surfaceContainer,
    text: PF.color.text,
    textMuted: PF.color.textMuted,
    radius: PF.radius.lg,
    radiusSm: PF.radius.md,
    font: PF.font.body,
}
