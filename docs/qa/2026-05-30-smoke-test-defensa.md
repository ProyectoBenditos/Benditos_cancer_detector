# Smoke Test E2E — Defensa OncoScan

- **Versión del documento**: 1.0
- **Fecha de creación**: 2026-05-30
- **Branch**: `merge/fronted-nicolas-into-main`
- **Commit HEAD al crear**: `7b0b3db`
- **Entornos probados**:
  - **Local**: `http://localhost:3000` (frontend) + `http://localhost:8000` (API)
  - **Staging**: `https://benditos-cancer-detector.vercel.app` (frontend) + `https://benditoscancerdetector-production.up.railway.app` (API)

## Instrucciones de ejecución

1. Ejecutar el checklist completo **primero en local**, luego en **staging**.
2. Para cada fila: marcar `✓` si el comportamiento coincide con "Esperado", `✗` si no, `N/A` si no aplica.
3. Anotar la URL exacta y timestamp (HH:MM hora local) en la columna "Notas".
4. Si algún ítem marca `✗`, registrar el comportamiento real observado en "Notas" y abrir issue KAN.
5. Usar **datos sintéticos únicamente**: ningún DICOM de paciente real, ningún email personal visible en capturas.

## Datos de prueba sugeridos

| Dato | Valor sugerido |
|------|---------------|
| Email médico de prueba | `medico-test-001@demo.com` |
| Email admin de prueba | `admin-test-001@demo.com` (ya aprobado) |
| External ID paciente | `TEST-001` |
| Display alias paciente | `Paciente de prueba` |
| Case ref DICOM | `CASE-SMOKE-001` |
| DICOM CT válido | archivo del equipo con Modality=CT y 6 tags mínimos |
| DICOM OT (falla) | `docs/qa/fixtures/dicom_ot_modality.dcm` |
| DICOM sin Modality (falla) | `docs/qa/fixtures/dicom_sin_modality.dcm` |

---

## Checklist

### Bloque A — Registro y consentimiento

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| A-01 | Abrir `/signup` sin sesión | Formulario de registro visible con campo de checkbox de consentimiento | ☐ | ☐ | |
| A-02 | Completar campos, **sin** marcar el checkbox de consentimiento y hacer clic en "Registrarse" | Submit bloqueado (botón deshabilitado o validación HTML `required`) — no se crea cuenta | ☐ | ☐ | |
| A-03 | Completar campos, **marcando** el checkbox, submit | Cuenta creada; redirige a `/cuenta-pendiente` | ☐ | ☐ | |
| A-04 | Verificar en Supabase que el nuevo `profile` tiene `consent_version = "2026-05-28-v1"` y `consent_at` poblado | Columnas no nulas | ☐ | ☐ | |
| A-05 | Texto del consentimiento visible antes de hacer clic en submit | Bloque expandible o visible con la frase "no es un dispositivo médico certificado" | ☐ | ☐ | |

### Bloque B — Gate de aprobación

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| B-01 | Intentar acceder a `/platform` con el médico recién registrado (status=`pending`) | Redirect a `/cuenta-pendiente` — no ve la plataforma | ☐ | ☐ | |
| B-02 | Login como admin y abrir `/platform` | Dashboard muestra tarjeta "Médicos pendientes" con count ≥ 1 (el médico recién creado en A-03) | ☐ | ☐ | |
| B-03 | Admin abre `/platform/admin/medicos` | Lista de médicos pendientes visible con nombre del médico de prueba | ☐ | ☐ | |
| B-04 | Admin aprueba al médico de prueba | Médico cambia a status=`approved`; desaparece de la lista de pendientes | ☐ | ☐ | |
| B-05 | Admin recarga dashboard | Tarjeta "Médicos pendientes" muestra count decrementado (o desaparece si era el único) | ☐ | ☐ | |

### Bloque C — Acceso y rol diferenciado

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| C-01 | Login con el médico recién aprobado | Entra a `/platform` — dashboard sin tarjeta admin | ☐ | ☐ | |
| C-02 | Médico aprobado abre `/platform/ajustes` | Campo "Tipo de cuenta" muestra "Médico" | ☐ | ☐ | |
| C-03 | Admin abre `/platform/ajustes` | Campo "Tipo de cuenta" muestra "Administrador" | ☐ | ☐ | |
| C-04 | Médico aprobado intenta acceder a `/platform/admin/medicos` | Redirect o 403 — no puede ver la lista de médicos de otros | ☐ | ☐ | |

### Bloque D — Gestión de pacientes

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| D-01 | Médico abre `/platform/pacientes` | Lista vacía con CTA "Registrar primer paciente" | ☐ | ☐ | |
| D-02 | Médico crea paciente con external_id=`TEST-001`, alias=`Paciente de prueba` | Paciente aparece en la lista | ☐ | ☐ | |
| D-03 | Médico crea un segundo paciente con external_id=`TEST-002`, alias=`Otro paciente` | Ambos aparecen en la lista | ☐ | ☐ | |
| D-04 | Médico escribe `TEST-001` en el buscador y hace clic en "Buscar" | Solo muestra `TEST-001`; `TEST-002` no aparece | ☐ | ☐ | |
| D-05 | Médico escribe `TEST` en el buscador | Muestra ambos pacientes (ambos contienen TEST) | ☐ | ☐ | |
| D-06 | Médico escribe `XXXXXXXXXX` (texto sin coincidencias) en el buscador | Empty state diferenciado: "No hay pacientes que coincidan con «XXXXXXXXXX»" | ☐ | ☐ | |
| D-07 | Médico hace clic en "Limpiar" | Vuelve a la lista completa; campo de búsqueda vacío | ☐ | ☐ | |

### Bloque E — Upload y validación DICOM

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| E-01 | Médico abre `/platform/upload` | Banner "No es un dispositivo médico certificado" visible antes del formulario; no se puede cerrar (no tiene botón X) | ☐ | ☐ | |
| E-02 | Subir `dicom_ot_modality.dcm` | HTTP 400 con mensaje exacto: "Modalidad OT no soportada. OncoScan procesa únicamente tomografías de tórax (CT)." | ☐ | ☐ | |
| E-03 | Subir `dicom_sin_modality.dcm` | HTTP 400 con mensaje exacto: "DICOM incompleto: falta el tag Modality. Verifica que el estudio sea una tomografía de tórax exportada correctamente." | ☐ | ☐ | |
| E-04 | Subir un DICOM CT válido (con 6 tags mínimos), case_ref=`CASE-SMOKE-001` | Upload exitoso; análisis IA dispara; caso aparece en historial | ☐ | ☐ | |
| E-05 | Abrir el detalle del caso recién creado (`/platform/uploads/[id]`) | Banner disclaimer visible; campos `model_version`, `inference_time_ms` y `predicted_at` visibles (no vacíos) | ☐ | ☐ | |
| E-06 | Verificar `inference_time_ms` tiene valor razonable (> 0 ms) | Número entero positivo | ☐ | ☐ | |
| E-07 | Verificar `model_version` | Contiene "luisdam-oncoscan-ai" o "unknown" | ☐ | ☐ | |
| E-08 | Verificar `predicted_at` | Timestamp ISO 8601 UTC reciente (cercano a la hora del upload) | ☐ | ☐ | |

### Bloque F — Redirecciones y navegación

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| F-01 | Navegar a `/platform/analyze` | Redirect 301/302 a `/platform/upload` | ☐ | ☐ | |
| F-02 | Sidebar de médico aprobado | No muestra enlace a `/platform/analyze`; muestra "Carga y análisis" → `/platform/upload` | ☐ | ☐ | |

### Bloque G — Descarga de reporte

| # | Caso | Esperado | Local | Staging | Notas |
|---|------|----------|-------|---------|-------|
| G-01 | Médico accede a `/platform/reportes` | Página carga sin error | ☐ | ☐ | |
| G-02 | Médico descarga reporte CSV | Archivo `.csv` descargado; contiene el caso `CASE-SMOKE-001` | ☐ | ☐ | |

---

## Resumen de ejecución

### Local (`http://localhost:3000`)

| Bloque | Total ítems | ✓ | ✗ | N/A |
|--------|-------------|---|---|-----|
| A — Consentimiento | 5 | | | |
| B — Gate aprobación | 5 | | | |
| C — Rol diferenciado | 4 | | | |
| D — Pacientes / Búsqueda | 7 | | | |
| E — Upload DICOM | 8 | | | |
| F — Redirecciones | 2 | | | |
| G — Reporte CSV | 2 | | | |
| **Total** | **33** | | | |

Ejecutado por: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ · Fecha/hora: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ · Commit: \_\_\_\_\_\_\_\_

### Staging (`https://benditos-cancer-detector.vercel.app`)

| Bloque | Total ítems | ✓ | ✗ | N/A |
|--------|-------------|---|---|-----|
| A — Consentimiento | 5 | | | |
| B — Gate aprobación | 5 | | | |
| C — Rol diferenciado | 4 | | | |
| D — Pacientes / Búsqueda | 7 | | | |
| E — Upload DICOM | 8 | | | |
| F — Redirecciones | 2 | | | |
| G — Reporte CSV | 2 | | | |
| **Total** | **33** | | | |

Ejecutado por: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ · Fecha/hora: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_ · Commit: \_\_\_\_\_\_\_\_

---

## Issues abiertos durante la ejecución

_(completar si algún ítem marcó ✗)_

| Ítem | Comportamiento observado | Issue KAN | Severidad |
|------|--------------------------|-----------|-----------|
| | | | |
