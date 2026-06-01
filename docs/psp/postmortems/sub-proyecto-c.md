# Post-mortem Hito M-003 (sub-proyecto C) — API funcional con autenticación

- **Fechas**: 2026-05-19 a 2026-05-20 (retrospectivo, reconstruido a partir de milestones, matriz de trazabilidad y el acta de cierre 2026-05-24)
- **Responsable de cierre**: mateo salas
- **Spec / Plan**: la API FastAPI se construyó fuera del flujo de specs frontend. La cadena `docs/superpowers/` reutiliza la letra "C" para un sub-proyecto de merge de frontend, que es una numeración paralela distinta (ver nota de nomenclatura).
- **Issues cubiertos**: KAN-48 (API Gateway), KAN-51 (RBAC/Auth), KAN-42 (historial DICOM con columnas riesgo/score). Requisitos: RNF-006 (auth JWT Bearer en `/api/v1/*`), RF-008 (historial DICOM). Ver [matriz de trazabilidad](../traceability-matrix.md).

> **Nota retrospectiva**: redactado el 2026-06-01, después del cierre. El sub-proyecto C se ejecutó antes de la adopción de PSP (2026-05-22); sin defect log ni timetracking en tiempo real. Campos sin instrumentación marcados como `[no medido]`.

## 1. Alcance entregado

- API FastAPI con los routers `/api/v1/dicom/*` y `/api/v1/analysis/*`.
- Autenticación JWT Bearer obligatoria en todas las rutas `/api/v1/*` (RNF-006), validando el `access_token` de la sesión de Supabase.
- Proxy server-side hacia el HF Space: el frontend nunca llama al modelo directamente; pasa por FastAPI con el bearer del usuario.
- Historial DICOM con columnas de riesgo/score consumibles por la UI (RF-008, KAN-42).

**Quedó fuera del alcance original**:
- Tests pytest del backend — no existían al cierre; el primer suite (`test_logging.py`, 24 verdes) llega en la remediación 2026-05-22 (deuda D-006).
- Multi-tenancy y RLS sin recursión (cerrados en M-005/E).
- Migración de `NEXT_PUBLIC_API_URL` → `API_URL` server-only (diferido y ejecutado en follow-ups de M-004/D).

## 2. Defectos por fase

| Fase inyección | Fase remoción | Conteo | Severidad mayor | Comentario |
|----------------|---------------|--------|-----------------|------------|
| Coding (A–E, transversal) | Auditoría PSP 2026-05-22 | (transversal) | Crítica/Alta | **D-003** (logging/PHI) y **D-006** (testing). El módulo KAN-48 (API Gateway) concentró los defectos críticos del programa (densidad 0.60), aunque etiquetados como sub-proyecto B en el log. |

Sin defectos **propios** registrados para M-003 en el defect-log. Esto refleja ausencia de instrumentación en tiempo real más que ausencia de defectos; el expediente fiel registra 0 defectos propios documentados.

**Eficiencia de revisión del hito** = n/a (0 defectos propios documentados) [retrospectivo].

## 3. Estimado vs real

| Issue | originalEstimate | timeSpent | Delta (%) |
|-------|------------------|-----------|-----------|
| KAN-48 / KAN-51 / KAN-42 | [no medido — D-005] | [no medido] | n/a |

**Total estimado**: [no medido]. **Total real**: [no medido]. **Delta**: n/a.

Baseline de medición se establece desde M-005.5.

## 4. Calidad del producto

- [x] Auth JWT Bearer obligatoria verificada en `/api/v1/*` (RNF-006).
- [x] El frontend no expone el HF Space ni URLs de Storage sin signed URL server-side (regla PHI del CLAUDE.md raíz).
- [ ] Sin tests pytest del backend al cierre (D-006). El gate `test_analysis::test_401_sin_bearer` queda como pendiente en la matriz.
- [x] 0 `print()` productivo en `apps/api/app/` (verificado en auditorías posteriores).
- [ ] Cada commit con KAN-XX — no garantizado en C (convención adoptada después).

## 5. Lecciones de proceso

- **El proxy server-side con bearer fue la decisión correcta de seguridad**: mantener al cliente fuera del contacto directo con el modelo y el Storage cerró un vector de exposición de PHI desde el inicio de la API.
- **Una API sin tests de contrato es frágil ante refactorizaciones.** El gate `test_401_sin_bearer` debió existir desde C; su ausencia (D-006) significó que la regla de auth no tenía regresión automatizada hasta la remediación.
- **La doble numeración de "sub-proyectos" generó ruido de trazabilidad.** Tener una cadena de specs (A→E) en `docs/superpowers/` distinta de los hitos PMBOK (M-001..M-005) dificultó mapear commits a hitos a posteriori. `milestones.md` ya consolidó hitos como ancla única; mantenerlo.

## 6. Acciones de mejora

| Acción | Dueño | Fecha límite | Issue Jira |
|--------|-------|--------------|------------|
| Test pytest `test_analysis::test_401_sin_bearer` (auth obligatoria) | Juan Esteban Aldana | 2026-06-08 | KAN nuevo (M-007) |
| Backfill documental de commits del backend sin referencia KAN-XX en la matriz de trazabilidad | mateo salas | post-defensa | nota en [traceability-matrix.md](../traceability-matrix.md) |
| Usar el hito como ancla única de avance; no reintroducir numeración de sub-proyectos en specs nuevas | equipo | recurrente | — |

## 7. Anexos

- Defectos: [`defect-log.md`](../defect-log.md) D-003, D-006 (transversales).
- Densidad de defectos por módulo: [`defect-log.md`](../defect-log.md), snapshot 2026-06-01 — KAN-48 API Gateway (0.60).
- Auditoría base: [`docs/psp/audits/2026-05-22-audit.md`](../audits/2026-05-22-audit.md).
- Nota de nomenclatura: según [milestones.md](../milestones.md), la API con auth es el **hito M-003 / sub-proyecto C**. El archivo [`docs/superpowers/specs/2026-05-20-sub-proyecto-c-design.md`](../../superpowers/specs/2026-05-20-sub-proyecto-c-design.md) usa "C" para un sub-proyecto de merge de frontend (numeración paralela), no para esta API.
