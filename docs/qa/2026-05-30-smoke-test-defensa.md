# Smoke Test E2E — Defensa OncoScan

- **Versión del documento**: 1.1
- **Fecha de creación**: 2026-05-30
- **Fecha de ejecución**: 2026-05-30
- **Branch**: `merge/fronted-nicolas-into-main`
- **Commit HEAD ejecutado**: `a8594ae`
- **Entornos probados**:
  - **Local**: `http://localhost:3000` (frontend) + `http://localhost:8000` (API)
  - **Staging**: `https://benditos-cancer-detector.vercel.app` (frontend) + `https://benditoscancerdetector-production.up.railway.app` (API)

## Datos de prueba usados

| Dato | Valor |
|------|-------|
| Email médico de prueba | `medico-test-001@demo.com` |
| Email admin de prueba | `admin-test-001@demo.com` |
| External ID paciente 1 | `TEST-001` |
| Display alias paciente 1 | `Paciente de prueba` |
| External ID paciente 2 | `TEST-002` |
| Display alias paciente 2 | `Otro paciente` |
| Case ref DICOM | `CASE-SMOKE-001` |
| DICOM CT válido | `chest_ct_fixture.dcm` (archivo local del equipo, Modality=CT) |
| DICOM OT (falla) | `docs/qa/fixtures/dicom_ot_modality.dcm` |
| DICOM sin Modality (falla) | `docs/qa/fixtures/dicom_sin_modality.dcm` |

---

## Checklist

### Bloque A — Registro y consentimiento

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| A-01 | Abrir `/signup` sin sesión | Formulario de registro visible con checkbox de consentimiento | ✓ | ✓ | Local 10:03 · Staging 11:07 — checkbox visible debajo del campo contraseña |
| A-02 | Completar campos **sin** marcar checkbox y hacer clic en "Registrarse" | Submit bloqueado (validación HTML `required`) — no se crea cuenta | ✓ | ✓ | Local 10:04 · Staging 11:08 — navegador muestra tooltip "este campo es obligatorio" |
| A-03 | Completar campos **marcando** el checkbox, submit | Cuenta creada; redirige a `/cuenta-pendiente` | ✓ | ✓ | Local 10:05 · Staging 11:09 — redirect correcto, banner "cuenta en revisión" visible |
| A-04 | Verificar en Supabase que el nuevo `profile` tiene `consent_version = "2026-05-28-v1"` y `consent_at` poblado | Columnas no nulas | ✓ | ✓ | Local 10:06 · Staging 11:10 — Table Editor Supabase: consent_version="2026-05-28-v1", consent_at="2026-05-30T15:05:41Z" |
| A-05 | Texto del consentimiento visible antes de submit | Bloque expandible con la frase "no es un dispositivo médico certificado" | ✓ | ✓ | Local 10:03 · Staging 11:07 — texto completo visible en `<details>` expandido |

### Bloque B — Gate de aprobación

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| B-01 | Acceder a `/platform` con médico `pending` | Redirect a `/cuenta-pendiente` | ✓ | ✓ | Local 10:07 · Staging 11:11 — redirect inmediato, no expone ninguna ruta de plataforma |
| B-02 | Login como admin y abrir `/platform` | Dashboard muestra tarjeta "Médicos pendientes" con count ≥ 1 | ✓ | ✓ | Local 10:08 · Staging 11:12 — tarjeta aparece con count=1 en la parte superior del dashboard |
| B-03 | Admin abre `/platform/admin/medicos` | Lista de médicos pendientes con el médico de prueba | ✓ | ✓ | Local 10:09 · Staging 11:13 — médico `medico-test-001@demo.com` visible en lista |
| B-04 | Admin aprueba al médico de prueba | Médico pasa a `approved`; desaparece de pendientes | ✓ | ✓ | Local 10:10 · Staging 11:14 — botón "Aprobar" funciona, lista se actualiza |
| B-05 | Admin recarga dashboard | Tarjeta "Médicos pendientes" desaparece (count=0) | ✓ | ✓ | Local 10:10 · Staging 11:14 — tarjeta ya no visible al recargar |

### Bloque C — Acceso y rol diferenciado

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| C-01 | Login con médico recién aprobado | Entra a `/platform` — dashboard sin tarjeta admin | ✓ | ✓ | Local 10:11 · Staging 11:15 — dashboard muestra solo métricas clínicas, sin bloque admin |
| C-02 | Médico aprobado abre `/platform/ajustes` | "Tipo de cuenta": "Médico" | ✓ | ✓ | Local 10:12 · Staging 11:16 — campo muestra "Médico" correctamente |
| C-03 | Admin abre `/platform/ajustes` | "Tipo de cuenta": "Administrador" | ✓ | ✓ | Local 10:13 · Staging 11:17 — campo muestra "Administrador" correctamente |
| C-04 | Médico intenta acceder a `/platform/admin/medicos` | Redirect o 403 | ✓ | ✓ | Local 10:14 · Staging 11:18 — redirect a `/platform`, ruta admin no accesible |

### Bloque D — Gestión de pacientes y búsqueda

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| D-01 | Médico abre `/platform/pacientes` (sin pacientes) | Empty state con CTA "Registrar primer paciente" | ✓ | ✓ | Local 10:15 · Staging 11:19 — empty state correcto, botón visible |
| D-02 | Crea `TEST-001` / `Paciente de prueba` | Paciente aparece en lista | ✓ | ✓ | Local 10:16 · Staging 11:20 |
| D-03 | Crea `TEST-002` / `Otro paciente` | Ambos aparecen en lista | ✓ | ✓ | Local 10:17 · Staging 11:21 |
| D-04 | Busca `TEST-001` | Solo `TEST-001` visible; `TEST-002` oculto | ✓ | ✓ | Local 10:18 · Staging 11:22 — filtro ilike funciona correctamente |
| D-05 | Busca `TEST` | Ambos pacientes visibles | ✓ | ✓ | Local 10:18 · Staging 11:22 |
| D-06 | Busca `XXXXXXXXXX` | Empty state: "No hay pacientes que coincidan con «XXXXXXXXXX»" | ✓ | ✓ | Local 10:19 · Staging 11:23 — mensaje diferenciado correcto |
| D-07 | Clic en "Limpiar" | Lista completa; campo vacío | ✓ | ✓ | Local 10:19 · Staging 11:23 — navegación nativa, sin JS, funciona en ambos |

### Bloque E — Upload y validación DICOM

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| E-01 | Médico abre `/platform/upload` | Banner disclaimer visible, no descartable | ✓ | ✓ | Local 10:20 · Staging 11:24 — banner "No es un dispositivo médico certificado" visible sin botón X |
| E-02 | Subir `dicom_ot_modality.dcm` | HTTP 400: "Modalidad OT no soportada…" | ✓ | ✓ | Local 10:21 · Staging 11:25 — mensaje exacto mostrado en UI |
| E-03 | Subir `dicom_sin_modality.dcm` | HTTP 400: "DICOM incompleto: falta el tag Modality…" | ✓ | ✓ | Local 10:22 · Staging 11:26 — mensaje exacto mostrado en UI |
| E-04 | Subir DICOM CT válido, case_ref=`CASE-SMOKE-001` | Upload exitoso; análisis IA dispara | ✓ | ✓ | Local 10:23 (análisis: ~1.2s local) · Staging 11:27 (análisis: ~3.1s — Space ya caliente) |
| E-05 | Abrir detalle del caso | Banner disclaimer + `model_version` + `inference_time_ms` + `predicted_at` visibles | ✓ | ✓ | Local 10:24 · Staging 11:28 |
| E-06 | `inference_time_ms` razonable (> 0) | Número entero positivo | ✓ | ✓ | Local: `1187` ms · Staging: `3082` ms |
| E-07 | `model_version` correcto | Contiene "luisdam-oncoscan-ai" | ✓ | ✓ | Local: `luisdam-oncoscan-ai@unknown` · Staging: `luisdam-oncoscan-ai@unknown` |
| E-08 | `predicted_at` válido | Timestamp ISO 8601 UTC reciente | ✓ | ✓ | Local: `2026-05-30T15:23:47Z` · Staging: `2026-05-30T16:27:09Z` |

### Bloque F — Redirecciones y navegación

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| F-01 | Navegar a `/platform/analyze` | Redirect a `/platform/upload` | ✓ | ✓ | Local 10:25 · Staging 11:29 — redirect inmediato, sin flash de contenido |
| F-02 | Sidebar del médico | No hay enlace a `/platform/analyze`; sí a `/platform/upload` | ✓ | ✓ | Local 10:25 · Staging 11:29 — "Carga y análisis" apunta a `/platform/upload` |

### Bloque G — Descarga de reporte

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| G-01 | Médico accede a `/platform/reportes` | Página carga sin error | ✓ | ✓ | Local 10:26 · Staging 11:30 |
| G-02 | Descarga reporte CSV | Archivo `.csv` descargado con el caso `CASE-SMOKE-001` | ✓ | ✓ | Local 10:27 · Staging 11:31 — archivo descargado, `CASE-SMOKE-001` presente en la primera fila de datos |

---

## Resumen de ejecución

### Local (`http://localhost:3000`)

| Bloque | Total ítems | ✓ | ✗ | N/A |
|--------|-------------|---|---|-----|
| A — Consentimiento | 5 | 5 | 0 | 0 |
| B — Gate aprobación | 5 | 5 | 0 | 0 |
| C — Rol diferenciado | 4 | 4 | 0 | 0 |
| D — Pacientes / Búsqueda | 7 | 7 | 0 | 0 |
| E — Upload DICOM | 8 | 8 | 0 | 0 |
| F — Redirecciones | 2 | 2 | 0 | 0 |
| G — Reporte CSV | 2 | 2 | 0 | 0 |
| **Total** | **33** | **33** | **0** | **0** |

Ejecutado por: Mateo Salas · Fecha/hora: 2026-05-30 10:03–10:27 · Commit: `a8594ae`

### Staging (`https://benditos-cancer-detector.vercel.app`)

| Bloque | Total ítems | ✓ | ✗ | N/A |
|--------|-------------|---|---|-----|
| A — Consentimiento | 5 | 5 | 0 | 0 |
| B — Gate aprobación | 5 | 5 | 0 | 0 |
| C — Rol diferenciado | 4 | 4 | 0 | 0 |
| D — Pacientes / Búsqueda | 7 | 7 | 0 | 0 |
| E — Upload DICOM | 8 | 8 | 0 | 0 |
| F — Redirecciones | 2 | 2 | 0 | 0 |
| G — Reporte CSV | 2 | 2 | 0 | 0 |
| **Total** | **33** | **33** | **0** | **0** |

Ejecutado por: Mateo Salas · Fecha/hora: 2026-05-30 11:07–11:31 · Commit: `a8594ae`

---

## Issues abiertos durante la ejecución

Ninguno. Los 33 ítems pasaron en ambos entornos.
