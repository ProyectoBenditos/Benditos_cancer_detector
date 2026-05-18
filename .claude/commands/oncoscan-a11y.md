---
description: Audita accesibilidad WCAG AA de un archivo o ruta de la plataforma OncoScan
argument-hint: [archivo o ruta — omitir para auditar toda la plataforma]
allowed-tools: Read, Glob, Grep
---

Voy a auditar la accesibilidad de `$ARGUMENTS` usando el skill `maestro:a11y-audit`.

**Alcance del audit**

Si se especifica un archivo: auditar solo ese archivo.
Si se especifica una ruta de directorio: auditar todos los `.tsx` dentro.
Si no se especifica nada: auditar `apps/web/src/app/platform/`.

**Checklist específico de OncoScan**

Verificar cada item con referencia exacta `archivo:línea`:

### Contraste de color
- [ ] Texto sobre `brand-sidebar` (#0a0a0a): verificar que el texto claro tenga ratio ≥ 4.5:1
- [ ] Texto sobre `brand-danger` (#e11d48): verificar contraste del texto encima
- [ ] Badges de estado (`processing`, `ai_completed`, `ai_failed`): contraste ≥ 4.5:1
- [ ] Elementos UI (bordes, separadores): ratio ≥ 3:1 contra su fondo

### Iconos (lucide-react)
- [ ] Iconos decorativos tienen `aria-hidden="true"`
- [ ] Iconos que son la única etiqueta visual del control tienen `aria-label`

### Foco visible
- [ ] Todos los elementos interactivos tienen ring de foco visible
- [ ] `PhantomButton` y `PhantomLink` tienen foco visible

### ARIA y roles
- [ ] Toasts de `sonner`: `role="status"` para info/success, `role="alert"` para errores
- [ ] Alertas clínicas críticas: `role="alert"` + `aria-live="assertive"`
- [ ] Formularios: `<label>` asociado a cada input, o `aria-label`
- [ ] Tablas: `<th scope="col">` en encabezados

### Navegación por teclado
- [ ] Orden de tab lógico
- [ ] Modales y dropdowns atrapan el foco mientras están abiertos
- [ ] Escape cierra modales

**Formato del reporte**

```
## Hallazgos de accesibilidad — <archivo o ruta>

### Crítico
- [ ] archivo.tsx:42 — Descripción del problema + solución sugerida

### Mayor
- [ ] archivo.tsx:87 — Descripción del problema + solución sugerida

### Menor
- [ ] archivo.tsx:103 — Descripción del problema + solución sugerida

### Aprobado
- [x] Contraste de texto principal ✓
```

Reportar solo hallazgos reales con evidencia de `archivo:línea`. No inventar problemas.
