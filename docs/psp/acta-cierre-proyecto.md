# ACTA DE CIERRE DEL PROYECTO

**Fecha:** 2026-05-24
**Nombre del Proyecto:** OncoScan — Plataforma académica de apoyo a la detección temprana de cáncer pulmonar
**Fecha de conclusión del proyecto:** 2026-05-22 (cierre del alcance MVP académico, hitos M-001 a M-005)

---

## Datos generales

| Campo | Valor |
|-------|-------|
| Código del proyecto | OncoScan-MVP-2026 |
| Patrocinador | Cuerpo docente — asignatura de Proyecto Integrador |
| Cliente | Comunidad académica (uso educativo, no clínico) |
| Director del proyecto | Mateo Salas |
| Equipo | Mateo Salas, Nicolas Chavez Oliveros, Luis Damián |
| Fecha de inicio | 2026-05-15 |
| Fecha de conclusión | 2026-05-22 |
| Clasificación | Sin clasificar — uso académico |
| Versión del documento | 1.0 |

---

## Beneficios alcanzados

- Validación de una arquitectura end-to-end (Next.js + FastAPI + Supabase + Hugging Face) que ejecuta el flujo completo de carga DICOM → inferencia IA → resultado visible en UI.
- Modelo de IA propio (`luisdam-oncoscan-ai`, ResNet18 transfer learning, 45 épocas) entrenado, evaluado y publicado como Space reutilizable.
- Plataforma con autenticación real, multi-tenancy básico y políticas RLS funcionales sobre datos sensibles (PHI).
- Disciplina PSP adoptada en mitad del proyecto: hitos formales, auditorías, post-mortems, defect log y matriz de trazabilidad como base reutilizable para fases posteriores.
- Design system fundacional y librería de componentes UI accesibles (Button, RiskBadge, StatusBadge, etc.) con tokens documentados y cobertura inicial de pruebas Vitest.
- Evidencia académica suficiente (specs, planes, post-mortems, auditorías) para sustentar la entrega final.

---

## Entregables finalizados

| # | Entregable | Hito | Estado | Observaciones |
|---|-----------|------|--------|---------------|
| 1 | Design system fundacional (tokens, componentes, guía de uso) | M-001 | Completado | Sub-proyecto A. Documentado en `apps/web/CLAUDE.md`. |
| 2 | Modelo IA entrenado y servible en HF Space | M-002 | Completado | Sub-proyecto B. ResNet18, evaluado en test set. |
| 3 | API FastAPI con autenticación JWT obligatoria | M-003 | Completado | Sub-proyecto C. Endpoints `/api/v1/dicom/*`, `/api/v1/analysis/*`. |
| 4 | Flujo end-to-end upload → IA → resultado en UI | M-004 | Completado | Sub-proyecto D. Soporta `.dcm`, `.png`, `.jpg`. |
| 5 | Asociación opcional de paciente + RLS sin recursión + signup vía trigger | M-005 | Completado | Sub-proyecto E. Commits `bb83b40`, `4944908`, `dac55d0`. |
| 6 | Documentación PSP (metodología, hitos, auditorías, post-mortems, matriz de trazabilidad) | Transversal | Completado | `docs/psp/`. Base reutilizable para fases F+. |
| 7 | Disciplina PSP operativa con auditoría ≥ 80% de cumplimiento | M-006 | **Pendiente** | En remediación; no bloquea entrega académica del MVP. |
| 8 | Cobertura de tests Vitest ≥ 22% (8/36 páginas) y suite pytest mínima | M-007 | **Pendiente** | Planificado para 2026-06-08. |
| 9 | ETL/anonimización formal de datasets TCIA/GDC | M-008 | **Pendiente** | Fuera del alcance MVP. |
| 10 | Monitoreo y dashboards operativos | M-009 | **Pendiente** | Fuera del alcance MVP. |
| 11 | Entrega académica final integrada + post-mortem global | M-010 | **Pendiente** | En curso; este acta forma parte del paquete. |

**Verificación del alcance:** los entregables 1 a 6 cumplen los criterios de cierre acordados en `docs/psp/milestones.md`. Los entregables 7 a 11 corresponden a la fase de consolidación posterior al MVP y se cierran formalmente en una segunda acta cuando concluya M-010.

---

## Encuesta de satisfacción

Escala: 1 = malo, 2 = regular, 3 = bueno, 4 = muy bueno, 5 = excelente.
*A llenar por el cliente / patrocinador en la sesión de cierre.*

| Dimensión | Calificación |
|-----------|--------------|
| Objetivos | ___ |
| Plazo     | ___ |
| Costo     | ___ |
| Calidad   | ___ |
| Equipo    | ___ |
| **GENERAL** | ___ |

---

## Lecciones aprendidas

### ¿Qué no querríamos volver a vivir en este proyecto?

- Detectar una recursión infinita de RLS en el primer login posterior al deploy local (sub-proyecto E). El defecto era de fase de diseño y se removió en producción local, lo que aumentó el costo de la corrección.
- Cerrar sub-proyectos sin `originalEstimate` poblado en Jira, lo que impidió calcular delta estimado vs real de forma confiable.
- Adoptar la disciplina PSP a mitad del proyecto: los sub-proyectos A–D quedaron sin defect log ni post-mortem formal en tiempo real, sólo retrospectivo.

### ¿Qué hicimos bien (o muy bien)?

- Separación clara por sub-proyectos académicos (A–E) con hito y entregable verificable cada uno.
- Decisión temprana de externalizar el modelo IA a un Hugging Face Space, lo que desacopló el ciclo de vida del modelo del de la API.
- Migración del signup a un trigger `on_auth_user_created` en Supabase: cerró un vector de bypass de RLS desde el cliente y simplificó el flujo.
- Documentación viva en `docs/` (specs, planes, auditorías, post-mortems), trazable con commits convencionales `tipo(KAN-XX): ...`.
- Slash commands del proyecto (`/oncoscan-component`, `/oncoscan-a11y`, `/oncoscan-clinical-review`, `/oncoscan-psp-audit`) que estandarizaron tareas repetitivas.

### ¿Qué podríamos haber hecho mejor?

- Establecer un patrón de "smoke query" obligatorio tras cada migración de policies RLS, antes de promover a entorno compartido.
- Activar la regla Jira de `originalEstimate` obligatorio desde el sub-proyecto A, no desde el F.
- Escribir tests Vitest del flujo de signup y de las server actions con efecto RLS antes del cierre del MVP, no después.
- Definir la matriz de trazabilidad (requisito → spec → código → prueba → evidencia) desde el inicio en lugar de reconstruirla a posteriori.

### ¿Cómo podríamos haber obtenido más información para evitar los problemas principales?

- Mantener un `defect-log.md` activo desde el día 1, no desde la auditoría de remediación.
- Ejecutar la auditoría PSP (`/oncoscan-psp-audit`) tras cada hito y no sólo al final.
- Incluir un paso explícito de "revisar policies RLS con query de prueba" en la Definition of Ready de cualquier issue que toque Supabase.

### Reflexión personal del equipo

- Cada integrante puede aportar al cierre respondiendo, opcionalmente: ¿cómo podría haber mejorado mi aporte? ¿en qué situación pude haber aportado más al resultado?

---

## Otros comentarios

- Este acta cierra formalmente el alcance MVP académico (hitos M-001 a M-005). Los hitos M-006 a M-010 quedan vivos en `docs/psp/milestones.md` y se cierran en un acta posterior al concluir la entrega académica final.
- Razón de cierre parcial: los entregables 7 a 11 corresponden a la fase de consolidación post-MVP y su no completitud al 2026-05-22 está prevista en el cronograma original, no es una cancelación.
- Liberación de recursos: el equipo conserva los accesos a Supabase, Hugging Face Space y repositorio durante la fase de consolidación. La infraestructura (Supabase, Vercel/host de la web, HF Space) permanece activa hasta la entrega final del 2026-06-29.
- Documentos de soporte:
  - `docs/psp/milestones.md` — hitos y criterios de cierre.
  - `docs/psp/postmortems/sub-proyecto-e.md` — último post-mortem cerrado.
  - `docs/psp/audits/2026-05-22-audit-postremediation.md` — última auditoría PSP.
  - `docs/mvp_status.md` — estado funcional del MVP.

---

## Conformidad

Por medio de la presente expresamos nuestra conformidad sobre los entregables del proyecto y damos por concluido el mismo en el alcance descrito.

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Patrocinador | _________________________ | _________________________ | ___ / ___ / ______ |
| Cliente | _________________________ | _________________________ | ___ / ___ / ______ |
| Director del Proyecto | Mateo Salas | _________________________ | ___ / ___ / ______ |

---

*Documento — Acta de Cierre del Proyecto OncoScan · Versión 1.0 · 2026-05-24 · Sin clasificar · Página 1 de 1*
