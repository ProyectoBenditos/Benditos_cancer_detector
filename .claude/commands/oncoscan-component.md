---
description: Crea un nuevo componente UI reutilizable para OncoScan siguiendo el design system
argument-hint: <NombreComponente>
allowed-tools: Read, Edit, Write, Glob, Grep
---

Voy a crear el componente `$ARGUMENTS` para OncoScan usando el skill `frontend-design:frontend-design`.

**Paso 1 — Contexto del design system**

Lee estos archivos antes de generar código:
- `apps/web/src/app/globals.css` (tokens de color disponibles)
- `apps/web/src/components/ui/*.tsx` (patrones existentes — no reinventar)
- `apps/web/CLAUDE.md` (reglas de color, accesibilidad y convenciones)

**Paso 2 — Preguntar al usuario antes de implementar**

Pregunta en un solo mensaje:
1. ¿Qué variantes necesita? (primary / secondary / danger / ghost / outline — marcar las que aplican)
2. ¿Qué tamaños? (sm / md / lg)
3. ¿Qué estados? (default / hover / disabled / loading / active)
4. ¿Necesita `forwardRef`? (solo si hay un caso de uso real — e.g. integración con form library)

No avanzar hasta recibir respuesta.

**Paso 3 — Implementar**

Crear `apps/web/src/components/ui/$ARGUMENTS.tsx` con:

```tsx
// Requisitos:
// - Export nombrado (no default export)
// - Props tipadas con TypeScript (interface o type)
// - `className` componible: usar cn() de @/lib/utils o clsx — nunca reemplazar clases, siempre extender
// - Tokens de tailwind (brand-primary, brand-danger, etc.) en lugar de colores hardcoded
// - Rojo (brand-danger) solo para alertas clínicas críticas
// - forwardRef solo si el usuario lo confirmó en el paso anterior
```

**Paso 4 — Validar accesibilidad** (usar skill `maestro:a11y-audit`)

Verificar:
- Contraste ≥ 4.5:1 para texto, ≥ 3:1 para UI elements
- Foco visible (ring) en todos los estados interactivos
- `aria-hidden="true"` en iconos decorativos de lucide-react
- `aria-label` en iconos que son la única etiqueta del control
- Navegación por teclado funcional

**No crear** historias, demos, tests ni documentación adicional salvo que el usuario lo pida explícitamente.
