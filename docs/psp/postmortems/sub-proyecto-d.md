# Post-mortem Hito M-004 (sub-proyecto D) — Flujo end-to-end (upload → IA → resultado)

- **Fechas**: 2026-05-20 a 2026-05-21 (retrospectivo, reconstruido a partir de milestones, matriz de trazabilidad, plan de sub-proyecto D y el acta de cierre 2026-05-24)
- **Responsable de cierre**: mateo salas
- **Spec / Plan**: [`docs/superpowers/plans/2026-05-21-sub-proyecto-d.md`](../../superpowers/plans/2026-05-21-sub-proyecto-d.md) (follow-ups de seguridad/a11y/exactitud clínica del flujo).
- **Issues cubiertos**: KAN-46 (Ingesta DICOM), KAN-47 (Motor IA — consumo), KAN-49 (Dashboard), KAN-50 (Alertas), KAN-38 (POST analyze: descarga→PNG→HF→guarda), KAN-40 (features clínicas pre-análisis), KAN-43 (vista de detalle del resultado IA). Requisitos: RF-002 (inferencia HF), RF-006 (visualización resultado + parámetros), RF-007 (sliders de features). Ver [matriz de trazabilidad](../traceability-matrix.md).

> **Nota retrospectiva**: redactado el 2026-06-01, después del cierre. El sub-proyecto D se ejecutó antes de la adopción de PSP (2026-05-22); sin defect log ni timetracking en tiempo real. Campos sin instrumentación marcados como `[no medido]`.

## 1. Alcance entregado

- Flujo end-to-end funcional: upload `.dcm`/`.png`/`.jpg` → conversión a PNG → inferencia en el HF Space → resultado visible en UI con nivel de riesgo, score y recomendación.
- Vista de detalle del resultado IA con parámetros y estado (KAN-43, RF-006).
- Features clínicas pre-análisis siguiendo la convención LIDC-IDRI (KAN-40, RF-007).
- Centro de alertas que destaca casos de riesgo ALTO (KAN-50).
- Follow-ups de endurecimiento ejecutados según el plan: `API_URL` server-only en la server action, filtro `.eq("user_id", user.id)` como defensa en profundidad en el export CSV, disclaimer reforzado en `modelo/page.tsx` vía `AlertBanner`, y `<fieldset>/<legend>` para el grupo de features (WCAG 1.3.1).

**Quedó fuera del alcance original** (documentado como deuda en el plan de D):
- Tests automatizados — el plan dejó "Item 7: Tests" como decisión de equipo pendiente; se difirió (deuda D-006, primer suite en remediación).
- Reescritura del contenido de `modelo/page.tsx` con métricas validadas por el AI Engineer (riesgo aceptado, mitigado con disclaimer).
- Token `brand-surface-dark` en landing ("Item 6", decisión: dejar `bg-slate-950` como está).

## 2. Defectos por fase

| Fase inyección | Fase remoción | Conteo | Severidad mayor | Comentario |
|----------------|---------------|--------|-----------------|------------|
| Coding (A–E, transversal) | Auditoría PSP 2026-05-22 | (transversal) | Crítica/Alta | **D-003** (logging/PHI) y **D-006** (testing), transversales. KAN-46 Ingesta DICOM concentra riesgo residual (validación DICOM sin tests, luego KAN-82 en M-005.5). |

Sin defectos **propios** registrados para M-004 en el defect-log. El plan de D identificó proactivamente dos riesgos de seguridad (filter injection en `.or()` de búsqueda y dependencia exclusiva de RLS en el export CSV) y los cerró antes de que se convirtieran en defectos — eficiencia de prevención, no de detección.

**Eficiencia de revisión del hito** = n/a (0 defectos propios documentados; 2 riesgos mitigados en diseño) [retrospectivo].

## 3. Estimado vs real

| Issue | originalEstimate | timeSpent | Delta (%) |
|-------|------------------|-----------|-----------|
| KAN-38 / KAN-40 / KAN-43 / KAN-46 / KAN-50 | [no medido — D-005] | [no medido] | n/a |

**Total estimado**: [no medido]. **Total real**: [no medido]. **Delta**: n/a.

Baseline de medición se establece desde M-005.5.

## 4. Calidad del producto

- [x] Flujo end-to-end verificado manualmente: upload → análisis → resultado en UI.
- [x] Defensa en profundidad en export CSV (`.eq("user_id", ...)`), además de RLS.
- [x] Filter injection en búsqueda mitigado (escape de `,` `%` `(` `)` antes de `.or()`).
- [x] `API_URL` server-only en la server action `analyze/actions.ts` (no `NEXT_PUBLIC_`).
- [x] Storage path mostrado como texto, nunca como link descargable sin signed URL (regla PHI).
- [ ] Sin tests automatizados del flujo al cierre (D-006). Validación DICOM (luego KAN-82) sin regresión hasta M-007.
- [ ] Cada commit con KAN-XX — no garantizado en D (convención adoptada después).

## 5. Lecciones de proceso

- **Mitigar riesgos en diseño funciona y es barato.** Detectar filter injection y la dependencia exclusiva de RLS *antes* de codificar (en el plan de D) evitó dos defectos de seguridad. Es el patrón opuesto a D-001/D-002 (detectados tarde, en auditoría). Llevar este enfoque a la Definition of Ready.
- **Aceptar deuda explícita es válido si queda registrada.** El contenido inexacto de `modelo/page.tsx` se aceptó como riesgo con disclaimer visible, no se ocultó. Mantener ese estándar de honestidad en el expediente.
- **El flujo clínico crítico (ingesta DICOM) cerró sin tests.** KAN-46 es el módulo de mayor riesgo residual; la validación DICOM no tuvo regresión automatizada hasta M-007. Tests antes de cualquier refactorización de `apps/api/app/api/v1/routers/dicom.py`.

## 6. Acciones de mejora

| Acción | Dueño | Fecha límite | Issue Jira |
|--------|-------|--------------|------------|
| Tests de validación DICOM (KAN-82) y del contrato de inferencia (RF-002) | Juan Esteban Aldana / mateo salas | 2026-06-08 | KAN nuevo (M-007) |
| Añadir "smoke test DICOM" a la Definition of Ready de cualquier issue que toque `dicom.py` | Nicolas Chavez Oliveros | 2026-06-08 | — |
| Validar contenido técnico de `modelo/page.tsx` con el AI Engineer y retirar el disclaimer de "pendiente de validación" | Luis Damián | 2026-06-15 | KAN nuevo (M-008) |

## 7. Anexos

- Defectos: [`defect-log.md`](../defect-log.md) D-003, D-006 (transversales).
- Plan ejecutable: [`docs/superpowers/plans/2026-05-21-sub-proyecto-d.md`](../../superpowers/plans/2026-05-21-sub-proyecto-d.md).
- Densidad de defectos: [`defect-log.md`](../defect-log.md), snapshot 2026-06-01 — KAN-46 Ingesta DICOM como riesgo residual.
- Auditoría base: [`docs/psp/audits/2026-05-22-audit.md`](../audits/2026-05-22-audit.md).
- Nota de nomenclatura: según [milestones.md](../milestones.md), el flujo end-to-end es el **hito M-004 / sub-proyecto D**.
