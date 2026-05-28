# Roadmap defensa OncoScan — 3 días

**Objetivo:** llegar a la sustentación con la plataforma pulida, sin features
nuevas grandes, sin cabos clínicos sueltos visibles, y con auditoría PSP limpia.

**Plazo absoluto:** 2026-05-31 23:59 (sustentación 2026-05-31).

**Criterios de defensa:**
- Flujo único de carga + análisis sin duplicación visible para el jurado.
- Datos del perfil consistentes (no "Médico" hardcoded para un admin).
- Dashboard diferenciado por rol — admin ve médicos pendientes.
- Cada predicción reporta versión de modelo, tiempo de inferencia y timestamp.
- Upload rechaza DICOM sin tags mínimos con mensaje accionable.
- Signup pide consentimiento informado versionado y queda registrado en `profiles`.
- Disclaimer "no es dispositivo médico" persistente en cada caso visible.
- Búsqueda básica de pacientes funcional para demo en vivo.
- Smoke test E2E manual ejecutado y documentado.
- Auditoría final `/oncoscan-psp-audit` sin hallazgos críticos nuevos.

**Filosofía:** blindaje + pulido de lo ya existente. No abrir scope. Cada tarea
≤4h. Si una crece, se divide o se mueve a out-of-scope.

---

## Día 1 — Cirugía UI (~6h)

### T-01 · Consolidar `/platform/upload` y retirar `/platform/analyze`
- **KAN sugerido:** KAN-77
- **Commit type:** `refactor`
- **Estimación:** 1.5h
- **Archivos:**
  - Eliminar: `apps/web/src/app/platform/analyze/page.tsx`,
    `apps/web/src/app/platform/analyze/AnalyzeForm.tsx`,
    `apps/web/src/app/platform/analyze/actions.ts` y cualquier `loading.tsx` /
    `error.tsx` del directorio.
  - Crear: `apps/web/src/app/platform/analyze/page.tsx` con
    `redirect("/platform/upload")` (sólo si grep encuentra links externos a la
    ruta; si no hay referencias, eliminar el directorio entero).
  - Modificar: `apps/web/src/components/layout/Sidebar.tsx` y landing — quitar
    cualquier entrada que apunte a `/platform/analyze`.
  - Auditar con `git grep -n "platform/analyze"`.
- **Razón:** `/upload` ya acepta `.dcm/.png/.jpg` (ver `accept` en
  `apps/web/src/app/platform/upload/page.tsx:290`) y tiene el mismo formulario
  de 8 features. `/analyze` es duplicado puro y confunde al jurado.
- **DoD:** `git grep -n "platform/analyze"` retorna sólo el redirect (o vacío);
  flujo `/platform/upload` sube DICOM y PNG y dispara análisis IA sin tocar
  otra ruta; `npm run build` pasa.

### T-02 · Rol dinámico en `/platform/ajustes`
- **KAN sugerido:** KAN-78
- **Commit type:** `fix`
- **Estimación:** 0.75h
- **Archivos:**
  - Modificar: `apps/web/src/app/platform/ajustes/page.tsx:37` —
    reemplazar string literal `"Médico"` por lectura de `profiles.role` del
    usuario autenticado y renderizar `"Administrador"` si `role === 'admin'`,
    sino `"Médico"`.
  - Reutilizar patrón ya usado en `platform/layout.tsx` para consultar
    `profiles` (no duplicar el query si ya está en el layout).
- **DoD:** un admin ve "Administrador" en Ajustes, un médico aprobado ve
  "Médico". Si el query a `profiles` falla, mostrar "—" y no romper la página
  (capturar `error` siguiendo el patrón ya documentado en memoria RLS).

### T-03 · Dashboard diferenciado por rol con tarjeta "Médicos pendientes"
- **KAN sugerido:** KAN-79
- **Commit type:** `feat`
- **Estimación:** 2h
- **Archivos:**
  - Modificar: `apps/web/src/app/platform/page.tsx` — leer `profiles.role` del
    usuario y, si `role === 'admin'`, agregar bloque con tarjeta
    `Card` que muestre `COUNT(*) FROM profiles WHERE status = 'pending'` y
    botón secundario "Ir a aprobaciones" → `/platform/admin/medicos`.
  - El bloque admin se renderiza ANTES de las métricas clínicas existentes
    (`totalUploads`, `altosRiesgo`, `analizados`) para que sea lo primero que
    ve el admin al entrar.
  - Usar `AlertBanner variant="warning"` (no `critical` — no es alerta clínica)
    si hay pendientes; vacía o `info` si no.
- **Razón:** hoy admin y médico ven el mismo dashboard genérico. El jurado
  debe ver la diferencia funcional inmediatamente.
- **DoD:** logueado como admin con ≥1 médico `pending`, dashboard muestra la
  tarjeta arriba; logueado como médico, dashboard se renderiza igual que hoy
  (sin tarjeta admin).

### T-04 · Limpieza de copy y navegación
- **KAN sugerido:** KAN-80
- **Commit type:** `chore`
- **Estimación:** 1.5h
- **Archivos sugeridos:**
  - `apps/web/src/components/layout/Sidebar.tsx` — revisar que toda etiqueta
    activa apunte a ruta existente (después de T-01).
  - `apps/web/src/app/platform/upload/page.tsx` — ajustar título/descripción
    para reflejar que esta es la única ruta de carga + análisis.
  - `apps/web/src/app/page.tsx` (landing) — revisar que CTAs no apunten a
    `/platform/analyze`.
- **Reglas:** no introducir nuevos componentes. Sólo texto, links y orden de
  navegación. Si encuentras un `PhantomLink` que el jurado podría tocar,
  reemplazar por copy realista (ej.: "Próximamente") sin hacerlo funcional.
- **DoD:** navegación recorrida manualmente con cuenta médico y cuenta admin
  sin ningún 404 ni link muerto; `npm run build` pasa.

---

## Día 2 — Blindaje clínico mínimo (~6h)

### T-05 · `model_version` + `inference_time_ms` + timestamp en cada predicción
- **KAN sugerido:** KAN-81
- **Commit type:** `feat`
- **Estimación:** 2h
- **Archivos:**
  - Modificar: `apps/api/app/api/v1/routers/analysis.py` — medir
    `t0 = time.monotonic()` antes de llamar `hf_predict`, calcular
    `inference_time_ms = int((time.monotonic() - t0) * 1000)` después.
    Incluir en el dict que se persiste y en la respuesta:
    `model_version` (leer de env `HF_MODEL_VERSION`, default `"luisdam-oncoscan-ai@unknown"`),
    `inference_time_ms`, `predicted_at` (ISO 8601 UTC).
  - Modificar: `apps/api/app/api/v1/routers/dicom.py` — mismo bloque dentro
    del endpoint `/dicom/analyze/{dicom_id}` que ya invoca el modelo.
  - Schema BD: si `dicom_uploads` no tiene aún esas columnas, agregar
    migration `supabase/migrations/<ts>_predicciones_metadata.sql` con
    `ALTER TABLE dicom_uploads ADD COLUMN model_version text, ADD COLUMN
    inference_time_ms int, ADD COLUMN predicted_at timestamptz`. Todas
    nullable para no romper datos existentes.
  - Modificar: `apps/web/src/app/platform/uploads/[id]/page.tsx` (detalle
    del caso) para mostrar los tres campos en un bloque secundario.
- **PHI:** `log_event` debe loguear sólo `inference_time_ms` y
  `model_version` — NO `score`, `nivel_riesgo`, `result_json` ni `file_name`
  (ver `PHI_KEYS` en `apps/api/app/core/logging.py`).
- **DoD:** una predicción nueva persiste los tres campos; la página de
  detalle los muestra; ninguna entrada del log nuevo contiene PHI.

### T-06 · Validación de tags DICOM mínimos en upload
- **KAN sugerido:** KAN-82
- **Commit type:** `feat`
- **Estimación:** 1.5h
- **Archivos:**
  - Modificar: `apps/api/app/api/v1/routers/dicom.py` — sólo cuando
    `file_ext == ".dcm"`, tras `pydicom.dcmread(...)` validar presencia de:
    `Modality`, `PatientID`, `StudyInstanceUID`, `SOPInstanceUID`, `Rows`,
    `Columns`. Si falta cualquiera, responder `HTTPException(400, detail="DICOM
    incompleto: falta el tag <NombreTag>. Verifica que el estudio sea una
    tomografía de tórax exportada correctamente.")`.
  - Si `Modality != "CT"`, responder `HTTPException(400, detail="Modalidad
    <X> no soportada. OncoScan procesa únicamente tomografías de tórax (CT).")`.
  - No loguear el `PatientID` ni el nombre del archivo en el error; sólo el
    código y el nombre del tag faltante (que no es PHI).
- **DoD:** subir un DICOM válido CT pasa; subir un DICOM-OT, un DICOM sin
  `Modality`, o un archivo `.dcm` corrupto devuelve 400 con mensaje específico;
  un PNG sigue funcionando sin que esta validación lo bloquee.

### T-07 · Consentimiento informado versionado en signup
- **KAN sugerido:** KAN-83
- **Commit type:** `feat`
- **Estimación:** 2h
- **Archivos:**
  - Nuevo: `supabase/migrations/<ts>_profiles_consent.sql` —
    `ALTER TABLE profiles ADD COLUMN consent_version text, ADD COLUMN
    consent_at timestamptz`. Ambas nullable (perfiles previos siguen siendo
    válidos para defensa; el gate de re-firma queda fuera de scope).
  - Constante compartida `CONSENT_VERSION = "2026-05-28-v1"` en
    `apps/web/src/lib/consent.ts` (archivo nuevo, una sola constante + texto
    del consentimiento como string exportado).
  - Modificar: `apps/web/src/app/signup/SignupForm.tsx` — agregar
    `<details>` o bloque expandible con el texto completo del consentimiento
    (sin scroll horizontal) y un `<input type="checkbox" required>` con
    label "He leído y acepto el consentimiento informado (versión
    2026-05-28-v1)". El submit no debe poder dispararse sin el check.
  - Modificar: `apps/web/src/app/signup/actions.ts` — validar en server
    action que `formData.get("consent")` es `"on"`. Persistir
    `consent_version = CONSENT_VERSION` y `consent_at = new Date().toISOString()`
    en el `INSERT INTO profiles`.
- **Texto del consentimiento (resumen, NO redactar como abogado):** OncoScan
  es una plataforma académica de apoyo a la detección temprana, **no es un
  dispositivo médico certificado**, los resultados no reemplazan al
  especialista, los datos cargados (DICOM + metadatos) se procesan según las
  políticas internas del proyecto y pueden ser utilizados con fines docentes
  anonimizados.
- **DoD:** un nuevo signup sin tildar el check no envía form; un signup
  válido persiste `consent_version` y `consent_at` en `profiles`; perfiles
  pre-existentes NO se rompen.

### T-08 · Disclaimer "no es dispositivo médico" persistente por caso
- **KAN sugerido:** KAN-84
- **Commit type:** `feat`
- **Estimación:** 0.5h
- **Archivos:**
  - Modificar: `apps/web/src/app/platform/uploads/[id]/page.tsx` y
    `apps/web/src/app/platform/upload/page.tsx` — agregar `AlertBanner
    variant="warning"` (no `critical`) fijo en la parte superior con texto:
    "OncoScan es una herramienta académica de apoyo. **No es un dispositivo
    médico certificado** y su resultado no reemplaza el juicio del
    especialista." El banner debe estar visible sin que el usuario lo
    pueda cerrar (no `dismissible`).
- **Razón:** hoy el disclaimer aparece sólo como caption gris al pie del
  resultado (`upload/page.tsx:445`). Para defensa debe ser persistente y
  visible desde antes de ver el score.
- **DoD:** al entrar a un caso o a la pantalla de upload, el banner es lo
  primero visible bajo el `SectionHeader`; capturas para acta lo muestran.

---

## Día 3 — Cierre, demo y entregables (~5h)

### T-09 · Búsqueda básica de pacientes
- **KAN sugerido:** KAN-85
- **Commit type:** `feat`
- **Estimación:** 1.5h
- **Archivos:**
  - Modificar: `apps/web/src/app/platform/pacientes/page.tsx` — convertir en
    Server Component que acepta `searchParams.q` (string opcional). Si `q`
    está presente, filtrar con
    `.or("external_id.ilike.%${q}%,display_alias.ilike.%${q}%")`
    (escapar `%` y `,` defensivamente — usar `replace` simple para `%`
    y `,` antes de interpolar). Si `q` está vacío, query original.
  - Agregar `<form method="get">` con `<input name="q">` y botón "Buscar"
    arriba de la tabla — sin JS, sólo navegación nativa.
  - Mostrar `Empty state` distinto si hay `q` y resultados vacíos
    ("No hay pacientes que coincidan con '<q>'") vs lista vacía real.
- **DoD:** buscar `TEST` filtra a los pacientes cuyo `external_id` o
  `display_alias` contiene `TEST`; sin query, lista completa; tests
  existentes (si los hay) siguen pasando.

### T-10 · Smoke test E2E manual documentado + auditoría final
- **KAN sugerido:** KAN-86
- **Commit type:** `docs`
- **Estimación:** 2h
- **Archivos:**
  - Nuevo: `docs/qa/2026-05-30-smoke-test-defensa.md` — checklist numerada
    cubriendo: signup con consentimiento, gate `pending`, aprobación admin,
    login médico aprobado, creación de paciente, búsqueda de paciente
    (T-09), upload DICOM CT válido (con tags), upload DICOM-OT (debe fallar
    con 400 limpio), upload DICOM sin `Modality` (debe fallar), análisis IA
    completo con `model_version` + `inference_time_ms` visibles, descarga
    de reporte CSV, dashboard admin muestra pendientes, dashboard médico no
    muestra tarjeta admin, disclaimer visible en caso. Cada item con
    "Esperado" verificable.
  - Ejecutar el smoke test contra entorno local + el de Railway/Vercel
    de staging y dejar checkmarks junto a cada paso con la fecha y la URL
    probada.
  - Correr `/oncoscan-psp-audit` (slash command). Si aparecen hallazgos
    nuevos críticos o altos, registrar como issues KAN nuevos y mover el
    fix correspondiente a T-11.
- **DoD:** documento publicado con todos los items en ✓; auditoría PSP
  ejecutada y reporte guardado en `docs/psp/audits/2026-05-30-audit-pre-defensa.md`.

### T-11 · Regenerar memoria CCII + acta de cierre si aplica
- **KAN sugerido:** KAN-87
- **Commit type:** `docs`
- **Estimación:** 1.5h
- **Archivos:**
  - Si el committee CCII-N2016-02 requiere acta de cierre actualizada (ver
    `docs/psp/postmortems/` y memoria previa CCII referida en commit
    `6489525`): regenerar con las entregas T-01..T-10 listadas y commits
    de cada una; firmar con los integrantes del equipo (sin atribución a
    Claude/IA, ver memoria `feedback-no-ai-attribution`).
  - Actualizar `docs/psp/milestones.md` marcando M-006 (disciplina PSP)
    como cerrado si los criterios se cumplen, o anotar el delta.
  - Generar PDF/imagen de las 2-3 pantallas que se usarán en la sustentación
    como respaldo dentro de `docs/qa/screenshots-defensa/` (capturas, no
    grabaciones — el laboratorio puede no tener internet estable).
- **DoD:** acta firmada y commiteada; `milestones.md` actualizado;
  capturas presentes; `git status` limpio en la rama de la defensa.

---

## Out of scope (explícito, no se hace en estos 3 días)

1. Visor DICOM con `cornerstone.js`.
2. Audit log clínico estructurado (tabla `audit_events` + UI admin).
3. Notificación por email al médico cuando admin aprueba/rechaza (E-2).
4. Validación automática de cédula profesional contra registro oficial (E-1).
5. ETL TCIA/GDC reproducible — corresponde a M-008.
6. Pipeline multimodal del modelo IA (cancelado en KAN-12).
7. Monitoreo / dashboards de observabilidad — corresponde a M-009.
8. Recolección de re-consentimiento para perfiles previos.
9. Tests automatizados nuevos más allá de los existentes (8 vitest + 4 pytest).
10. CI/CD que corra tests en cada PR (queda como mejora post-defensa).

## Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Cold-start del HF Space en la demo en vivo deja al jurado esperando | Alta | Alto | Hacer una predicción de calentamiento 5 min antes; tener captura de respaldo (T-11). |
| Una migration nueva (T-05 o T-07) falla en Supabase prod | Media | Alto | Aplicar primero en proyecto staging; tener SQL de rollback listo en el mismo PR. |
| La validación de tags DICOM (T-06) rechaza estudios de prueba que el equipo usaba | Media | Medio | Verificar contra los DICOMs del fixture de demo antes de mergear T-06; si rompe, ajustar lista de tags requeridos. |
| El check de consentimiento (T-07) bloquea el signup del segundo admin durante la demo | Baja | Medio | Crear admin extra ANTES de mergear T-07 o aceptar el check en el flujo de demo. |
| Auditoría PSP de T-10 abre hallazgos nuevos sin tiempo de remediar | Media | Medio | Reservar 1h en T-11 como buffer; cualquier hallazgo no crítico se registra como issue post-defensa, no bloquea sustentación. |

## Definition of Done global

- Todos los commits siguen `tipo(KAN-XX): descripción` y pasan el hook
  `.githooks/commit-msg`.
- Ningún commit ni archivo del repo menciona "Claude", "IA", "asistente" ni
  contiene `Co-Authored-By: Claude*` (ver memoria `feedback-no-ai-attribution`).
- `git grep -nE "console\.(log|warn|error)" apps/web/src` sigue retornando
  sólo la línea autorizada en `platform/error.tsx` con `error.digest`.
- `git grep -nE "print\(" apps/api/app | grep -v tests` retorna 0 hits.
- Ningún `log_event` introducido en T-05/T-06 incluye `email`, `file_name`,
  `Case_Ref`, `result_json`, `score`, `patient_id`, ni URLs de Storage.
- `cd apps/web && npm run build` y `cd apps/api && pytest -q` pasan al
  cierre del día 3.
