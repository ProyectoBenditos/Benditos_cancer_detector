# <Título de la decisión / sub-proyecto>

- **Fecha**: <YYYY-MM-DD>
- **Autor(es)**: <Nombre(s)>
- **Estado**: `Borrador` / `Aprobado` / `Implementado` / `Reemplazado por <enlace>`
- **Issues cubiertos**: KAN-NN, KAN-MM, ...

## 1. Contexto

Resumen de la situación que motiva la decisión. ¿Qué problema existe hoy? ¿Por qué ahora?

## 2. Decisión

Qué se va a hacer, en lenguaje claro y verificable. Una frase que cualquier integrante pueda repetir.

## 3. Interfaces

Sección **obligatoria** — no eliminar aunque esté vacía.

### 3.1 Endpoints HTTP / Server actions

| Verbo | Ruta / función | Auth | Request | Response | Errores |
|-------|---------------|------|---------|----------|---------|
| `POST` | `/api/v1/...` | Bearer | `{ ... }` | `{ ... }` | `400`, `401`, `5xx` |

### 3.2 Componentes / Props

```ts
type MiComponenteProps = {
  // ...
};
```

### 3.3 Modelo de datos

Diagrama o tabla de columnas afectadas en Supabase (esquema, RLS, índices).

## 4. Alternativas descartadas

Cada alternativa con 1-2 líneas explicando por qué no se eligió.

- **Alternativa A**: <descripción>. Descartada porque <razón>.
- **Alternativa B**: <descripción>. Descartada porque <razón>.

## 5. Riesgos y mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| <Riesgo 1> | Alta / Media / Baja | Alto / Medio / Bajo | <Acción> |

## 6. Plan de verificación

- [ ] Tests automatizados que cubren la decisión (rutas: `apps/web/.../*.test.ts`, `apps/api/tests/*.py`).
- [ ] Verificación manual documentada en `docs/testing-guide.md` si toca PHI.
- [ ] `/oncoscan-a11y` ejecutado si la UI es clínica.
- [ ] `/oncoscan-clinical-review` ejecutado si la decisión toca PHI o alertas.

## 7. Issues cubiertos

Lista detallada con razón de inclusión (por qué cada issue cae bajo esta spec).

- **KAN-NN** — <resumen>: <razón>.
- **KAN-MM** — <resumen>: <razón>.

## 8. Referencias

- ADRs previas: <enlaces o n/a>
- Especificaciones reemplazadas: <enlace o n/a>
- Documentos externos (RFCs, papers): <enlaces>

---

**Recordatorio de uso**: este template es el resultado de H-020 de la auditoría 2026-05-22. Cuando crees un nuevo spec, copia este archivo a `docs/superpowers/specs/YYYY-MM-DD-nombre-design.md` y borra esta línea de recordatorio.
