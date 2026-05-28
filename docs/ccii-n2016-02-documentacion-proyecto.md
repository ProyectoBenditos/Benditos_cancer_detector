# Documentación del Proyecto OncoScan / Benditos Cancer Detector

**Estándar de referencia:** Norma CCII-N2016-02 — Norma para la Elaboración de Documentación de Proyectos de Ingeniería Informática (Consejo de Colegios de Ingenieros en Informática de España).

**Versión del documento:** 1.0
**Fecha de emisión:** 2026-05-24
**Estado:** Borrador para revisión académica.

---

## 1. Introducción

El presente documento constituye la **Memoria integral del proyecto OncoScan / Benditos Cancer Detector**, una plataforma académica de apoyo a la detección temprana de cáncer pulmonar mediante análisis automatizado de imágenes médicas con modelos de inteligencia artificial. Se ha elaborado siguiendo la estructura prescrita por la **Norma CCII-N2016-02** y se ofrece como entrega documental única que reúne, ordena y formaliza la información dispersa en el repositorio (`docs/`, `apps/web/`, `apps/api/`, `.claude/`, Jira KAN y artefactos PSP).

**Propósito.** Proveer una visión completa y trazable del proyecto a tres audiencias simultáneas:

- **Audiencia académica / docente:** verificar el cumplimiento de los requisitos de la asignatura, el alcance del MVP, el rigor metodológico (Personal Software Process — PSP) y la calidad de los entregables.
- **Audiencia técnica (ingenieros, futuros mantenedores):** disponer de la arquitectura, los requisitos numerados (RF/RNF), la matriz de trazabilidad, los hitos y las decisiones de diseño en un único punto de consulta.
- **Audiencia no técnica (clientes potenciales, directivos, comité ético):** comprender el objeto, alcance, riesgos clínicos y limitaciones del sistema sin necesidad de leer código.

**Estructura del documento.** Sigue las **20 secciones principales y los anexos** definidos por la norma, comenzando por el objeto del proyecto y los antecedentes, continuando por la situación actual, normas, requisitos, alcance, alternativas, solución, riesgos, organización, planificación y presupuesto, y cerrando con los anexos técnicos (análisis y diseño, estimación, planes de gestión PMBOK, plan de seguridad), las especificaciones detalladas, el presupuesto desglosado y los estudios con entidad propia (protección de datos, propiedad intelectual, PRL e impacto ambiental).

**Convenciones tipográficas.** Los identificadores `RF-NNN`, `RNF-NNN`, `KAN-NN`, `M-NNN` y `H-NNN` son estables a lo largo del documento y coinciden con los empleados en Jira y en `docs/requisitos.md`, `docs/psp/milestones.md` y `docs/psp/audits/`. Las rutas relativas referencian artefactos vivos del repositorio.

---

## 2. Objeto del proyecto

**Objetivo final.** Construir una **plataforma web académica** que permita a un usuario autenticado **subir imágenes médicas (DICOM, PNG, JPG) e ingresar 8 features clínicas LIDC-IDRI**, obtener de forma automatizada una **clasificación de riesgo (BAJO / MEDIO / ALTO)** con un score y una recomendación textual generados por un modelo de IA (ResNet18 transfer learning, expuesto en Hugging Face Space `luisdam-oncoscan-ai`), y consultar el historial unificado de estudios y alertas clínicas en un dashboard.

**Finalidad que justifica su ejecución.**

1. **Académica:** servir como proyecto integrador del curso, demostrando dominio de arquitecturas cliente-servidor desacopladas, BaaS, integración con servicios de IA, autenticación, seguridad de datos sanitarios y disciplina de proceso (PSP).
2. **Investigación aplicada:** validar la viabilidad técnica de un pipeline reproducible de apoyo a la decisión clínica en oncología pulmonar, en un entorno controlado, sin pretensión de uso hospitalario productivo.
3. **Formativa para el equipo:** consolidar prácticas profesionales —requisitos numerados ISO/IEC/IEEE 29148, trazabilidad RF↔Issue↔Commit↔Test, hooks de validación, auditorías PSP periódicas, post-mortems— transferibles a futuros proyectos.

**Lo que NO es el objeto del proyecto.** OncoScan **no es un dispositivo médico certificado**, no sustituye el criterio del especialista, no se opera sobre datos reales de pacientes, y no se distribuye fuera del entorno académico controlado.

---

## 3. Antecedentes

- **Necesidad clínica de fondo.** El cáncer de pulmón es la primera causa de mortalidad oncológica mundial; la detección temprana mediante TC de baja dosis está consolidada en guías clínicas pero exige radiólogos especializados y herramientas de soporte computacional. La literatura reciente sobre redes convolucionales aplicadas al *lung nodule classification* (dataset LIDC-IDRI) muestra resultados prometedores en entornos académicos.
- **Contexto académico.** El proyecto nace como entrega del curso para un equipo de 5 estudiantes, sin presupuesto de hardware, con dependencia obligada de infraestructura gratuita (Vercel, Railway free tier, Hugging Face Spaces, Supabase Free, Kaggle para entrenamiento).
- **Hito previo del equipo: MVP de Fase 0.** Antes de la documentación formal, el equipo entregó un MVP funcional end-to-end (issue Jira KAN ONCO-0, cierre el 2026-05-08, commit `dace374` marca el inicio del primer sub-proyecto post-MVP). Ese MVP cubre login, subida DICOM, análisis IA, historial unificado, dashboard y centro de alertas.
- **Sub-proyectos posteriores ejecutados (ver `docs/jira/` y `docs/psp/milestones.md`):**
  - **Sub-proyecto A** (cierre 2026-05-09): workflow de Claude Code con instrucciones jerárquicas y 4 slash commands del proyecto.
  - **Sub-proyecto B** (cierre 2026-05-18): design system fundacional Deep Space Blue + Raspberry Red, 3 componentes nuevos (`Button`, `AlertBanner`, `RiskBadge`), WCAG AA sweep en 6 páginas.
  - **Sub-proyecto C** (cierre 2026-05-21): cierre de follow-ups + merge conceptual de la rama `fronted-nicolas` (páginas Modelo, Reportes, descarga CSV, ajustes, error/loading boundaries, refactor de Analyze a Server Component con server actions).
  - **Sub-proyecto D** (cierre 2026-05-21): integración del módulo IA (rama `ai-service` mergeada en `main`), polling de resultado, persistencia del `result_json`.
  - **Sub-proyecto E** (cierre 2026-05-22): asociación opcional de paciente al upload; resolución de RLS recursiva y race condition de login; signup vía trigger `on_auth_user_created`.
- **Hito metodológico (2026-05-22).** Adopción formal de PSP: definición de las 4 reglas absolutas (trazabilidad, medición, evidencia, calidad), creación del defect-log, catálogo de labels Jira, matriz de trazabilidad, hitos M-001 a M-010, hook de commits `tipo(KAN-XX): descripción` y primera auditoría PSP con 21 hallazgos clasificados por severidad.

Estos antecedentes condicionan el resto del documento: el alcance es estrictamente académico, el equipo está acotado, la infraestructura es gratuita y la trazabilidad PSP es eje transversal de calidad.

---

## 4. Descripción de la situación actual

### 4.1 Descripción del entorno actual

**Sistemas existentes desplegados.**

| Capa | Tecnología | Plataforma | Estado |
|------|-----------|------------|--------|
| Frontend web | Next.js 16 + React 19 + Tailwind 4 + TypeScript | Vercel | Operativo |
| Backend API | FastAPI + Python 3.11 + httpx + pydicom | Railway | Operativo |
| Base de datos | Supabase PostgreSQL (tabla `dicom_uploads`) | Supabase Cloud | Operativo |
| Auth | Supabase Auth (JWT Bearer, middleware Next.js) | Supabase Cloud | Operativo |
| Storage | Supabase Storage, bucket privado `dicom-files` | Supabase Cloud | Operativo |
| Motor IA | ResNet18 transfer learning expuesto vía `POST /predict` | Hugging Face Space `luisdam-oncoscan-ai` | Operativo (con cold-start de 30–60 s) |
| Notebook de entrenamiento | Kaggle Notebook (45 épocas, dataset LIDC-IDRI) | Kaggle | Reproducible vía `demo.py` |

**Arquitectura lógica.** Cliente-servidor desacoplada sobre monorepo (`apps/web/`, `apps/api/`). El backend actúa como proxy autenticado: valida JWT contra Supabase Auth, sube el archivo a Storage, persiste fila en `dicom_uploads` con `upload_status="processing"` y dispara una `BackgroundTask` que invoca el Space de HF; el frontend hace polling cada 3 s sobre `GET /api/v1/analysis/{id}` (timeout 3 min) hasta `ai_completed` o `ai_failed`. El diagrama completo se incluye en el Anexo 17.2.

**Organización afectada.** Equipo académico de 5 integrantes con roles diferenciados (ver § 13.1) operando sin organización cliente externa formalizada.

**Repositorio.** Monorepo `Benditos_cancer_detector` alojado en GitHub. Rama por defecto `main`; rama activa de integración `merge/fronted-nicolas-into-main`. Disciplina de commits con hook `commit-msg` (`tipo(KAN-XX): descripción`) en `.githooks/`.

**Documentación viva.** `docs/` contiene 11 documentos técnicos operativos (setup, deploy, smoke test, arquitectura, requisitos, roadmap, MVP status, testing guide) y un subárbol `docs/psp/` con metodología, convenciones, defect-log, matriz de trazabilidad, hitos, auditorías y post-mortems.

### 4.2 Resumen de las principales deficiencias identificadas

Las deficiencias enumeradas a continuación provienen de la auditoría PSP `docs/psp/audits/2026-05-22-audit.md` (21 hallazgos, clasificación H-001 a H-021) y de la snapshot 2026-05-22 de `docs/psp/psp-methodology.md`:

| # | Deficiencia | Severidad | Estado |
|---|-------------|-----------|--------|
| D1 | 0 de 45 issues Jira con `originalEstimate` o `timeSpent` registrado (sin métricas de tiempo). | Crítica (PSP transversal) | En remediación (workflow rule diferida) |
| D2 | 9 de 45 issues sin `assignee` (20%). | Alta | Cerrada en sub-proyecto E para los 9 históricos |
| D3 | 0 Epics formales (todo issue colgaba directo del backlog) hasta el 2026-05-22. | Crítica | Resuelta — KAN-46 a KAN-54 creados |
| D4 | Sin defect-log estructurado. | Alta | Resuelta — `docs/psp/defect-log.md` creado |
| D5 | Sin post-mortem template ni post-mortems realizados. | Alta | Resuelta — template + post-mortem E publicados |
| D6 | 2 tests automáticos para 16 requisitos (12.5% cobertura RF/RNF). | Alta | En remediación (Fase 6 / M-007) |
| D7 | `pytest` con 0 archivos de prueba en backend. | Alta | Pendiente |
| D8 | Sin componente `RiskBadge`, `AlertBanner` ni `Button` compartido antes del sub-proyecto B; mezcla de `red-*`, `rose-*` y hex hardcoded. | Alta | Resuelta — sub-proyecto B |
| D9 | RLS recursiva en `dicom_uploads` causaba 500 silencioso al consultar historial. | Crítica clínica | Resuelta — sub-proyecto E |
| D10 | Race condition tras login: `router.push` antes de propagar la sesión, generando redirecciones a `/login` con sesión válida. | Alta | Resuelta — sub-proyecto E |
| D11 | Logs de FastAPI emitían PHI (email, file_path, case_ref) en texto plano. | Crítica (RNF-001) | Resuelta — KAN-55, KAN-56, KAN-57 |
| D12 | Sin convención de commits con clave Jira; ~17% del histórico sin tipo. | Media | En adopción desde commit `de8569f` (2026-05-22) |
| D13 | Módulos ausentes: ETL/Anonimización formal, Auditoría/Trazabilidad sistémica, Monitoreo/Observabilidad. | Alta | Hitos M-008 / M-009 pendientes |
| D14 | Sin WBS/EDT formal ni hitos M-001..M-010 antes del 2026-05-22. | Media | Resuelta — `docs/psp/milestones.md` |
| D15 | `NEXT_PUBLIC_API_URL` expuesto al cliente debiendo ser server-only. | Media | Pendiente sub-proyecto D residual |

El detalle completo de los 21 hallazgos, con evidencia, impacto, recomendación y relación PSP/SDLC/PMBOK, se encuentra en el Anexo 17.4.8 (Gestión de riesgos) y en `docs/psp/audits/`.

---

## 5. Normas y referencias

### 5.1 Disposiciones legales y normas aplicadas

| Norma / Disposición | Ámbito | Aplicación en OncoScan |
|---------------------|--------|------------------------|
| **Reglamento (UE) 2016/679 (RGPD)** | Protección de datos personales | Aplicable a `email` de usuarios autenticados y, si se hubiera trabajado con pacientes reales, a todo dato directa o indirectamente identificable. El proyecto opera bajo el principio de **no procesar datos reales de pacientes** (entorno académico). |
| **LO 3/2018 LOPDGDD** | Protección de datos (España) | Lex specialis del RGPD; aplicable a usuarios españoles del sistema. |
| **Reglamento (UE) 2017/745 (MDR)** | Productos sanitarios | **No aplicable** porque OncoScan se declara explícitamente herramienta académica no destinada a uso clínico. |
| **ISO/IEC/IEEE 29148:2018** | Ingeniería de requisitos | Aplicada al numerado de RF/RNF en `docs/requisitos.md`. |
| **ISO/IEC 25010:2011** | Calidad del producto software | Referencia para los RNF (seguridad, accesibilidad, rendimiento, mantenibilidad). |
| **WCAG 2.1 nivel AA** | Accesibilidad web | Aplicada a componentes UI clínicos (RNF-007); auditoría vía `/oncoscan-a11y`. |
| **PMBOK 5ª edición / ISO 21500:2013** | Gestión de proyectos | Base de los 10 planes de gestión del Anexo 17.4. |
| **PSP (Personal Software Process, Watts Humphrey / SEI)** | Proceso personal de software | Marco metodológico transversal (ver `docs/psp/psp-methodology.md`). |
| **OWASP Top 10 2021** | Seguridad de aplicaciones web | Referencia para revisiones de seguridad (validación de inputs, JWT, headers, manejo de errores). |
| **DICOM PS3 (NEMA)** | Formato y comunicaciones de imagen médica | Aplicable a la lectura de metadatos `Modality`, `StudyDate`, `PatientID` vía `pydicom`. |

**Esquema Nacional de Seguridad (ENS) y Esquema Nacional de Interoperabilidad (ENI):** no aplicables al ser un proyecto académico fuera del ámbito de las administraciones públicas españolas.

### 5.2 Bibliografía

1. Humphrey, W. S. *PSP: A Self-Improvement Process for Software Engineers*. Addison-Wesley, 2005.
2. Project Management Institute. *A Guide to the Project Management Body of Knowledge (PMBOK Guide)*, 5th ed. PMI, 2013.
3. Armato III, S. G. *et al.* "The Lung Image Database Consortium (LIDC) and Image Database Resource Initiative (IDRI): A Completed Reference Database of Lung Nodules on CT Scans." *Medical Physics*, 38(2), 2011.
4. He, K. *et al.* "Deep Residual Learning for Image Recognition." *CVPR*, 2016. (Arquitectura ResNet base del modelo).
5. ISO/IEC/IEEE 29148:2018. *Systems and software engineering — Life cycle processes — Requirements engineering*.
6. ISO/IEC 25010:2011. *Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE)*.
7. W3C. *Web Content Accessibility Guidelines (WCAG) 2.1*, 2018. <https://www.w3.org/TR/WCAG21/>
8. NEMA. *DICOM Standard, Part 3: Information Object Definitions*. PS3.3, 2024.
9. Documentación oficial Next.js 16, FastAPI, Supabase, Hugging Face Spaces, Pydicom.
10. CCII (Consejo de Colegios de Ingenieros en Informática). *Norma CCII-N2016-02 para Documentación de Proyectos de Ingeniería Informática*, 2016.

### 5.3 Métodos, Herramientas, Modelos, Métricas y Prototipos

#### 5.3.1 Métodos y Herramientas

| Categoría | Elemento | Uso en el proyecto |
|-----------|----------|--------------------|
| Metodología de proceso | **PSP (Personal Software Process)** | Disciplina transversal documentada en `docs/psp/`. |
| Metodología de gestión | **PMBOK 5ª ed. / ISO 21500** | Estructura los 10 planes de gestión (Anexo 17.4). |
| Ingeniería de requisitos | **ISO/IEC/IEEE 29148** | Numeración RF/RNF, formato de catálogo. |
| Control de versiones | **Git + GitHub** | Monorepo, ramas por sub-proyecto, hook `commit-msg`. |
| Gestión de tareas | **Jira Cloud (proyecto KAN)** | 45 issues a la fecha, 9 Epics, labels y workflow Kanban. |
| Frontend | **Next.js 16, React 19, Tailwind 4, TypeScript, lucide-react, @supabase/ssr** | Aplicación web del cliente. |
| Backend | **FastAPI, Python 3.11, httpx, pydicom, supabase-py** | API REST autenticada. |
| BaaS | **Supabase (PostgreSQL + Auth + Storage)** | Núcleo de infraestructura. |
| IA | **Hugging Face Spaces, PyTorch, ResNet18 transfer learning, dataset LIDC-IDRI** | Entrenamiento en Kaggle y servicio remoto. |
| Despliegue | **Vercel (web), Railway (api)** | PaaS gratuitos. |
| Testing | **Vitest (3 archivos web), pytest (planificado backend), `docs/testing-guide.md` (manual)** | Suite mínima en crecimiento. |
| Validación a11y | **Slash command `/oncoscan-a11y`** (basado en WCAG 2.1 AA) | Auditoría por archivo. |
| Revisión clínica | **Slash command `/oncoscan-clinical-review`** | Detección de PHI, jerarquía de alertas, patrones IA. |
| Auditoría PSP | **Slash command `/oncoscan-psp-audit`** | Cruce Jira ↔ código ↔ docs con reportes deterministas. |
| Asistencia IA al desarrollo | **Claude Code + slash commands del repo + `CLAUDE.md` jerárquico** | Sub-proyecto A — workflow del equipo. |
| Editor estándar | **VS Code** | IDE primario. |

#### 5.3.2 Modelos, Métricas y Prototipos

**Modelos.**
- Modelo IA productivo: **ResNet18 transfer learning** entrenado 45 épocas sobre LIDC-IDRI, expuesto en HF Space `luisdam-oncoscan-ai`. Recibe imagen + 8 features clínicas (Subtlety, InternalStructure, Calcification, Sphericity, Margin, Lobulation, Spiculation, Texture, Malignancy) y devuelve `score ∈ [0,1]`, `risk_level ∈ {BAJO, MEDIO, ALTO}`, `recommendation` y `model_version`.
- Modelo de datos: tabla `public.dicom_uploads` (columnas para metadatos DICOM, JWT del usuario, ruta de Storage, `case_ref`, `patient_id`, `file_type`, `clinical_features`, `ai_score`, `ai_risk_level`, `ai_recommendation`, `ai_model_version`, `ai_processed_at`, `ai_error`, `upload_status`).

**Métricas PSP obligatorias** (definidas en `docs/psp/psp-methodology.md` § 5):
- **Tiempo:** % issues con `originalEstimate`, % issues con `timeSpent`, delta estimado vs real.
- **Tamaño y productividad:** archivos creados/modificados por issue (proxy de LOC), densidad de cambios por sub-proyecto.
- **Calidad / Defectos:** conteo de bugs, densidad bugs/tareas, defectos por fase (revisión / testing / producción), eficiencia de revisión.
- **Gestión:** % issues sin assignee, % sin Epic parent, issues stuck (>14 d sin movimiento).
- **Trazabilidad:** % issues con referencia a commit, % commits sin referencia a issue, % módulos con tests.

**FPA (Análisis de Puntos de Función):** **no aplicado** formalmente al ser proyecto académico de tamaño pequeño. Se ha usado como proxy el conteo de páginas, endpoints, componentes y commits por sub-proyecto (ver Anexo 17.3).

**Prototipos.** El propio MVP de Fase 0 (commit `dace374`) actúa como prototipo evolutivo. No se han producido prototipos throwaway; cada sub-proyecto consolida el anterior. Se conservan capturas y URLs operativas para el smoke test (`docs/smoke-test.md`).

### 5.4 Mecanismos de control de calidad aplicados durante la redacción

- **Trazabilidad documental.** Cada sección referencia el artefacto fuente del repositorio (`docs/...`, `apps/...`, Jira KAN-XX, commit `hash`).
- **Datos reales, no relleno.** Tablas de requisitos, hitos, sub-proyectos y deficiencias se han extraído directamente de los documentos vivos (`docs/requisitos.md`, `docs/psp/milestones.md`, `docs/psp/audits/`, `docs/jira/`).
- **Revisión por slash commands.** Los slash commands `/oncoscan-psp-audit`, `/oncoscan-clinical-review` y `/oncoscan-a11y` actúan como controles automáticos sobre el código y la documentación que esta memoria refleja.
- **Convenciones de commit.** Toda actualización futura de este documento debe seguir `docs(KAN-XX): ...`.
- **Idioma y registro.** Castellano técnico, accesible a audiencias no técnicas en las secciones 1–4 y 11–15.
- **Anonimización.** Ningún ejemplo del documento contiene PHI real. Las trazas o capturas se sustituyen por placeholders (`PEGAR_URL_FRONTEND`, `PEGAR_URL_BACKEND`) o se omiten.

### 5.5 Otras referencias

- `README.md` raíz del proyecto.
- `CLAUDE.md`, `apps/web/CLAUDE.md`, `apps/api/CLAUDE.md` — instrucciones operativas para asistencia IA en desarrollo.
- `docs/architecture_analysis.md` — análisis cliente-servidor con diagrama Mermaid.
- `docs/setup-nuevo-pc.md`, `docs/deploy.md`, `docs/smoke-test.md` — operación.
- `docs/ai-model-changes.md`, `docs/ai-service-migration.sql` — integración del módulo IA.
- `docs/psp/conventions.md`, `docs/psp/labels.md`, `docs/psp/definition-of-ready.md`, `docs/psp/orphan-resolution.md` — operativa PSP.
- Plantilla origen: *D:\Descargas\Plantilla Básica para Documentación Proyectos de SW.pdf* (CCII-N2016-02, primeras dos páginas institucionales omitidas según instrucción).

---

## 6. Definiciones y abreviaturas

| Término / Sigla | Definición |
|------------------|------------|
| **API** | Application Programming Interface. Conjunto de endpoints HTTP del backend. |
| **a11y** | Abreviatura de *accessibility* (accesibilidad). |
| **BaaS** | Backend-as-a-Service. Modelo en que un proveedor (aquí Supabase) ofrece DB, Auth y Storage gestionados. |
| **Bearer Token** | Esquema de autorización HTTP que transporta un JWT en el header `Authorization`. |
| **Case_Ref** | Identificador opcional libre que el usuario asigna a un estudio para localizarlo en el historial. Considerado PHI. |
| **CCII** | Consejo de Colegios de Ingenieros en Informática (España). |
| **CT (TC)** | Computed Tomography / Tomografía Computarizada. |
| **DICOM** | Digital Imaging and Communications in Medicine. Estándar internacional de imagen médica. |
| **EDT / WBS** | Estructura de Desglose del Trabajo / Work Breakdown Structure. |
| **ETL** | Extract, Transform, Load. Pipeline de preparación de datos. |
| **FPA** | Function Point Analysis. |
| **HF Space** | Hugging Face Space. Contenedor gestionado para exponer modelos de IA. |
| **IA** | Inteligencia Artificial. |
| **ISO/IEC/IEEE 29148** | Norma internacional de ingeniería de requisitos. |
| **JWT** | JSON Web Token. |
| **KAN-XX** | Identificador de issue en el proyecto Jira KAN del equipo. |
| **LIDC-IDRI** | Lung Image Database Consortium — Image Database Resource Initiative. Dataset público de TC torácicas anotadas. |
| **LOPDGDD** | Ley Orgánica 3/2018 de Protección de Datos Personales y Garantía de los Derechos Digitales. |
| **M-NNN** | Identificador de hito formal del proyecto (M-001 a M-010). |
| **MDR** | Medical Device Regulation. Reglamento (UE) 2017/745. |
| **MVP** | Minimum Viable Product. |
| **PaaS** | Platform-as-a-Service. |
| **PHI** | Protected Health Information. En OncoScan: email, file_path, case_ref, patient_id, result_json, score, ai_recommendation, URLs de Storage. |
| **PMBOK** | Project Management Body of Knowledge. |
| **PRL** | Prevención de Riesgos Laborales. |
| **PSP** | Personal Software Process (Watts Humphrey, SEI). |
| **RBAC** | Role-Based Access Control. |
| **RF / RNF** | Requisito Funcional / Requisito No Funcional. |
| **RGPD** | Reglamento (UE) 2016/679 General de Protección de Datos. |
| **RLS** | Row-Level Security. Política a nivel de fila en PostgreSQL/Supabase. |
| **SDLC** | Software Development Life Cycle. |
| **Server Action** | Función server-side de Next.js invocable desde el cliente sin exponer endpoints HTTP propios. |
| **SLA** | Service Level Agreement. |
| **SSR** | Server-Side Rendering. |
| **Trigger** | Función PostgreSQL que ejecuta lógica al producirse un evento (aquí, `on_auth_user_created`). |
| **UI** | User Interface. |
| **WCAG** | Web Content Accessibility Guidelines. |

---

## 7. Requisitos iniciales

A continuación se listan los requisitos que el producto debe cumplir una vez construido. La fuente normativa es `docs/requisitos.md` (catálogo numerado según ISO/IEC/IEEE 29148). El detalle de criterios de aceptación, estado y trazabilidad se amplía en § 18 y en el Anexo 17.2.

**Requisitos funcionales — síntesis:**

- **RF-001** — Aceptar archivos `.dcm`, `.png`, `.jpg` hasta 10 MB en `POST /api/v1/dicom/upload`.
- **RF-002** — Ejecutar inferencia contra HF Space `luisdam-oncoscan-ai` con imagen + 8 features clínicas.
- **RF-003** — Clasificar el resultado en `BAJO / MEDIO / ALTO` y producir recomendación textual.
- **RF-004** — Permitir asociación opcional de `patient_id` al upload.
- **RF-005** — Crear perfil de usuario en signup mediante trigger `on_auth_user_created`.
- **RF-006** — Mostrar resultado IA completo (score, riesgo, recomendación, versión del modelo) junto con los parámetros ingresados.
- **RF-007** — Captura de las 8 features clínicas mediante sliders previa al análisis.
- **RF-008** — Historial DICOM con columnas de riesgo y score por análisis.
- **RF-009** — Búsqueda en historial por nombre o `case_ref`.
- **RF-010** — Modelo entrenado exportable y reejecutable localmente vía `demo.py`.
- **RF-011** — Alertas de riesgo con jerarquía visual (rojo solo para alertas clínicas) y semántica accesible (`role="alert"`, `aria-live="assertive"` para crítico).

**Requisitos no funcionales — síntesis:**

- **RNF-001** — Cero PHI en stdout, stderr ni respuestas al cliente.
- **RNF-002** — Logs estructurados en JSON con `timestamp`, `level`, `logger`, `event`, `extra`.
- **RNF-003** — Convención de commits `tipo(KAN-XX): descripción` desde 2026-05-22, validada por hook.
- **RNF-004** — Policies RLS de Supabase no recursivas.
- **RNF-005** — Tras login, esperar propagación de sesión antes de `router.push` (resolución de race condition).
- **RNF-006** — Toda ruta `/api/v1/*` exige Bearer JWT válido emitido por Supabase Auth.
- **RNF-007** — Componentes UI clínicos conformes WCAG AA verificable con `/oncoscan-a11y`.
- **RNF-008** — Timeout configurable del HF `/predict`, default 120 s.

---

## 8. Alcance

**Entregables del proyecto (lista cerrada).**

1. **Código fuente del frontend** — `apps/web/` con Next.js 16 + React 19, incluyendo:
   - Landing pública (`/`).
   - Login (`/login`).
   - Plataforma privada protegida (`/platform/*`): dashboard, upload DICOM, analyze, uploads (historial + detalle), alertas, ajustes, modelo, reportes, endpoint CSV.
   - Componentes UI compartidos (`Button`, `AlertBanner`, `RiskBadge`, `StatusBadge`, `Input`, `Card`, `PageContainer`, `SectionHeader`, `Sidebar`, `Header`, `LogoutButton`).
   - Server Actions, error boundaries y loading skeletons por ruta.
2. **Código fuente del backend** — `apps/api/` con FastAPI, incluyendo:
   - Routers `dicom`, `analysis`, `health`.
   - `core/security.py` (`get_current_user`), `core/logging.py` (logger JSON).
   - `db/supabase_client.py`.
   - Background tasks para inferencia.
   - Tests unitarios mínimos (`apps/api/tests/test_logging.py`).
3. **Modelo IA exportable** — ResNet18 transfer learning entrenado en Kaggle, expuesto en HF Space `luisdam-oncoscan-ai`, con `demo.py` para reejecución local.
4. **Migraciones de base de datos** — `docs/ai-service-migration.sql` con las columnas del flujo IA.
5. **Despliegue operativo** — frontend en Vercel, backend en Railway, DB/Auth/Storage en Supabase, modelo en HF Space.
6. **Documentación técnica** — `docs/` con setup, deploy, smoke test, arquitectura, requisitos, roadmap, MVP status, testing guide, integración IA.
7. **Documentación PSP** — `docs/psp/` con metodología, convenciones, labels, DOR, matriz de trazabilidad, hitos, defect-log, auditorías y post-mortems.
8. **Workflow de Claude Code** — `CLAUDE.md` jerárquico (raíz, web, api) y 4 slash commands (`/oncoscan-component`, `/oncoscan-page`, `/oncoscan-a11y`, `/oncoscan-clinical-review`, más `/oncoscan-psp-audit`).
9. **Infraestructura de calidad** — hook `commit-msg`, hook `commit-msg` hook portable en `.githooks/`, suite Vitest mínima.
10. **Entregables académicos del curso** — pitch, cronograma, mockups y este propio documento CCII-N2016-02 como entrega integradora final.

**Lo que queda fuera del alcance del proyecto académico:**

- Anonimización formal de pacientes y pipeline ETL desde TCIA/GDC (planificado como M-008).
- Monitoreo / observabilidad en producción (M-009).
- Visor DICOM clínico avanzado.
- Certificación clínica o regulatoria (MDR).
- Alta disponibilidad garantizada o SLA.
- Operación con datos reales de pacientes.

---

## 9. Hipótesis y restricciones

**Hipótesis asumidas.**

- **H1.** El equipo dispone de cuentas gratuitas en GitHub, Vercel, Railway, Supabase, Hugging Face y Kaggle, sin limitaciones que bloqueen los flujos del MVP.
- **H2.** El HF Space mantiene su endpoint `POST /predict` estable durante el periodo del curso.
- **H3.** El dataset LIDC-IDRI permanece accesible para reentrenamiento.
- **H4.** Los 5 integrantes del equipo pueden dedicar de forma sostenida ~10 h/semana al proyecto durante 6 semanas.
- **H5.** El asesor académico actúa como único stakeholder externo y revisor de entregas.

**Restricciones.**

- **R1. Presupuesto cero.** Solo se usan servicios gratuitos. No hay margen para upgrades de tier ni GPU dedicada.
- **R2. Entorno académico controlado.** Prohibido procesar datos reales de pacientes. Toda PHI es sintética o de datasets públicos anonimizados.
- **R3. Cold-start del HF Space (30–60 s).** Restricción de UX que obliga al patrón de BackgroundTask + polling.
- **R4. Limitaciones de Railway free tier.** Recursos limitados (RAM, tiempo de ejecución mensual).
- **R5. Sin SLA.** Caídas de cualquier proveedor son aceptables; el sistema no garantiza disponibilidad.
- **R6. Mateo Salas es el único administrador del repo y de los hooks.** Override `--no-verify` solo permitido para él en emergencias, con registro en el siguiente commit (ver `docs/psp/conventions.md`).
- **R7. La auditoría PSP no escribe en Jira.** Solo reporta. La remediación es manual y deliberada (`docs/psp/psp-methodology.md` § 10).
- **R8. Hitos fijos.** El cronograma se ancla a las fechas M-001..M-010 (`docs/psp/milestones.md`); la entrega académica final es **2026-06-29**.
- **R9. Idioma.** Toda la documentación y mensajes de commit en castellano.
- **R10. Plataforma de desarrollo del equipo.** Mayoritariamente Windows; el hook commit-msg debe funcionar bajo Git Bash.

---

## 10. Estudio de alternativas y viabilidad

Se evaluaron las siguientes alternativas para los componentes clave del sistema. Para cada uno se documenta la opción elegida y su justificación.

### 10.1 Plataforma BaaS (Auth + DB + Storage)

| Alternativa | Pros | Contras | Decisión |
|-------------|------|---------|----------|
| **Supabase** *(elegida)* | Free tier generoso; Postgres real; Auth y Storage integrados; SDKs JS y Python maduros; RLS nativo. | Cuotas de Storage limitadas; cold-start en endpoints serverless. | ✅ Elegida. Unifica 3 servicios en 1 proveedor y simplifica el modelo de seguridad con RLS. |
| Firebase | Auth maduro; ecosistema Google. | NoSQL (Firestore) no encaja con datos relacionales; Storage caro a escala; menos control de SQL. | Rechazada. |
| AWS Cognito + RDS + S3 | Estándar industrial. | Configuración compleja; sin free tier sostenible para 5 estudiantes. | Rechazada. |
| Stack propio (Postgres + JWT custom + MinIO) | Control total. | Coste de operación incompatible con presupuesto cero. | Rechazada. |

### 10.2 Plataforma de servido del modelo IA

| Alternativa | Pros | Contras | Decisión |
|-------------|------|---------|----------|
| **Hugging Face Spaces** *(elegida)* | Gratuito; integración natural con PyTorch; FastAPI/Gradio embebido; URL pública estable. | Cold-start 30–60 s; sin SLA. | ✅ Elegida. Es la única vía gratuita que expone un endpoint HTTP estable para el modelo. |
| Servir el modelo dentro de Railway (FastAPI) | Latencia menor; un solo proveedor. | Railway free tier no soporta el peso del modelo en RAM. | Rechazada (plan B futuro). |
| Replicate.com | API muy simple. | Coste por inferencia. | Rechazada. |
| Inferencia en cliente (ONNX Web) | Sin servidor. | Modelo ResNet18 + features clínicas no portable trivialmente; UX impactada. | Rechazada. |

### 10.3 Framework frontend

| Alternativa | Pros | Contras | Decisión |
|-------------|------|---------|----------|
| **Next.js 16 + App Router** *(elegido)* | SSR/RSC; server actions; ecosistema React 19; despliegue 1-click en Vercel. | Curva de aprendizaje App Router; algunos patrones aún en evolución. | ✅ Elegido. |
| Remix | Buena DX; server-first. | Menor ecosistema en el equipo. | Rechazada. |
| SPA Vite + React Router | Simplicidad. | Sin SSR; sin server actions; expone API al cliente. | Rechazada. |

### 10.4 Framework backend

| Alternativa | Pros | Contras | Decisión |
|-------------|------|---------|----------|
| **FastAPI** *(elegido)* | Async nativo; tipos Pydantic; integración natural con `pydicom`, PyTorch; Swagger automático. | Ecosistema más joven que Flask. | ✅ Elegido. |
| Flask | Maduro. | Async no nativo; menos integrado con tipos. | Rechazada. |
| Node.js (NestJS) | Lenguaje único con frontend. | Librerías DICOM más débiles que Python. | Rechazada. |

### 10.5 Asistencia IA al desarrollo

| Alternativa | Pros | Contras | Decisión |
|-------------|------|---------|----------|
| **Claude Code + slash commands + CLAUDE.md jerárquico** *(elegida)* | Permite codificar las reglas PHI y de design system una sola vez; slash commands repetibles. | Aumenta la complejidad inicial de configuración (sub-proyecto A). | ✅ Elegida. Sub-proyecto B se completó con 18 commits en una semana gracias a esta base. |
| GitHub Copilot | Autocompletado in-editor. | No respeta reglas de PHI ni jerarquía de docs propias del repo. | Complementaria, no sustituta. |

### 10.6 Viabilidad global

- **Viabilidad técnica:** demostrada. El MVP de Fase 0 cubre el flujo end-to-end en producción académica.
- **Viabilidad económica:** total. Coste operativo = 0 € (todos los servicios en free tier).
- **Viabilidad legal:** total, condicionada al uso de datasets públicos / sintéticos y a la prohibición explícita de procesar pacientes reales (RGPD/LOPDGDD).
- **Viabilidad organizativa:** confirmada por las entregas de los sub-proyectos A–E dentro de plazo.

---

## 11. Descripción de la solución propuesta

OncoScan se describe como una **plataforma web académica de apoyo a la decisión clínica** organizada en tres capas desacopladas (cliente, API, servicios externos) sobre un monorepo, con un eje transversal de disciplina PSP.

### 11.1 Características significativas

- **Acceso protegido por identidad real.** Toda funcionalidad clínica vive bajo `/platform/*`, accesible solo tras login Supabase. El middleware Next.js (`src/proxy.ts`) bloquea usuarios no autenticados antes del render.
- **Flujo end-to-end DICOM → IA → resultado** en menos de 3 minutos (incluido cold-start del Space). Polling no bloqueante del estado.
- **Datos sensibles compartimentados.** PHI nunca se loguea, nunca se expone al cliente sin signed URL, y se documenta como tal en `CLAUDE.md`. Backend con logger JSON estructurado.
- **Design system clínico cohesivo.** Paleta Deep Space Blue (#012641) + Raspberry Red (#EE005A); el rojo *sólo* se usa para alertas clínicas críticas, no para errores genéricos (separación que protege la jerarquía visual de riesgo).
- **Componentes accesibles por defecto.** `AlertBanner variant="critical"` aplica `role="alert"` + `aria-live="assertive"`; badges tienen `aria-label`; inputs tienen `aria-invalid` y focus rings visibles.
- **Server-first.** Páginas como `/platform/analyze` son Server Components que invocan server actions; el token de Supabase nunca abandona el servidor.
- **Trazabilidad de extremo a extremo.** Cada requisito tiene issue Jira, commit(s) y test (cuando existe), recogidos en `docs/psp/traceability-matrix.md`.
- **Disciplina de proceso reproducible.** Hooks de commit, slash commands de auditoría y plantilla de post-mortem hacen el proceso reproducible y auditable.
- **Operativa de despliegue documentada.** `docs/deploy.md` lista variables de entorno, URLs, bucket, migraciones e incidencias resueltas.
- **Plan B explícito para inferencia.** Cold-start y caída del Space son riesgos asumidos; el sistema degrada de forma controlada (estado `ai_failed` visible para el usuario).
- **Pensado para evolucionar.** La arquitectura permite añadir asociación de pacientes (hecho en E), seguimiento clínico (M-008), monitoreo (M-009) y métricas de modelo sin rediseño.

---

## 12. Análisis de Riesgos

Riesgos identificados, clasificados por impacto y con acciones de mitigación. La fuente operativa de seguimiento es el Anexo 17.4.8 y `docs/psp/audits/`.

| ID | Riesgo | Probabilidad | Impacto | Acción de mitigación | Responsable |
|----|--------|--------------|---------|----------------------|-------------|
| R-01 | Caída o cold-start prolongado del HF Space `luisdam-oncoscan-ai`. | Alta | Alto (bloquea análisis) | Timeout configurable (RNF-008, default 120 s); polling con timeout 3 min; estado `ai_failed` explícito; plan B futuro: contenedor propio o caché de resultados. | Luis Dam (AI) |
| R-02 | Fuga de PHI en logs o respuestas (RNF-001). | Media | **Crítico** (legal/RGPD) | Logger JSON con campos controlados (KAN-55); slash command `/oncoscan-clinical-review`; política `console.*` documentada; test `apps/api/tests/test_logging.py`. | Mateo Salas (DevSecOps) |
| R-03 | RLS mal configurada en `dicom_uploads`. | Media | **Crítico** (un usuario ve datos de otro) | Política revisada en sub-proyecto E; memory `rls-patterns.md`; smoke test post-policy. | Mateo Salas / Other_Sotelo |
| R-04 | Race condition de login → usuarios autenticados rebotados al `/login`. | Baja (resuelta) | Medio | Resuelta en sub-proyecto E; RNF-005; commit `4944908`. | Frontend lead |
| R-05 | Cuota agotada en Railway / Vercel / Supabase free tier. | Media | Alto | Monitoreo manual hasta M-009; restricción R1; plan de contingencia: pausar despliegues no esenciales. | DevOps |
| R-06 | Equipo sin disciplina de timetracking (D1). | Alta | Medio (afecta métricas PSP) | Workflow rule Jira pendiente de activación (`docs/psp/conventions.md`). | Other_Sotelo |
| R-07 | Deriva del modelo IA al reentrenar sin evaluación formal. | Media | Alto | Métricas y evaluación pendientes (próximos módulos del README); `demo.py` reproducible (RF-010). | Luis Dam |
| R-08 | Commits sin clave Jira → trazabilidad rota. | Baja (en adopción) | Medio | Hook `commit-msg` activo desde 2026-05-22 (RNF-003). | Todos |
| R-09 | Accesibilidad WCAG AA incompleta en alertas y formularios complejos. | Media | Medio (legal + UX) | Sub-proyecto B sweep WCAG; follow-ups en C; auditoría continua vía `/oncoscan-a11y`. | Frontend lead |
| R-10 | Pérdida de información por falta de tests automáticos (D6, D7). | Alta | Alto | M-007 (cobertura mínima); inicial 2/16 requisitos con test. | QA |
| R-11 | Confusión clínica: usuario interpreta el resultado como diagnóstico. | Media | **Crítico** | Disclaimer en homepage, README y `modelo/page.tsx`; recomendación textual conservadora; alertas con jerarquía visual. | UX lead |
| R-12 | Datos reales de pacientes introducidos por error. | Baja | **Crítico** (legal/RGPD) | Restricción R2; revisión en code review; política de PHI en CLAUDE.md. | Todos |
| R-13 | Pérdida de conocimiento si un integrante abandona. | Media | Alto | Documentación viva en `docs/`; CLAUDE.md jerárquico; post-mortems. | PM |
| R-14 | Dependencia de Claude Code para mantener velocidad. | Baja | Bajo | Repo es plenamente operable sin él; slash commands son opcionales. | Mateo Salas |
| R-15 | Vencimiento académico (entrega 2026-06-29) con M-007..M-010 pendientes. | Media | Alto | Priorización clara en `docs/psp/milestones.md`; M-006 (PSP) ya en curso. | PM |

---

## 13. Organización y gestión del proyecto

### 13.1 Organización

#### 13.1.1 Actores del proyecto y relaciones

| Actor | Rol respecto al proyecto | Necesidad / Expectativa | Relación con el equipo |
|-------|--------------------------|--------------------------|------------------------|
| Equipo de desarrollo OncoScan (5 personas) | Suministrador / ejecutor | Entregar el MVP + documentación + entregas académicas. | Internos. |
| Asesor académico del curso | Cliente / sponsor académico | Recibir entregas en plazo y calidad. Verificar disciplina PSP. | Externo, contacto periódico. |
| Comité evaluador del curso | Evaluador final | Calificar la entrega integradora. | Externo, contacto puntual final. |
| Usuarios académicos del prototipo | Usuario final | Login, subir DICOM, ver resultado IA, consultar historial y alertas. | Externos, acceso controlado. |
| Hugging Face (proveedor del Space) | Proveedor externo gratuito | Mantener el Space arriba; sin SLA. | Externo, sin contrato. |
| Supabase, Vercel, Railway, Kaggle, GitHub | Proveedores de infraestructura | Mantener free tier operativo. | Externos, sin contrato. |
| Pacientes / radiólogos reales | **No actores activos.** | — | Excluidos del alcance (R2). |

#### 13.1.2 Estructura interna (organigrama)

```text
                        Project Manager (Mateo Salas)
                                   │
   ┌──────────────────┬────────────┼────────────┬──────────────────┐
   │                  │            │            │                  │
Frontend Lead     Backend Lead   AI Engineer   QA / PSP        Data / Docs
(Nicolás)         (Other Sotelo) (Luis Dam)    Auditor          [Pendiente
                                               (Mateo, rol      de asignación
                                               compartido)      formal por
                                                                el autor]
```

**Notas.**
- La estructura es **plana**, propia de un equipo académico de 5 personas.
- Mateo Salas asume el rol de PM y, transitoriamente, de auditor PSP / DevSecOps (administrador del repo y de los hooks).
- La denominación exacta de cada integrante y la asignación formal del rol Data/Docs **[Pendiente de definir por el autor]** si difiere de lo registrado en Jira (`assignee`).

#### 13.1.3 Interfaces externas

| Organización / Sistema | Necesidad de integración | Mecanismo |
|------------------------|--------------------------|-----------|
| Hugging Face Space `luisdam-oncoscan-ai` | Inferencia IA. | `POST /predict` multipart (imagen + 8 features). |
| Supabase Auth | Identidad y JWT. | SDK `@supabase/ssr` (web) y `supabase-py` (api). |
| Supabase PostgreSQL | Persistencia. | SDK + RLS. |
| Supabase Storage | Archivos DICOM. | SDK + bucket privado `dicom-files`. |
| Vercel | Hosting frontend. | Git push → build automático. |
| Railway | Hosting backend. | Git push → Docker build → uvicorn. |
| Kaggle | Entrenamiento. | Notebook + dataset LIDC-IDRI. |
| GitHub | Control de versiones, PRs, issues complementarios. | Git remote + GitHub Actions (futuro). |
| Jira Cloud | Gestión de tareas (proyecto KAN). | UI Jira + MCP en Claude Code. |

#### 13.1.4 Roles y responsabilidades

| Rol | Responsabilidades | Aplicado a |
|-----|--------------------|-----------|
| Project Manager (Mateo Salas) | Planificación, hitos, riesgos, comunicación con el asesor, cumplimiento PSP. | Todo el proyecto. |
| Frontend Lead | Páginas Next.js, design system, accesibilidad, server actions. | `apps/web/`. |
| Backend Lead (Other_Sotelo) | API FastAPI, integración Supabase, validación de DICOM, configuración de Epics Jira. | `apps/api/`. |
| AI Engineer (Luis Dam) | Modelo ResNet18, dataset LIDC-IDRI, HF Space, `demo.py`, métricas de modelo. | Notebook Kaggle + HF Space. |
| QA / Auditor PSP | Auditorías periódicas, defect-log, matriz de trazabilidad, post-mortems. | `docs/psp/`. |
| Data / Docs | Documentación viva, integración de entregas académicas. | `docs/`. |
| DevSecOps | Hooks de commit, políticas PHI, RLS, secretos. | Raíz + Supabase. |

---

### 13.2 Gestión del proyecto (resumen de planes de gestión)

Los 10 planes PMBOK se desarrollan en el Anexo 17.4. En resumen:

- **Integración:** este documento + `docs/psp/psp-methodology.md` actúan como plan integrador.
- **Alcance:** definido en § 8; cambios se reflejan vía commit `docs(KAN-XX):` que toque `docs/requisitos.md` o `docs/psp/milestones.md`.
- **Plazos:** anclados a M-001..M-010 (`docs/psp/milestones.md`).
- **Costes:** 0 € operativo; coste hombre estimado en § 15.
- **Calidad:** PSP + slash commands + hook commit-msg + suite de tests en crecimiento.
- **Recursos humanos:** 5 personas, organigrama plano.
- **Comunicaciones:** stand-up semanal + Jira + canal del equipo.
- **Riesgos:** § 12 y registro vivo.
- **Adquisiciones:** ninguna (todos los servicios gratuitos).
- **Stakeholders:** matriz en § 13.1.1.

---

## 14. Planificación temporal

El cronograma del proyecto se ancla a los **10 hitos formales M-001..M-010** definidos en `docs/psp/milestones.md` (versión vigente). La tabla siguiente resume fechas objetivo y estado a 2026-05-24.

| Hito | Fecha objetivo | Criterio de cierre | Estado |
|------|---------------|--------------------|--------|
| M-001 — Diseño fundacional (UI + arquitectura) | 2026-05-17 | Design system entregado, primera spec publicada. | ✅ Cerrado |
| M-002 — Modelo IA entrenado y servible | 2026-05-19 | ResNet18 transfer learning 45 épocas + Space HF expuesto. | ✅ Cerrado |
| M-003 — API funcional con auth | 2026-05-20 | `/api/v1/dicom/*` y `/api/v1/analysis/*` con JWT Bearer. | ✅ Cerrado |
| M-004 — Flujo end-to-end | 2026-05-21 | Upload `.dcm/.png/.jpg` → análisis → resultado visible. | ✅ Cerrado |
| M-005 — Asociación de paciente y multi-tenancy básico | 2026-05-22 | `patient_id` opcional; RLS sin recursión; signup vía trigger. | ✅ Cerrado |
| M-006 — Disciplina PSP operativa | 2026-06-01 | 4 reglas PSP ≥ 80% en auditoría; commits 100% con KAN-XX; defect-log poblado. | 🔄 En curso |
| M-007 — Cobertura de tests mínima | 2026-06-08 | ≥ 5 archivos pytest; vitest cubre ≥ 22% páginas; CI ejecuta ambas suites. | ⏳ Pendiente |
| M-008 — ETL / Anonimización formal | 2026-06-15 | Pipeline TCIA/GDC reproducible; anonimización pre-Storage. | ⏳ Pendiente |
| M-009 — Monitoreo y dashboards | 2026-06-22 | Dashboards sobre logs JSON; alertas por error rate `/predict`. | ⏳ Pendiente |
| M-010 — Entrega académica final + post-mortem global | **2026-06-29** | Documento de proyecto integrado (este); pitch entregado; post-mortem global. | ⏳ Pendiente |

### 14.1 Evolución del plan de proyecto (criterios de actualización del cronograma)

- Cualquier modificación de fechas objetivo o criterios de cierre requiere commit `docs(KAN-XX): ajustar M-NNN …` y nota en el siguiente post-mortem (regla recogida en `docs/psp/milestones.md`).
- El cronograma se revisa **al cierre de cada sub-proyecto** y **en cada auditoría PSP**.
- Los hitos no se eliminan; si pierden vigencia se marcan como "obsoletos" con justificación.
- La auditoría 2026-05-22 fijó la **línea base** contra la que se mide la tendencia.

### 14.2 Evaluación por el suministrador del plan de proyecto

El propio equipo (suministrador y, en proyecto académico, también cliente operativo) evalúa el plan en cada cierre de hito mediante:

- **Post-mortem por sub-proyecto** (`docs/psp/postmortems/`): qué se entregó, qué quedó fuera, qué se aprendió.
- **Auditoría PSP** (`docs/psp/audits/`): comparación contra línea base 2026-05-22; cálculo de las métricas de § 5.3.2.
- **Validación con el asesor académico** en las entregas formales del curso.

---

## 15. Resumen del Presupuesto

**Coste operativo del proyecto:** **0,00 €** (todos los proveedores en free tier).

**Coste estimado en horas-persona (no facturable, equipo académico):**

| Partida | Horas estimadas | Tarifa interna referencial (€/h)* | Coste referencial (€) |
|---------|-----------------|-----------------------------------|------------------------|
| Sub-proyecto A — Workflow Claude Code | 12 | 25 | 300 |
| Sub-proyecto B — Design system + WCAG sweep | 60 | 25 | 1.500 |
| Sub-proyecto C — Follow-ups + merge fronted-nicolas | 70 | 25 | 1.750 |
| Sub-proyecto D — Integración IA | 80 | 25 | 2.000 |
| Sub-proyecto E — Pacientes + RLS + signup | 50 | 25 | 1.250 |
| Fase 0 — MVP base (estimación retrospectiva) | 120 | 25 | 3.000 |
| Entrenamiento modelo IA (Kaggle, AI Engineer) | 40 | 30 | 1.200 |
| Remediación PSP (KAN-55, 56, 57 + auditoría) | 25 | 25 | 625 |
| Documentación (incluida esta memoria) | 35 | 25 | 875 |
| Gestión / PM / reuniones | 30 | 30 | 900 |
| **Total referencial** | **522** | — | **13.400** |

\*Tarifa referencial únicamente para evidenciar el coste si el proyecto se realizara en un entorno profesional. No corresponde a desembolso real del equipo académico.

**Infraestructura:** 0 € (Vercel free, Railway free, Supabase free, Hugging Face free, Kaggle free, GitHub free).

**Adquisición de licencias / hardware:** 0 € (todos los integrantes usan su equipo propio; software open source o gratuito).

El desglose detallado por unidad lógica está en § 19.

---

## 16. Orden de prioridad de los documentos básicos

En caso de discrepancia entre documentos de este proyecto, prevalece el siguiente orden (conforme a la Norma CCII-N2016-02):

1. **Especificaciones del Sistema** (§ 18) — define el QUÉ.
2. **Presupuesto** (§ 19) — define el COSTE Y EL ALCANCE COMPROMETIDO.
3. **Memoria** (§§ 1–16 de este documento) — define el CONTEXTO Y LA SOLUCIÓN.

Adicionalmente, dentro de la **Memoria**, en caso de discrepancia entre este documento integrado y los documentos vivos del repositorio:

- Para requisitos: prevalece `docs/requisitos.md`.
- Para trazabilidad: prevalece `docs/psp/traceability-matrix.md`.
- Para hitos: prevalece `docs/psp/milestones.md`.
- Para convenciones operativas: prevalece `docs/psp/conventions.md`.
- Para reglas de PHI: prevalece `CLAUDE.md` raíz y los sub-CLAUDE.md.

Cualquier divergencia detectada debe registrarse como issue Jira con label `psp` y reconciliarse en la próxima auditoría.

---

## 17. ANEXOS

### Índice de anexos

- 17.1 Documentación de entrada
- 17.2 Análisis y Diseño del Sistema
- 17.3 Estimación de Tamaño y Esfuerzos
- 17.4 Planes de Gestión (PMBOK 5ª ed.)
  - 17.4.1 Gestión de la integración
  - 17.4.2 Gestión del Alcance
  - 17.4.3 Gestión de plazos
  - 17.4.4 Gestión de costes
  - 17.4.5 Gestión de la calidad
  - 17.4.6 Gestión de recursos humanos
  - 17.4.7 Gestión de comunicaciones
  - 17.4.8 Gestión de riesgos
  - 17.4.9 Gestión de adquisiciones
  - 17.4.10 Gestión de interesados (Stakeholders)
- 17.5 Plan de Seguridad
- 17.6 Otros anexos

---

### 17.1 Documentación de entrada

El proyecto **no parte de un pliego cliente formal**, al ser un encargo académico abierto. La documentación de entrada equivalente comprende:

- **Enunciado del curso** [Pendiente de definir por el autor — adjuntar PDF del enunciado].
- **Brief inicial del equipo** (sesión de brainstorming registrada como `docs/roadmap.md` Fase 1–5).
- **Datasets de referencia:** LIDC-IDRI público.
- **Fases anteriores del proyecto reutilizadas:** ninguna; OncoScan es proyecto greenfield.
- **Plantilla CCII-N2016-02** (PDF en `D:\Descargas\Plantilla Básica para Documentación Proyectos de SW.pdf`).
- **Auditoría PSP de línea base** `docs/psp/audits/2026-05-22-audit.md` como input metodológico para esta memoria.

---

### 17.2 Análisis y Diseño del Sistema

**Casos de uso principales.**

1. **UC-01 Iniciar sesión.** Usuario → `/login` → Supabase Auth → JWT → middleware permite acceso a `/platform/*`.
2. **UC-02 Subir DICOM o imagen.** Usuario autenticado → `/platform/upload` → form-data + JWT → `POST /api/v1/dicom/upload` → validación → Storage + fila en `dicom_uploads`.
3. **UC-03 Ejecutar análisis IA.** Usuario → `/platform/analyze` → 8 sliders de features + selección de upload → server action `analyzeAction` → backend invoca HF Space → polling → resultado.
4. **UC-04 Consultar historial.** Usuario → `/platform/uploads` → lista filtrable por nombre o `case_ref`.
5. **UC-05 Ver detalle de carga.** Usuario → `/platform/uploads/[id]` → metadatos + resultado IA + recomendación + descarga.
6. **UC-06 Centro de alertas.** Usuario → `/platform/alertas` → listado de estudios con `ai_risk_level = "ALTO"`.
7. **UC-07 Reportes.** Usuario → `/platform/reportes` → KPIs + descarga CSV (`/reportes/download`).
8. **UC-08 Ajustes.** Usuario → `/platform/ajustes` → perfil + sesión + preferencias (placeholder).
9. **UC-09 Página Modelo IA.** Usuario → `/platform/modelo` → descripción del modelo + disclaimer clínico.

**Arquitectura (diagrama lógico).** Tomado de `docs/architecture_analysis.md`:

```mermaid
graph TD
    Client[Frontend: Next.js] -->|1. Login User| SupabaseAuth[Supabase Auth]
    SupabaseAuth -->|2. Return JWT| Client
    Client -->|3. Send DICOM + JWT| Backend[Backend: FastAPI]
    Backend -->|4. Validate JWT| SupabaseAuth
    Backend -->|5. Extract Metadata| PyDicom[Librería pydicom]
    Backend -->|6. Upload File| SupabaseStorage[Supabase Storage]
    Backend -->|7. Save Metadata| SupabaseDB[Supabase DB: dicom_uploads]
    Backend -->|8. BackgroundTask /predict| HFSpace[HF Space luisdam-oncoscan-ai]
    HFSpace -->|9. score + risk + recomendación| Backend
    Backend -->|10. UPDATE dicom_uploads (ai_completed/ai_failed)| SupabaseDB
    Client -->|11. Polling GET /api/v1/analysis/{id}| Backend
    Backend -->|12. Success Response| Client
```

**Modelo de datos resumido.** Tabla principal `public.dicom_uploads` con las columnas extendidas tras la migración `docs/ai-service-migration.sql`. Tabla de perfiles poblada vía trigger `on_auth_user_created`. Detalle completo en § 18.

**Matriz de trazabilidad** (extracto, fuente `docs/psp/traceability-matrix.md`):

| Requisito | Issue Jira | Commit(s) | Tests | Estado |
|-----------|------------|-----------|-------|--------|
| RF-001 | KAN-39, KAN-44 | `bb83b40` | pendiente | Funcional |
| RF-002 | KAN-38 | históricos D | pendiente | Funcional |
| RF-003 | KAN-29 | históricos B | pendiente | Funcional |
| RF-006 | KAN-43 | históricos D | pendiente | Funcional |
| RNF-001 | KAN-55, 56, 57 | `de8569f`, `cbe0fec`, `77570e0` | `apps/api/tests/test_logging.py` | **Cerrado 2026-05-22** |
| RNF-002 | KAN-55 | `de8569f` | `apps/api/tests/test_logging.py` | **Cerrado** |

Cobertura agregada: 12/16 requisitos con issue Jira (75%), 14/16 con commit (87%), 2/16 con test (12.5%).

---

### 17.3 Estimación de Tamaño y Esfuerzos

No se aplicó FPA formal. Se usan los siguientes proxies de tamaño:

| Módulo / Sub-proyecto | Archivos | Componentes nuevos | Páginas | Endpoints | Commits | Horas estimadas |
|------------------------|----------|---------------------|---------|-----------|---------|------------------|
| Fase 0 — MVP base | ~40 | 8 (StatusBadge, Input, Card, etc.) | 7 | 3 (`/health`, `/dicom/upload`, `/analysis/{id}`) | ~30 | 120 |
| A — Claude skills | 8 | 0 (solo config) | 0 | 0 | 1 (`dace374`) | 12 |
| B — Design system | 14 modificados | 3 (Button, AlertBanner, RiskBadge) | 6 migradas | 0 | 18 + 2 fixes | 60 |
| C — Follow-ups + merge | 26 | 0 (10 loading.tsx) | 3 nuevas (Modelo, Reportes, Ajustes) + 1 endpoint CSV | 1 | 12 | 70 |
| D — Integración IA | ~10 | 0 | 2 (analyze, analyze/[id]) | 1 (`/api/v1/analysis/*`) | ~15 (rama `ai-service`) | 80 |
| E — Pacientes + RLS | ~6 | 0 | 0 nuevas | 0 | ~8 | 50 |
| Remediación PSP (KAN-55/56/57) | 4 | 0 | 0 | 0 (logger backend) | 3 | 25 |
| Documentación (esta memoria + docs/psp) | ~15 | — | — | — | ~12 | 35 |
| **Totales aproximados** | **~123** | **11** | **18** | **5** | **~99** | **522 h** |

**Base del presupuesto:** horas-persona × tarifa referencial (§ 15). El coste real desembolsado es 0 €.

---

### 17.4 Planes de Gestión (PMBOK 5ª ed. / ISO 21500:2013)

#### 17.4.1 Gestión de la integración

- **Documento integrador:** este propio documento + `docs/psp/psp-methodology.md`.
- **Control de cambios:** todo cambio relevante (alcance, hitos, riesgos, requisitos) se materializa como commit `docs(KAN-XX): …` que modifica el documento vivo correspondiente.
- **Cierre de fase:** cada sub-proyecto cierra con post-mortem (`docs/psp/postmortems/sub-proyecto-X.md`).

#### 17.4.2 Gestión del Alcance

- **Definición del alcance:** § 8 + `docs/requisitos.md` + `docs/jira/sub-proyecto-*.md`.
- **EDT/WBS:** los sub-proyectos A–E + Fase 0 actúan como nivel 1 de EDT; los Epics Jira KAN-46..KAN-54 como nivel 2; los issues como nivel 3.
- **Validación del alcance:** criterios de aceptación documentados por sub-proyecto.
- **Control:** no se aceptan funcionalidades fuera de los hitos vigentes sin actualizar `docs/psp/milestones.md`.

#### 17.4.3 Gestión de plazos

- **Cronograma:** § 14 + `docs/psp/milestones.md`.
- **Estimación de duración:** retrospectiva por sub-proyecto (faltan estimaciones a priori — deficiencia D1).
- **Control:** auditoría PSP detecta issues "stuck" (>14 d sin movimiento).

#### 17.4.4 Gestión de costes

- **Estimación:** § 15.
- **Coste real desembolsado:** 0 €.
- **Coste referencial:** ~13.400 € (horas equipo).
- **Reserva de contingencia:** N/A (sin presupuesto monetario).

#### 17.4.5 Gestión de la calidad

- **Estándares:** PSP, ISO/IEC/IEEE 29148, WCAG 2.1 AA, OWASP Top 10, ISO/IEC 25010.
- **Aseguramiento:** slash commands `/oncoscan-clinical-review`, `/oncoscan-a11y`, `/oncoscan-psp-audit`; hook `commit-msg`; revisiones de PR.
- **Control:** auditorías PSP en `docs/psp/audits/`; matriz de trazabilidad; defect-log.
- **Métricas de calidad:** densidad de defectos por sub-proyecto; eficiencia de revisión; cobertura de tests.

#### 17.4.6 Gestión de recursos humanos

- **Equipo:** 5 personas. Organigrama en § 13.1.2.
- **Adquisición:** ya constituido (estudiantes del curso).
- **Desarrollo del equipo:** transferencia de conocimiento vía `CLAUDE.md` jerárquico y post-mortems.
- **Gestión de conflictos:** stand-up semanal, decisiones documentadas en specs (`docs/superpowers/specs/`).

#### 17.4.7 Gestión de comunicaciones

- **Canal interno:** stand-up semanal + canal de chat del equipo.
- **Canal con asesor académico:** correo + entregas en plazo.
- **Documentación viva:** `docs/` accesible para todo el equipo.
- **Trazabilidad de decisiones:** commits y, cuando aplica, specs / ADRs.

#### 17.4.8 Gestión de riesgos

- **Registro vivo:** § 12 + `docs/psp/audits/2026-05-22-audit.md` (21 hallazgos clasificados).
- **Análisis cualitativo:** matriz probabilidad × impacto (§ 12).
- **Respuesta:** mitigaciones documentadas por riesgo.
- **Monitoreo:** auditoría PSP periódica + revisión en cada post-mortem.

#### 17.4.9 Gestión de adquisiciones

- **Adquisiciones realizadas:** ninguna (free tier en todos los proveedores).
- **Riesgo de cuota:** R-05 (ver § 12).
- **Plan B:** documentado para inferencia (contenedor propio o caché de resultados).

#### 17.4.10 Gestión de interesados (Stakeholders)

| Stakeholder | Interés | Influencia | Estrategia |
|-------------|---------|------------|------------|
| Asesor académico | Alto | Alta | Mantener informado en cada entrega; aceptar feedback. |
| Equipo de desarrollo | Alto | Alta | Gestionar de cerca; rotación de roles si necesario. |
| Comité evaluador | Medio | Alta | Entregar documento integrado claro y trazable. |
| Usuarios académicos del prototipo | Medio | Baja | Mantener satisfechos con UX clara y disclaimers. |
| Proveedores externos (HF, Vercel, etc.) | Bajo | Media (caída = bloqueo) | Monitoreo manual; plan B para HF. |
| Pacientes / radiólogos reales | N/A | N/A | Excluidos por R2. |

---

### 17.5 Plan de Seguridad

**Aspectos técnicos.**

- **Auth:** Supabase Auth con JWT Bearer. Toda ruta `/api/v1/*` valida JWT vía `core/security.py::get_current_user` (RNF-006).
- **Autorización:** RLS en `dicom_uploads` por `user_id`; backend usa `service_role` con cuidado.
- **PHI:** prohibido en logs, stdout, stderr y respuestas al cliente (RNF-001). Política `console.*` y `print()` documentada en `docs/psp/conventions.md` y CLAUDE.md.
- **Logger backend:** JSON estructurado (RNF-002), campos `timestamp`, `level`, `logger`, `event`, `extra`; PHI nunca en `extra` plano.
- **Storage:** bucket privado `dicom-files`; acceso vía signed URLs server-side, nunca URL pública.
- **Secretos:** variables de entorno en Vercel y Railway; nunca commiteadas; `.env` en `.gitignore`.
- **Input validation:** `pydicom` con `stop_before_pixels=True` en upload; tamaño máximo 10 MB; validación de mime/extensión.
- **CORS:** orígenes explícitos para Vercel (commit `9939e55`).
- **HTTPS:** obligatorio en producción (Vercel y Railway lo proveen).
- **Server actions:** el `access_token` de Supabase no se filtra al navegador.

**Aspectos organizativos.**

- Roles documentados (§ 13.1.4).
- Administrador único del repo: Mateo Salas (override `--no-verify` solo él, en emergencia, con registro).
- Slash command `/oncoscan-clinical-review` aplicable como gate en PRs que tocan PHI.
- Política de no atribución a IA en commits y artefactos (memory `feedback-no-ai-attribution.md`).

**Aspectos legales.**

- Cumplimiento RGPD/LOPDGDD limitado a `email` de usuarios autenticados (datos de cuenta).
- Prohibido procesar pacientes reales (R2).
- Datasets entrenados sobre LIDC-IDRI (público, anonimizado).
- Disclaimer clínico en homepage, README y `/platform/modelo`.

---

### 17.6 Otros anexos

- **Anexo A.** Capturas operativas del smoke test (`docs/smoke-test.md`) [Pendiente de adjuntar por el autor: capturas reales].
- **Anexo B.** Auditorías PSP completas en `docs/psp/audits/2026-05-22-audit.md` y `docs/psp/audits/2026-05-22-audit-postremediation.md`.
- **Anexo C.** Post-mortem de sub-proyecto E en `docs/psp/postmortems/sub-proyecto-e.md`.
- **Anexo D.** Issues Jira detallados en `docs/jira/fase-0-mvp-base.md`, `sub-proyecto-a-claude-skills.md`, `sub-proyecto-b-design-system.md`, `sub-proyecto-c-follow-ups.md`.
- **Anexo E.** Specs y planes en `docs/superpowers/` [Pendiente de revisión por el autor].

---

## 18. Especificaciones del sistema

### 18.1 Requisitos funcionales detallados

Fuente normativa: `docs/requisitos.md`.

| ID | Texto completo | Estado | Issue Jira | Criterio de aceptación verificable |
|----|----------------|--------|------------|-------------------------------------|
| **RF-001** | El sistema debe aceptar archivos `.dcm`, `.png` y `.jpg` en el endpoint `POST /api/v1/dicom/upload`, con tamaño máximo de 10 MB. | Implementado | KAN-39, KAN-44 | Petición con `.dcm` 9.9 MB → 201; petición con 10.1 MB → 413. |
| **RF-002** | El sistema debe ejecutar inferencia contra el HF Space `luisdam-oncoscan-ai` enviando imagen y 8 features clínicas. | Implementado | KAN-38 | Tras upload, log estructurado evento `analysis_dispatched`; fila actualizada con `ai_completed`. |
| **RF-003** | El sistema debe clasificar el riesgo del resultado IA en `BAJO`, `MEDIO` o `ALTO` y producir una recomendación textual. | Implementado | KAN-29 | `ai_risk_level ∈ {BAJO, MEDIO, ALTO}` y `ai_recommendation` no vacío. |
| **RF-004** | El sistema debe permitir asociar opcionalmente un paciente al upload mediante `patient_id`. | Implementado | (sub-proyecto E) | Upload con `patient_id` → fila contiene el id; sin `patient_id` → campo NULL. |
| **RF-005** | El signup debe crear el perfil del usuario mediante el trigger `on_auth_user_created` en Supabase. | Implementado | (sub-proyecto E) | Tras signup, fila en `public.profiles`. |
| **RF-006** | El dashboard debe mostrar el resultado IA completo (score, riesgo, recomendación, versión del modelo) junto con los parámetros que el usuario ingresó. | Implementado | KAN-43 | Página `/platform/uploads/[id]` muestra los 4 campos y los 8 features. |
| **RF-007** | El usuario debe poder ingresar las 8 features clínicas mediante sliders antes de disparar el análisis. | Implementado | KAN-40 | `/platform/analyze` muestra 8 sliders funcionales. |
| **RF-008** | El historial DICOM debe mostrar columnas de riesgo y score para cada análisis del usuario. | Implementado | KAN-42 | `/platform/uploads` muestra `RiskBadge` + score por fila. |
| **RF-009** | El usuario debe poder buscar en el historial DICOM por nombre de caso. | Implementado | (legacy) | Barra de búsqueda filtra por `original_name` o `case_ref`. |
| **RF-010** | El modelo entrenado debe ser exportable y reejecutable localmente vía `demo.py`. | Implementado | KAN-30/31/32 | `python demo.py` produce predicción reproducible. |
| **RF-011** | Las alertas de riesgo deben renderizarse con jerarquía visual (rojo solo para alertas clínicas) y semántica accesible (`role="alert"`, `aria-live="assertive"` para crítico). | Implementado parcial | KAN-41 | `/platform/alertas` con `AlertBanner variant="critical"`. |

### 18.2 Requisitos no funcionales detallados

| ID | Texto completo | Estado | Verificación |
|----|----------------|--------|--------------|
| **RNF-001** | Cero PHI (`email`, `file_path`, `case_ref`, `result_json`, `score`, `patient_id`, `external_id`, `display_alias`) en stdout/stderr o respuesta al cliente. | **Verificado** | `apps/api/tests/test_logging.py`; revisión `/oncoscan-clinical-review`. |
| **RNF-002** | Logger backend en JSON estructurado con `timestamp`, `level`, `logger`, `event`, `extra`. | **Verificado** | `apps/api/tests/test_logging.py`. |
| **RNF-003** | Commits desde 2026-05-22 siguen `tipo(KAN-XX): descripción`, validado por hook. | En adopción | `.githooks/commit-msg` activo. |
| **RNF-004** | Policies RLS no recursivas. | **Verificado** | Smoke test post-policy; memory `rls-patterns.md`. |
| **RNF-005** | Tras login, esperar propagación de sesión antes de `router.push`. | **Verificado** | Sub-proyecto E. |
| **RNF-006** | `/api/v1/*` exige Bearer JWT válido emitido por Supabase Auth. | Implementado | Pendiente test `test_401_sin_bearer`. |
| **RNF-007** | Componentes UI clínicos cumplen WCAG AA. | Implementado parcial | `/oncoscan-a11y` por archivo. |
| **RNF-008** | Timeout `/predict` configurable, default 120 s. | Implementado | Variable `HF_PREDICT_TIMEOUT`. |

### 18.3 Modelo de datos (resumen)

**Tabla `public.dicom_uploads`** (post-migración `docs/ai-service-migration.sql`):

- `id` (uuid, PK)
- `user_id` (uuid, FK → `auth.users.id`)
- `original_name` (text)
- `storage_path` (text)
- `file_size` (bigint)
- `file_type` (text — `dcm`, `png`, `jpg`)
- `modality` (text — DICOM)
- `study_date` (date — DICOM)
- `patient_id_dicom` (text — DICOM, distinto de FK)
- `patient_id` (uuid, nullable, FK lógica al paciente del sistema)
- `case_ref` (text, nullable)
- `clinical_features` (jsonb — 8 features LIDC-IDRI)
- `upload_status` (text — `processing`, `ai_completed`, `ai_failed`, `analyzed` legacy, `error` legacy)
- `ai_score` (numeric, nullable)
- `ai_risk_level` (text, nullable — `BAJO`/`MEDIO`/`ALTO`)
- `ai_recommendation` (text, nullable)
- `ai_model_version` (text, nullable)
- `ai_processed_at` (timestamptz, nullable)
- `ai_error` (text, nullable)
- `metadata_json` (jsonb)
- `created_at` (timestamptz, default `now()`)

**RLS:** policies por `user_id`; no recursivas (RNF-004).

### 18.4 API REST (resumen)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | ❌ | Health check. |
| POST | `/api/v1/dicom/upload` | ✅ Bearer JWT | Subida de archivo + metadata. |
| GET | `/api/v1/analysis/{id}` | ✅ Bearer JWT | Estado y resultado del análisis IA. |

---

## 19. Presupuesto

### 19.1 Cuadro de precios (referencial)

| Concepto | Unidad | Precio unitario (€) |
|----------|--------|----------------------|
| Hora ingeniero junior (front/back) | h | 25 |
| Hora ingeniero AI | h | 30 |
| Hora PM / auditor PSP | h | 30 |
| Licencias software | — | 0 |
| Hosting (Vercel free) | mes | 0 |
| Hosting backend (Railway free) | mes | 0 |
| BaaS (Supabase free) | mes | 0 |
| Servicio IA (HF Spaces free) | mes | 0 |
| Almacenamiento Storage (Supabase free) | GB | 0 |

### 19.2 Coste por unidad lógica (sub-proyecto / módulo)

| Unidad lógica | Horas | Tarifa (€/h) | Coste referencial (€) |
|---------------|-------|--------------|------------------------|
| Fase 0 — MVP base | 120 | 25 | 3.000 |
| Sub-proyecto A — Claude skills | 12 | 25 | 300 |
| Sub-proyecto B — Design system + WCAG | 60 | 25 | 1.500 |
| Sub-proyecto C — Follow-ups + merge | 70 | 25 | 1.750 |
| Sub-proyecto D — IA integration | 80 | 25 | 2.000 |
| Sub-proyecto E — Pacientes + RLS | 50 | 25 | 1.250 |
| Modelo IA (entrenamiento Kaggle) | 40 | 30 | 1.200 |
| Remediación PSP (KAN-55/56/57) | 25 | 25 | 625 |
| Documentación (esta memoria + docs/psp) | 35 | 25 | 875 |
| PM / reuniones / asesoría | 30 | 30 | 900 |
| **Subtotal mano de obra** | **522** | — | **13.400** |
| Infraestructura | — | — | 0 |
| Licencias | — | — | 0 |
| **TOTAL** | — | — | **13.400 €** |

### 19.3 Valoración global

- **Coste real desembolsado:** 0,00 €.
- **Coste referencial total (horas × tarifa interna):** **13.400 €**.
- **Coste por hito promedio:** 13.400 € / 10 ≈ 1.340 € por hito.

No se incluye IVA por tratarse de cálculo interno académico no facturable.

---

## 20. Estudios con entidad propia

### 20.1 Legislación de protección de datos

- **Aplicable:** RGPD (Reglamento (UE) 2016/679), LOPDGDD (LO 3/2018).
- **Datos personales tratados por OncoScan:** únicamente el `email` del usuario autenticado, su identificador interno (uuid) y el conjunto de uploads que él mismo realiza. Estos uploads pueden contener metadatos DICOM (`PatientID`, `StudyDate`, `Modality`) provenientes de **archivos sintéticos o públicos** (LIDC-IDRI); está **prohibido** subir datos reales de pacientes (R2).
- **Base legal del tratamiento:** consentimiento del propio usuario académico al darse de alta en la plataforma.
- **Derechos del interesado:** acceso, rectificación, supresión, oposición — gestionables por borrado de cuenta en Supabase.
- **Medidas técnicas:** RLS, cifrado en tránsito (HTTPS), Storage privado con signed URLs, logger sin PHI, hook que bloquea commits con patrón de credenciales [recomendación futura].
- **Medidas organizativas:** política `console.*` y `print()`, slash commands de revisión, formación interna del equipo en PHI.
- **No se realiza transferencia internacional de datos personales fuera de los proveedores (Supabase EU/US, Vercel, Railway).**
- **DPO:** N/A (proyecto académico).

### 20.2 Propiedad intelectual

- **Código fuente:** propiedad del equipo de desarrollo OncoScan; licencia por defecto **[Pendiente de definir por el autor — sugerencia: MIT, Apache 2.0 o CC BY-NC-SA si se desea limitar uso comercial]**.
- **Dependencias open source:** Next.js (MIT), React (MIT), FastAPI (MIT), Tailwind (MIT), Supabase JS/Py SDK (Apache 2.0), pydicom (MIT), httpx (BSD), Vitest (MIT), PyTorch (BSD-style), Lucide React (ISC). Compatibles con uso académico y derivados.
- **Modelo entrenado:** derivado de ResNet18 (sin restricción comercial) entrenado sobre LIDC-IDRI (licencia CC BY 3.0; uso académico permitido).
- **Marca y nombre:** "OncoScan" / "Benditos Cancer Detector" — uso académico; **[Pendiente de definir por el autor — registro de marca no realizado]**.
- **Atribución:** se prohíbe explícitamente la atribución de autoría a herramientas de IA o asistentes (regla interna `feedback-no-ai-attribution.md`). El equipo firma como autor único.

### 20.3 Prevención de riesgos laborales (PRL)

- **Modalidad de trabajo:** estudiantes operando desde sus equipos personales en hogar o instalaciones del centro educativo.
- **Riesgos típicos identificados:**
  - Trastornos musculoesqueléticos por postura prolongada.
  - Fatiga visual por uso continuado de pantalla.
  - Estrés por plazos académicos.
- **Medidas recomendadas:**
  - Pausas activas cada 50 min (técnica Pomodoro modificada).
  - Iluminación adecuada y altura de pantalla regulable.
  - Reparto equilibrado de carga entre integrantes (visibilidad vía Jira).
- **Aplicación de normativa PRL:** el centro educativo asume la responsabilidad de PRL durante actividades presenciales; el trabajo remoto queda fuera del ámbito de la Ley 31/1995 al no existir relación laboral.

### 20.4 Impacto ambiental

- **Huella computacional del entrenamiento:** un entrenamiento ResNet18 transfer learning de 45 épocas en Kaggle GPU se estima en ~5–10 kWh (orden de magnitud). Se reentrenó pocas veces; impacto bajo.
- **Inferencia:** el HF Space free tier escala a cero cuando no se usa; impacto operativo despreciable.
- **Infraestructura:** Vercel, Railway, Supabase y HF declaran neutralidad/compensación parcial de carbono en sus políticas públicas; ninguna acción adicional del equipo.
- **Documentos físicos:** entrega 100% digital; ningún consumo significativo de papel.
- **Conclusión:** impacto ambiental directo del proyecto considerado **bajo**, congruente con su naturaleza académica y de escala reducida.

---

*Fin del documento.*

*Cualquier sección marcada como "[Pendiente de definir por el autor]" debe completarse manualmente antes de la entrega formal final (hito M-010, 2026-06-29).*
