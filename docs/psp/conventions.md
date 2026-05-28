# Convenciones — OncoScan PSP

Documento que fija las convenciones operativas del proyecto. Cualquier cambio se discute en stand-up y queda anclado a un commit `docs(KAN-XX): …` que toque este archivo.

## Convención de commits

### Formato

```
tipo(KAN-XX): descripción breve en español

(cuerpo opcional con bullets — el detalle del por qué y los archivos)
```

- `tipo` ∈ `feat | fix | chore | docs | refactor | style | test`.
- `KAN-XX` es la clave del issue Jira que la acción cierra o avanza. Si el commit cubre varios issues, citar el más representativo en el `tipo()` y mencionar los otros en el cuerpo.
- `descripción` ≤ 72 caracteres, sin punto final, en imperativo o pretérito perfecto (consistente con el histórico del repo).
- Cuerpo: bullets en presente, explicando el *por qué* del cambio.

### Vigencia

- La convención `tipo: descripción` (sin clave Jira) rige desde el commit [`dace374`](../../) (2026-05-17).
- La convención `tipo(KAN-XX): descripción` rige desde el commit [`de8569f`](../../) (2026-05-22), correspondiente a KAN-55.
- Commits previos a `dace374` (~14, ~17% del histórico) no llevan tipo. No se reescriben — son históricos.

### Hook commit-msg

[`.githooks/commit-msg`](../../.githooks/commit-msg) valida la convención. Se eligió `.githooks/` portable en lugar de `apps/web/.husky/` para no acoplarlo al instalador de npm de la app web y para que aplique al repo completo.

**Activación local (cada integrante, una sola vez):**

```sh
git config core.hooksPath .githooks
```

En Windows el hook funciona porque Git Bash interpreta el shebang. Si Git no lo invoca como script, marcar permisos: `chmod +x .githooks/commit-msg` (ya commiteado).

Regex validada:

```
^(feat|fix|chore|docs|refactor|style|test)(\([A-Za-z0-9_-]+\))?(\(KAN-\d+\))?: .{4,}$
```

Override con `--no-verify` está permitido solo para Mateo Salas (admin del repo) en correcciones de emergencia, y debe quedar registrado en el cuerpo del siguiente commit normal.

## Configuración Jira

### Acciones manuales pendientes (no expuestas por MCP)

| Acción | Responsable | Estado |
|--------|-------------|--------|
| Crear Components `frontend`, `backend`, `ai-model`, `infra`, `docs` en KAN | Other_Sotelo | **Pendiente** — el MCP de Atlassian no expone la API de Components. Se hace desde Jira admin → Project Settings → Components. |
| Activar workflow rule: rechazar transición a "Desarrollo" si `originalEstimate` está vacío | Other_Sotelo | **Pendiente** — configuración en Jira admin → Workflow editor. Activar **al final** de Día 10, una vez el equipo ya estima por hábito. |
| Definir reglas de obligatoriedad para campos `assignee`, `parent`, `labels` en creación de issue | Other_Sotelo | Pendiente — opcional, complemento al workflow rule. |

### Estructura de Epics (creada 2026-05-22)

| Epic | Key | Owner | Módulo |
|------|-----|-------|--------|
| Ingesta DICOM | KAN-46 | Other_Sotelo | Ingesta DICOM |
| Motor IA | KAN-47 | Other_Sotelo | Motor IA |
| API Gateway | KAN-48 | Other_Sotelo | API Gateway |
| Dashboard | KAN-49 | Other_Sotelo | Dashboard |
| Alertas clínicas | KAN-50 | Other_Sotelo | Alertas clínicas |
| RBAC / Auth | KAN-51 | Other_Sotelo | RBAC / Auth |
| ETL / Anonimización | KAN-52 | Other_Sotelo | ETL / Anonimización |
| Auditoría / Trazabilidad | KAN-53 | Other_Sotelo | Auditoría / Trazabilidad |
| Monitoreo / Observabilidad | KAN-54 | Other_Sotelo | Monitoreo / Observabilidad |

## Estructura de archivos

- `docs/psp/audits/YYYY-MM-DD-audit.md` — un archivo por auditoría. No reescribir reportes pasados.
- `docs/psp/postmortems/sub-proyecto-X.md` — un archivo por cierre de sub-proyecto.
- `docs/superpowers/specs/YYYY-MM-DD-nombre-design.md` — un spec por decisión arquitectónica.
- `docs/superpowers/plans/YYYY-MM-DD-nombre.md` — un plan por sub-proyecto.

## Política `print()` / `console.*`

- Backend: `print()` prohibido fuera de `apps/api/scripts/` (con `# noqa: T201`). Usar `log_event` de [`apps/api/app/core/logging.py`](../../apps/api/app/core/logging.py).
- Frontend: `console.*` permitido solo en error boundaries (`error.tsx`) y solo con campos no-PHI (típicamente `error.digest`). Resto debe ir a telemetría server-side cuando se implemente.

Detalle ampliado en [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) y [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md).
