# Google Stitch Integration Guide

## Setup ✅
- ✅ Token configurado en `~/.claude/settings.json` bajo `mcpServers.stitch`
- ✅ `@google/stitch-sdk@0.3.5` instalado (API real, no stub)
- ✅ `stitch-mcp-server@1.0.7` configurado como MCP Server
- ✅ Servicio `src/services/stitchImporter.js` reescrito con API real

---

## API Real (NO stubs)

El servicio ahora usa la API real del SDK:

```javascript
import { getOrCreateClient } from '@google/stitch-sdk';

// Listar todos tus proyectos
const projects = await stitch.projects();

// Obtener screens (diseños) de un proyecto
const screens = await project.screens();

// Obtener HTML o imagen de un diseño
const html = await screen.getHtml();
const imageUrl = await screen.getImage();
```

**Funciones disponibles** en `src/services/stitchImporter.js`:
- `listAllProjects()` → Todos tus proyectos
- `listAllDesigns()` → Todos tus diseños/screens
- `getDesignHTML(projectId, screenId)` → HTML crudo del diseño
- `getDesignImage(projectId, screenId)` → URL de imagen/captura
- `getDesignDetails(projectId, screenId)` → HTML + imagen + metadatos

---

## Cómo usar desde CLI

```bash
node scripts/list-stitch-designs.js
```

**Output:**
```
✅ Found 2 project(s) and 5 design(s)

📋 PROJECTS:

1. E-commerce Mobile
   ID: projects/abc123
   Designs: 3

📋 DESIGNS:

1. [E-commerce Mobile] Hero Section
   Screen ID: screens/xyz789
   Project ID: projects/abc123
```

---

## Cómo usar desde Chat de Claude

### Opción 1: Listar mis diseños
```
Lista todos mis diseños de Google Stitch
```
Claude usará `listAllDesigns()` para mostrarte la lista con IDs.

### Opción 2: Obtener HTML de un diseño
```
Obtén el HTML del diseño "Hero Section" y conviértelo a componente React
```
Claude llamará `getDesignHTML(projectId, screenId)` y adaptará el HTML.

### Opción 3: Obtener imagen/captura de un diseño
```
Muéstrame una previsualización del diseño "Product Card" de Stitch
```
Claude llamará `getDesignImage()` para mostrar la captura.

---

## Diferencias vs Versión Anterior

| Aspecto | Antes (ROTO) | Ahora (FUNCIONAL) |
|--------|--------------|------------------|
| **Import** | `import { StitchClient }` ❌ | `import { getOrCreateClient }` ✅ |
| **API** | `stitchClient.listDesigns()` ❌ | `stitch.projects()` ✅ |
| **Métodos** | `exportAsReact()` ❌ | `screen.getHtml()` ✅ |
| **Exports** | No existían ❌ | `listAllDesigns()`, `getDesignHTML()` ✅ |

---

## Archivos Clave
| Archivo | Función |
|---------|---------|
| `src/services/stitchImporter.js` | ✅ API correcta con `getOrCreateClient` |
| `scripts/list-stitch-designs.js` | ✅ Script CLI funcional |
| `~/.claude/settings.json` | MCP Server `stitch` con `STITCH_API_KEY` |
| `.env.local` | `VITE_GOOGLE_STITCH_API_KEY` (para Vite) |

---

## Limitaciones de la API Real de Stitch

- ✅ Puedes obtener **HTML crudo** del diseño
- ✅ Puedes obtener **imagen/captura** del diseño
- ✅ Puedes **editar o generar variantes** de diseños
- ❌ No hay exportación directa a React (necesita conversión manual)
- ❌ No hay extracción automática de tokens (necesita parsing de HTML)

**Recomendación:** Usar `getDesignHTML()` + manual Tailwind conversion, o usar `getDesignImage()` para referencia visual mientras codeas.
