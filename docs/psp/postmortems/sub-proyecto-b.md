# Post-mortem Hito M-002 (sub-proyecto B) — Modelo IA entrenado y servible

- **Fechas**: 2026-05-17 a 2026-05-19 (retrospectivo, reconstruido a partir de milestones, defect-log y el acta de cierre 2026-05-24)
- **Responsable de cierre**: mateo salas (cierre PSP) · Luis Damián (AI Engineer, entrenamiento del modelo)
- **Spec / Plan**: sin spec/plan en `docs/superpowers/` — el modelo se entrenó fuera del flujo de specs frontend (Kaggle + Hugging Face). Evidencia técnica en el HF Space `luisdam-oncoscan-ai`.
- **Issues cubiertos**: KAN-47 (Motor IA), KAN-29 (clasificación de riesgo BAJO/MEDIO/ALTO), KAN-39 + KAN-44 (upload aceptando `.dcm`/`.png`/`.jpg` + dependencias de conversión). Requisitos: RF-001 (upload), RF-003 (clasificación de riesgo). Ver [matriz de trazabilidad](../traceability-matrix.md).

> **Nota retrospectiva**: redactado el 2026-06-01, después del cierre. El sub-proyecto B se ejecutó antes de la adopción de PSP (2026-05-22); sin defect log ni timetracking en tiempo real. Campos sin instrumentación marcados como `[no medido]`.

## 1. Alcance entregado

- Modelo ResNet18 con transfer learning entrenado en Kaggle (45 épocas) y evaluado en test set.
- Publicación del modelo como Hugging Face Space `luisdam-oncoscan-ai` con endpoint `/predict`, desacoplando el ciclo de vida del modelo del de la API.
- Clasificación de salida en tres niveles de riesgo (BAJO / MEDIO / ALTO) consumibles por la UI (RF-003).
- Base del flujo de upload con conversión DICOM → PNG (`pydicom`, `Pillow`) que M-003/M-004 consumen.

**Quedó fuera del alcance original**:
- Métrica formal de calidad del modelo (precision/recall por clase) documentada en `docs/` — referida solo en el Space, no integrada al expediente PSP.
- ETL/anonimización formal de datasets (planificado para M-008).
- Tests automatizados del contrato `/predict` (deuda transversal D-006; primer test backend llega en la remediación).

## 2. Defectos por fase

| Fase inyección | Fase remoción | Conteo | Severidad mayor | Comentario |
|----------------|---------------|--------|-----------------|------------|
| Coding (B) | Code Review (auditoría PSP 2026-05-22) | 1 | Crítica | **D-001** — Trazabilidad/Seguridad en la capa de servicio. Corregido en `cbe0fec` (KAN-56). |
| Coding (B) | Code Review (auditoría PSP 2026-05-22) | 1 | Crítica | **D-002** — Secretos expuestos en código. Corregido en `77570e0` (KAN-57). |
| Coding (A–E, transversal) | Auditoría PSP 2026-05-22 | (transversal) | Crítica/Alta | **D-003** (logging/PHI) y **D-006** (testing) — transversales, contabilizados a nivel programa. |

**Eficiencia de revisión del hito** = 0 atrapados antes de Testing / 2 propios = **0%** [retrospectivo]. Los dos defectos propios son los **críticos de seguridad/secretos del programa**; el defect-log los etiqueta como "sub-proyecto B" y la densidad de defectos los ubica en el módulo KAN-48 (API Gateway), donde se integró el cliente del modelo. Ambos están **cerrados**.

## 3. Estimado vs real

| Issue | originalEstimate | timeSpent | Delta (%) |
|-------|------------------|-----------|-----------|
| KAN-47 / KAN-29 | [no medido — D-005] | [no medido] | n/a |

**Total estimado**: [no medido]. **Total real**: [no medido]. **Delta**: n/a.

El entrenamiento en Kaggle no se registró en Jira con `originalEstimate`. Baseline de medición se establece desde M-005.5.

## 4. Calidad del producto

- [x] Modelo evaluado en test set (evidencia en el HF Space; no replicada en `docs/`).
- [x] Endpoint `/predict` servible y consumido end-to-end por M-004.
- [ ] Sin tests pytest del contrato `/predict` al cierre (D-006).
- [x] Secretos retirados del código tras D-002 (`77570e0`).
- [x] Logging sin PHI tras D-001/D-003 (`cbe0fec`, `de8569f`).
- [ ] Cada commit con KAN-XX — no garantizado en B (convención adoptada después).

## 5. Lecciones de proceso

- **Externalizar el modelo al HF Space fue una buena decisión de arquitectura**: desacopló el ciclo de vida del modelo del de la API y simplificó el despliegue. Se conserva como patrón (lección positiva del acta de cierre).
- **La evidencia de calidad del modelo debe vivir en el expediente, no solo en el Space.** Las métricas de evaluación (precision/recall, matriz de confusión) deben quedar versionadas en `docs/` para sustentación académica reproducible.
- **Los secretos y el logging son los defectos más caros y se concentraron aquí.** D-001 y D-002 (críticos) nacieron al integrar el modelo; reforzar la regla PHI/secretos de [[rls-patterns]] y del CLAUDE.md de `apps/api` desde el primer commit de integración.

## 6. Acciones de mejora

| Acción | Dueño | Fecha límite | Issue Jira |
|--------|-------|--------------|------------|
| Versionar métricas de evaluación del modelo en `docs/` (precision/recall, dataset, fecha de entrenamiento) | Luis Damián | 2026-06-15 | KAN nuevo (M-008) |
| Test pytest del contrato `/predict` (forma de respuesta, manejo de error del Space) | Juan Esteban Aldana | 2026-06-08 | KAN nuevo (M-007) |
| `model_version` + `inference_time_ms` + `predicted_at` persistidos por predicción | mateo salas | hecho en M-005.5 (KAN-81) | KAN-81 |

## 7. Anexos

- Defectos: [`defect-log.md`](../defect-log.md) D-001, D-002, D-003, D-006.
- HF Space: `luisdam-oncoscan-ai` — endpoint `/predict`.
- Auditoría base: [`docs/psp/audits/2026-05-22-audit.md`](../audits/2026-05-22-audit.md).
- Nota de nomenclatura: según [milestones.md](../milestones.md), el modelo IA corresponde al **hito M-002 / sub-proyecto B**. La cadena de specs frontend de `docs/superpowers/` usa la letra "B" para el design system; son numeraciones paralelas distintas.
