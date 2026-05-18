---
description: Revisa seguridad clínica, PHI, jerarquía de alertas y patrones de IA en un archivo o ruta
argument-hint: [archivo o ruta — omitir para revisar toda la plataforma]
allowed-tools: Read, Glob, Grep
---

Voy a hacer una revisión clínica y de seguridad de `$ARGUMENTS` usando los skills `maestro:code-review` y `maestro:security-engineer`.

**Alcance**

Si se especifica un archivo: revisar solo ese archivo.
Si se especifica una ruta: revisar todos los `.tsx` y `.ts` dentro.
Si no se especifica nada: revisar `apps/web/src/app/platform/`.

**Checklist de revisión clínica**

### 1. Jerarquía de alertas — uso del color rojo

- [ ] `brand-danger` (#e11d48) solo aparece en alertas clínicas críticas
- [ ] Errores genéricos de UI (validación, red, 404) usan `slate` o colores neutros
- [ ] `StatusBadge` con `ai_failed` no usa rojo — es un estado operacional, no una alerta clínica

### 2. Disclaimer de IA

- [ ] Toda pantalla que muestre resultados del modelo incluye texto visible: "herramienta de apoyo, no sustituye criterio clínico" (o equivalente)
- [ ] El disclaimer no está oculto ni es ilegible (contraste, tamaño de fuente)

### 3. PHI — nunca en logs

Buscar patrones: `console.log`, `console.error`, `console.warn`, `print(`

- [ ] Ningún log contiene `email`, `file_path`, `Case_Ref`, `result_json`
- [ ] Mensajes de error al usuario son genéricos (sin datos técnicos internos)

### 4. Acciones críticas con confirmación

- [ ] Subida de DICOM: muestra confirmación antes de procesar
- [ ] Eliminación de casos o archivos: requiere confirmación explícita
- [ ] Re-ejecución del modelo IA: confirma si ya hay un resultado previo

### 5. Estados de IA con badges semánticos

- [ ] `processing` → `StatusBadge` variant processing (no texto plano "En proceso")
- [ ] `ai_completed` → `StatusBadge` variant success
- [ ] `ai_failed` → `StatusBadge` variant error (color neutro, no rojo clínico)
- [ ] No mostrar el `result_json` crudo al usuario

### 6. Storage — URLs privadas

- [ ] Ningún componente cliente recibe URLs directas de Supabase Storage
- [ ] Las URLs se generan server-side como signed URLs con expiración
- [ ] No hay `supabaseUrl + '/storage/v1/object/public/'` en el cliente

**Formato del reporte**

```
## Revisión clínica — <archivo o ruta>

### Crítico (bloquea release)
- archivo.tsx:42 — Descripción + solución

### Mayor (debe corregirse antes del próximo sprint)
- archivo.tsx:87 — Descripción + solución

### Menor (recomendación)
- archivo.tsx:103 — Descripción + solución

### Aprobado
- PHI: sin logs sensibles encontrados ✓
```
