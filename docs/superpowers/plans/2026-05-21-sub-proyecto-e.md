# Sub-proyecto E — Registro de médicos, gestión de pacientes y tests

## Contexto

Sub-proyecto D cerró 4 fixes quirúrgicos de seguridad/a11y/exactitud clínica y dejó 2 items abiertos para decisión del equipo: tests automatizados (item D-7) y el token `bg-slate-950` de la landing (item D-6).

Sub-proyecto E aterriza tres features que el sistema necesita para pasar de un prototipo de prueba a una plataforma operable:

1. **Registro de médicos con verificación manual** — hoy `/login` solo permite iniciar sesión. No existe flujo público para crear cuenta. El nuevo flujo es: el médico llena el form de registro → su perfil queda `pending` → el **admin** lo aprueba manualmente desde un panel interno → solo entonces el médico tiene acceso a la plataforma. Hasta que no esté aprobado, no puede usar ninguna feature (ni siquiera entrar a `/platform/*`).
2. **Gestión de pacientes** — hoy el "paciente" vive como `case_ref` (string libre en `metadata_json`) y `patient_id_dicom` (leído del DICOM, no editable). No hay forma de listar pacientes, ver todos los estudios de un paciente, ni asociar uploads a una entidad persistente. La landing y el sidebar muestran "Pacientes Registrados" como Phantom — ahora se hace real.
3. **Tests** — el repo no tiene tooling de tests. `analyzeAction` tiene lógica de validación de 8 features clínicas con rangos que se rompe silenciosamente si alguien la toca. Vitest unitario sobre validación + colección Postman para endpoints FastAPI cierran el agujero sin el costo de armar pytest también.

**Decisiones tomadas para acotar scope:**

| Decisión | Elegido | Justificación |
|----------|---------|---------------|
| Schema paciente | Solo `external_id + display_alias + notes` | Minimiza PHI guardada en claro. Cumple regulación clínica básica. |
| Registro médico | Profesional completo (cédula + especialidad + institución) | El sistema debe distinguir quién subió cada estudio para futura validación regulatoria. |
| Flujo de signup | Pendiente de aprobación manual por admin (no auto-aprobado) | Evita que cualquier persona acceda sin validación; el admin verifica los datos profesionales antes de habilitar la cuenta. |
| Cobertura tests | Vitest frontend + Postman API | Cobertura de la lógica más frágil (validación de inputs) sin duplicar tooling Python. |

---

## Arquitectura

**Migrations Supabase (2 tablas nuevas + RLS):**

```sql
-- profiles: extensión de auth.users con datos profesionales + estado de aprobación
profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  cedula_profesional text NOT NULL,
  especialidad text NOT NULL,
  institucion text NOT NULL,
  role text NOT NULL DEFAULT 'medico' CHECK (role IN ('medico', 'admin')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  created_at timestamptz DEFAULT now()
)

-- patients: pacientes asociados al médico que los registra
patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id text NOT NULL,                          -- código clínico del médico
  display_alias text,                                 -- "Paciente CT-001" — opcional
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, external_id)                       -- un médico no duplica external_id
)
```

**RLS:**
- `profiles`:
  - SELECT/UPDATE de su propio registro (médico ve y edita su perfil, salvo `status` y `role`)
  - INSERT permitido en signup (cualquier usuario autenticado puede crear SU profile inicialmente, con `status='pending'`)
  - **Admin (`role='admin'`) puede SELECT y UPDATE TODOS los profiles** — necesario para el panel de aprobación. Implementado con `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')`.
- `patients`: SELECT/INSERT/UPDATE/DELETE solo donde `user_id = auth.uid()`.

**Primer admin:** se crea manualmente con SQL en el dashboard Supabase (`UPDATE profiles SET role='admin', status='approved' WHERE id = '<uuid del usuario admin>'`). Documentado en task 7.

**Asociación de uploads con pacientes** (cambio mínimo en `dicom_uploads`):
- Agregar columna nullable `patient_id uuid REFERENCES patients(id) ON DELETE SET NULL`
- `case_ref` (en `metadata_json`) se conserva como fallback opcional para evitar romper datos existentes.

**Páginas y server actions nuevas:**

| Path | Tipo | Responsabilidad |
|------|------|-----------------|
| `apps/web/src/app/signup/page.tsx` | Server Component + Client form | Form de registro de médico |
| `apps/web/src/app/signup/actions.ts` | Server Action | Crea usuario en Supabase Auth + inserta en `profiles` con `status='pending'` |
| `apps/web/src/app/cuenta-pendiente/page.tsx` | Server Component | Página mostrada cuando un médico autenticado con `status='pending'` o `'rejected'` intenta entrar |
| `apps/web/src/app/platform/pacientes/page.tsx` | Server Component | Lista pacientes del médico |
| `apps/web/src/app/platform/pacientes/nuevo/page.tsx` | Server Component | Form crear paciente |
| `apps/web/src/app/platform/pacientes/[id]/page.tsx` | Server Component | Detalle paciente + sus estudios |
| `apps/web/src/app/platform/pacientes/actions.ts` | Server Action | CRUD de pacientes |
| `apps/web/src/app/platform/admin/medicos/page.tsx` | Server Component (admin only) | Lista de médicos pendientes + aprobados + rechazados |
| `apps/web/src/app/platform/admin/medicos/[id]/page.tsx` | Server Component (admin only) | Detalle de médico — ver datos completos + aprobar/rechazar |
| `apps/web/src/app/platform/admin/medicos/actions.ts` | Server Action | `approveMedicoAction`, `rejectMedicoAction` |

**Gate de acceso a `/platform/*` (en `apps/web/src/app/platform/layout.tsx`):**
- Si no hay sesión → redirect `/login` (ya existe)
- Si hay sesión pero `profile.status !== 'approved'` → redirect `/cuenta-pendiente`
- Si `profile.role === 'admin'` o `profile.status === 'approved'` → permitir
- Sub-ruta `/platform/admin/*` requiere `profile.role === 'admin'`; cualquier otro usuario recibe `notFound()` (404 silencioso, no se filtra que la ruta existe).

**Página `/login` se actualiza con link a `/signup`** (1 línea).

**Asociar paciente al subir DICOM:**
- Modificar `apps/web/src/app/platform/upload/page.tsx` para incluir un `<select>` opcional con pacientes del médico (`SELECT id, external_id, display_alias FROM patients WHERE user_id = auth.uid()`).
- El backend (`apps/api/app/api/v1/routers/dicom.py`) recibe `patient_id` como query param opcional y lo guarda en `dicom_uploads.patient_id`.
- Si el médico no selecciona paciente, sigue funcionando con `case_ref` libre (compatibilidad).

**Convenciones existentes a respetar:**

| Componente / utility | Path | Para qué se reusa |
|---------------------|------|-------------------|
| `Input`, `Button`, `Card`, `PageContainer`, `SectionHeader` | `apps/web/src/components/ui/` | Form de signup + form de paciente |
| `AlertBanner` (variant warning/critical/info) | `apps/web/src/components/ui/AlertBanner.tsx` | Mensajes de error y éxito en signup |
| `createClient` server | `apps/web/src/utils/supabase/server.ts` | Toda Server Action y route handler |
| Patrón `analyzeAction` (Server Action) | `apps/web/src/app/platform/analyze/actions.ts` | Modelo para `signupAction`, `createPatientAction` |
| `PhantomLink` actual de "Pacientes Registrados" | (verificar en sidebar/landing) | Reemplazar por link real a `/platform/pacientes` |

---

## Mapa de archivos

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/<timestamp>_profiles_patients.sql` | **Nuevo** — DDL de las 2 tablas + RLS + columna `patient_id` en `dicom_uploads` |
| `apps/web/src/app/signup/page.tsx` | **Nuevo** |
| `apps/web/src/app/signup/actions.ts` | **Nuevo** |
| `apps/web/src/app/signup/SignupForm.tsx` | **Nuevo** (Client Component con `useFormState`) |
| `apps/web/src/app/cuenta-pendiente/page.tsx` | **Nuevo** — landing post-login para `status != 'approved'` |
| `apps/web/src/app/login/page.tsx` | Modificar — agregar link "¿No tienes cuenta? Registrarse" |
| `apps/web/src/app/platform/layout.tsx` | Modificar — agregar gate de `status` y `role` |
| `apps/web/src/app/platform/pacientes/page.tsx` | **Nuevo** — lista |
| `apps/web/src/app/platform/pacientes/loading.tsx` | **Nuevo** |
| `apps/web/src/app/platform/pacientes/nuevo/page.tsx` | **Nuevo** — form crear |
| `apps/web/src/app/platform/pacientes/[id]/page.tsx` | **Nuevo** — detalle + estudios |
| `apps/web/src/app/platform/pacientes/actions.ts` | **Nuevo** — `createPatientAction`, `deletePatientAction` |
| `apps/web/src/app/platform/admin/medicos/page.tsx` | **Nuevo** — lista de médicos por estado (tabs pending / approved / rejected) |
| `apps/web/src/app/platform/admin/medicos/[id]/page.tsx` | **Nuevo** — detalle médico + botones aprobar/rechazar |
| `apps/web/src/app/platform/admin/medicos/actions.ts` | **Nuevo** — `approveMedicoAction`, `rejectMedicoAction` |
| `apps/web/src/app/platform/upload/page.tsx` | Modificar — agregar `<select>` de paciente |
| `apps/api/app/api/v1/routers/dicom.py` | Modificar — aceptar `patient_id` opcional, guardarlo |
| `apps/web/package.json` | Agregar `vitest`, `@testing-library/react`, `@vitejs/plugin-react`, `jsdom`, scripts `test` y `test:watch` |
| `apps/web/vitest.config.ts` | **Nuevo** |
| `apps/web/src/app/platform/analyze/actions.test.ts` | **Nuevo** — tests de validación |
| `apps/web/src/app/platform/reportes/download/route.test.ts` | **Nuevo** — tests de 401 + variantes de `tipo` |
| `apps/web/src/app/platform/pacientes/actions.test.ts` | **Nuevo** — tests de `createPatientAction` validation |
| `docs/postman/oncoscan.postman_collection.json` | **Nuevo** — colección con 6 endpoints clave |
| `docs/postman/README.md` | **Nuevo** — instrucciones de uso |
| Sidebar / landing — `PhantomLink` "Pacientes Registrados" | Modificar — apuntar a `/platform/pacientes` real |

---

## Tasks

### Task 1: Migrations Supabase (profiles + patients + patient_id en dicom_uploads)

**Bloqueante para Tasks 3, 4, 5.**

1. Crear `supabase/migrations/<timestamp>_profiles_patients.sql` con:
   - DDL de `profiles` y `patients` (schema arriba)
   - RLS policies: `profiles_select_own`, `profiles_insert_own`, `profiles_update_own`; `patients_select_own`, `patients_insert_own`, `patients_update_own`, `patients_delete_own`
   - `ALTER TABLE dicom_uploads ADD COLUMN patient_id uuid REFERENCES patients(id) ON DELETE SET NULL`
2. Aplicar migration en dashboard Supabase (o `supabase db push` si está configurado).
3. Verificar manualmente en dashboard: tablas existen, RLS habilitada, columna nueva en `dicom_uploads`.
4. Commit: `feat: schema profiles y patients con RLS + patient_id en dicom_uploads`.

### Task 2: Setup Vitest + tests unitarios

**Independiente — se puede paralelizar con Task 1.**

1. `cd apps/web && npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom`
2. Crear `vitest.config.ts` con `environment: 'jsdom'`, resolve aliases sincronizados con `tsconfig.json` (`@/` → `src/`).
3. Agregar a `package.json`:
   ```json
   "scripts": {
     "test": "vitest run",
     "test:watch": "vitest"
   }
   ```
4. Tests para `analyzeAction` (lógica pura sin mocks de Supabase):
   - `actions.test.ts` con ~6 casos: archivo faltante, archivo > 10MB, feature fuera de rango (≤2 casos), feature NaN, features válidas pasan validación.
5. Tests para `download/route.ts`:
   - Mock `createClient` con `vi.mock('@/utils/supabase/server')`
   - Tests: 401 sin sesión, 200 con `tipo=alto_riesgo` aplica filtro, 200 default sin filtro extra.
6. Tests para `createPatientAction` (creado en Task 4 — este sub-paso se ejecuta después).
7. Verificar: `npm run test` pasa con 100% de tests OK.
8. Commit: `feat: vitest + tests unitarios para analyzeAction y download/route`.

### Task 3: Signup de médicos (con flujo pending)

**Depende de Task 1.**

1. Crear `apps/web/src/app/signup/page.tsx` (Server Component) que renderiza `SignupForm`.
2. Crear `apps/web/src/app/signup/SignupForm.tsx` (Client Component con `useFormState`):
   - Inputs: email, password (min 8), confirm_password, full_name, cedula_profesional, especialidad, institucion
   - Validación cliente básica + mostrar errores del Server Action via `AlertBanner` variant="critical"
   - Mostrar nota explícita ANTES del submit: "Tu cuenta será revisada por un administrador antes de ser activada. Recibirás acceso una vez aprobada."
3. Crear `apps/web/src/app/signup/actions.ts` con `signupAction`:
   - Validar inputs (lengths, password match, formato email)
   - `supabase.auth.signUp({ email, password })` → obtiene `user.id`
   - `supabase.from('profiles').insert({ id: user.id, full_name, cedula_profesional, especialidad, institucion, role: 'medico', status: 'pending' })`
   - On success: `redirect('/signup?ok=true')` (queda en la misma página con mensaje de éxito)
4. En `apps/web/src/app/signup/page.tsx`, si llega `?ok=true` mostrar `AlertBanner variant="info"` "Registro recibido. Un administrador revisará tu información y aprobará tu cuenta. Te llegará confirmación al email." y ocultar el form.
5. Modificar `apps/web/src/app/login/page.tsx`: agregar link `<Link href="/signup">¿No tienes cuenta? Regístrate</Link>` debajo del form.
6. Crear `apps/web/src/app/cuenta-pendiente/page.tsx`:
   - Server Component que lee `profiles.status` del usuario autenticado
   - Si `status === 'pending'`: mensaje "Tu cuenta está pendiente de aprobación. Te notificaremos cuando esté activa."
   - Si `status === 'rejected'`: mensaje con `rejection_reason` y CTA "Contactar soporte"
   - Si `status === 'approved'`: redirect a `/platform`
   - Botón "Cerrar sesión" siempre visible
7. Modificar `apps/web/src/app/platform/layout.tsx`:
   - Después del check de sesión existente, hacer `SELECT role, status FROM profiles WHERE id = auth.uid()`
   - Si `status !== 'approved'` Y `role !== 'admin'` → `redirect('/cuenta-pendiente')`
8. Verificar:
   - Registro crea fila en `profiles` con `status='pending'`
   - El médico recién registrado intenta entrar a `/platform` → es redirigido a `/cuenta-pendiente`
   - Login funciona en el sentido técnico, pero la plataforma no es accesible hasta aprobación.
9. Commit: `feat: signup de medicos con flujo pending + cuenta-pendiente gate`.

### Task 3.5: Panel admin para aprobar médicos

**Depende de Task 3.**

1. Crear `apps/web/src/app/platform/admin/medicos/page.tsx`:
   - Verificar en el server component que `profile.role === 'admin'`, sino `notFound()`
   - Tres tabs (o secciones): Pendientes, Aprobados, Rechazados
   - Tabla con: email, full_name, cedula_profesional, especialidad, institucion, created_at, acción "Ver"
2. Crear `apps/web/src/app/platform/admin/medicos/[id]/page.tsx`:
   - Detalle completo del perfil del médico
   - Si `status === 'pending'`: botones "Aprobar" y "Rechazar" (con form para `rejection_reason`)
   - Si `status === 'approved'`: botón "Revocar aprobación" (volver a pending)
   - Si `status === 'rejected'`: muestra reason + botón "Reconsiderar" (vuelve a pending)
3. Crear `apps/web/src/app/platform/admin/medicos/actions.ts`:
   - `approveMedicoAction(profileId)`: `UPDATE profiles SET status='approved', approved_at=now(), approved_by=auth.uid(), rejection_reason=NULL WHERE id = $1`
   - `rejectMedicoAction(profileId, reason)`: `UPDATE profiles SET status='rejected', rejection_reason=$2 WHERE id = $1`
   - Verificar en cada action que el caller tiene `role='admin'` (defense-in-depth además de RLS)
4. Agregar entrada al sidebar `Admin > Médicos` visible solo si `profile.role === 'admin'`.
5. Verificar end-to-end:
   - Médico se registra → admin entra al panel → ve al médico en "Pendientes" → aprueba → médico cierra sesión, vuelve a entrar → ahora SÍ accede a `/platform`.
6. Commit: `feat: panel admin para aprobar registros de medicos`.

### Task 4: CRUD básico de pacientes

**Depende de Task 1.**

1. Crear `apps/web/src/app/platform/pacientes/page.tsx`:
   - Server Component que lista pacientes del médico (`SELECT * FROM patients WHERE user_id = auth.uid() ORDER BY created_at DESC`)
   - Tabla con columnas: external_id, display_alias, # estudios asociados (subquery), created_at, acción "Ver"
   - Empty state con CTA "Registrar primer paciente" → `/platform/pacientes/nuevo`
2. Crear `apps/web/src/app/platform/pacientes/loading.tsx` (skeleton).
3. Crear `apps/web/src/app/platform/pacientes/nuevo/page.tsx`:
   - Form con `external_id` (required), `display_alias` (optional), `notes` (optional textarea)
   - Llama `createPatientAction`
4. Crear `apps/web/src/app/platform/pacientes/[id]/page.tsx`:
   - Detalle del paciente
   - Lista de DICOM uploads asociados (`SELECT ... FROM dicom_uploads WHERE patient_id = $1 AND user_id = auth.uid()`)
   - Botón "Eliminar paciente" con confirmación (usa `deletePatientAction`)
5. Crear `apps/web/src/app/platform/pacientes/actions.ts`:
   - `createPatientAction`: valida external_id no vacío, max length, inserta. Manejar error de unique constraint.
   - `deletePatientAction`: borra paciente (uploads quedan con `patient_id = NULL` por `ON DELETE SET NULL`).
6. Reemplazar `PhantomLink` "Pacientes Registrados" del sidebar/landing por link real a `/platform/pacientes`.
7. Verificar: crear, listar, ver detalle, eliminar paciente funciona.
8. Commit: `feat: CRUD basico de pacientes en platform`.

### Task 5: Asociar paciente al subir DICOM

**Depende de Task 4.**

1. Modificar `apps/web/src/app/platform/upload/page.tsx`:
   - Agregar `<select>` opcional "Paciente" arriba del campo `case_ref` actual
   - Opciones: pacientes del médico (`SELECT id, external_id, display_alias FROM patients WHERE user_id = auth.uid()`)
   - "Sin paciente asociado" como opción default
2. Modificar el handler de upload (verificar si es server action o llamada a FastAPI):
   - Si va a FastAPI: agregar `patient_id` como `Form()` param opcional en `apps/api/app/api/v1/routers/dicom.py`
   - Guardar en el INSERT a `dicom_uploads`
3. Modificar `apps/web/src/app/platform/uploads/[id]/page.tsx` y `apps/web/src/app/platform/uploads/page.tsx` para mostrar el paciente asociado si existe (display_alias o external_id).
4. Verificar: upload con paciente + upload sin paciente, ambos funcionan; detalle muestra el paciente.
5. Commit: `feat: asociar paciente opcional a upload DICOM`.

### Task 6: Colección Postman

**Independiente — se puede paralelizar.**

1. Crear `docs/postman/oncoscan.postman_collection.json` con 6 requests:
   - GET `/api/v1/health` (sin auth)
   - POST `/api/v1/dicom/upload` (auth + file form-data + opcional patient_id)
   - POST `/api/v1/analysis/predict` (auth + form-data)
   - GET `/api/v1/analysis/{upload_id}` (auth)
   - GET (Next.js) `/platform/reportes/download?tipo=alto_riesgo` (cookie auth — opcional)
   - POST `/api/v1/dicom/analyze/{dicom_id}` (auth)
2. Configurar variables de colección: `{{base_url}}` (default `http://localhost:8000`), `{{access_token}}`.
3. Crear `docs/postman/README.md` con:
   - Cómo importar la colección
   - Cómo obtener el `access_token` desde DevTools del browser (cookie `sb-*-auth-token` → field `access_token`)
   - Test plan manual: pasos para validar cada endpoint (status esperado, body)
4. Commit: `docs: coleccion postman + test plan manual`.

### Task 7: Documentación de cierre, primer admin y deuda técnica

1. **Crear el primer admin manualmente:**
   - Registrar un usuario "admin" via `/signup` (puede ser un email del equipo).
   - En el dashboard Supabase, ejecutar:
     ```sql
     UPDATE profiles
        SET role = 'admin', status = 'approved', approved_at = now()
      WHERE id = (SELECT id FROM auth.users WHERE email = '<email del admin>');
     ```
   - Documentar este paso en `docs/admin-bootstrap.md` (cómo crear admins futuros).
2. Verificar el item D-6 (`bg-slate-950` token) — confirmar decisión final (probablemente "dejar como está").
3. Crear `docs/superpowers/specs/2026-05-21-sub-proyecto-e-design.md` (resumen ejecutivo del scope ejecutado).
4. Crear plan de sub-proyecto F (futuro): validación automatizada de cédula profesional contra registro oficial, notificación por email al médico al aprobar/rechazar, audit log de acciones admin, pytest en FastAPI.
5. Commit: `docs: cierre sub-proyecto E + bootstrap admin + roadmap F`.

---

## Verification (end-to-end)

**Flujo completo de smoke test después de todas las tasks:**

1. **Bootstrap admin:** crear el primer admin via `/signup` + SQL manual (paso documentado en Task 7).
2. **Signup médico:** ir a `/signup` en otro navegador / incógnito, registrar médico con datos reales. Verificar en dashboard Supabase que aparece en `auth.users` Y en `profiles` con `status='pending'`.
3. **Gate bloqueado:** el médico recién registrado intenta entrar a `/platform` → debe ser redirigido a `/cuenta-pendiente`. Confirmar que NO puede ver `/platform/pacientes`, `/platform/upload`, etc.
4. **Aprobación admin:** el admin entra a `/platform/admin/medicos`, ve al médico en "Pendientes", revisa los datos profesionales y aprueba.
5. **Acceso post-aprobación:** el médico cierra sesión, vuelve a entrar → ahora SÍ accede a `/platform`.
6. **Crear paciente:** ir a `/platform/pacientes/nuevo`, crear paciente con external_id "TEST-001". Confirmar redirección a lista y aparece.
7. **Subir DICOM con paciente:** ir a `/platform/upload`, seleccionar el paciente recién creado en el `<select>`, subir un DICOM válido. Confirmar que el análisis se ejecuta y queda asociado.
8. **Ver detalle del paciente:** ir a `/platform/pacientes/<id>`, confirmar que el estudio recién subido aparece en la lista de estudios asociados.
9. **Rechazo flow:** registrar un segundo médico, admin lo rechaza con razón "Cédula no válida". El médico al entrar ve la página de cuenta rechazada con la razón.
10. **CSV export:** `/platform/reportes`, descargar reporte completo, verificar que la fila incluye los campos del paciente.
11. **RLS check:** confirmar que el segundo médico aprobado NO ve pacientes ni uploads del primero (en Supabase SQL editor: `SELECT * FROM patients WHERE user_id != auth.uid()` debe retornar vacío para usuarios no-admin).
12. **Admin-only check:** el médico aprobado intenta entrar a `/platform/admin/medicos` → debe recibir 404 (no se filtra que la ruta existe).
13. **Tests:** `cd apps/web && npm test` → todos los tests pasan.
14. **Postman:** importar colección, ejecutar los 6 requests con un token válido, verificar status codes esperados.

**Checks de seguridad clínica antes de cerrar el sub-proyecto:**

- [ ] Ningún `console.log` o `print` de FastAPI loguea `external_id`, `display_alias` o `email` del médico
- [ ] La RLS de `patients` se prueba creando 2 usuarios en distintos navegadores y confirmando aislamiento
- [ ] Los tests unitarios NO usan datos PHI reales (usar fixtures sintéticos como "TEST-XYZ")
- [ ] El form de signup NO envía la cédula profesional al backend de FastAPI (queda solo en Supabase profiles)

---

## Riesgos y decisiones abiertas

| Riesgo | Mitigación propuesta |
|--------|---------------------|
| Sin validación automática de cédula profesional | Admin valida manualmente. Documentado como item E-1 para sub-proyecto F. |
| Si no hay ningún admin creado, nadie puede aprobar médicos | Task 7 documenta el bootstrap manual via SQL en el dashboard Supabase. Recomendar crearlo ANTES de exponer la URL de signup. |
| El médico no recibe email cuando se aprueba/rechaza | Aceptado: en sub-proyecto E el médico debe volver a entrar para ver el estado. Notificación por email queda como item E-2 para F. |
| Migración de uploads existentes sin `patient_id` | Aceptado: la columna es nullable, datos viejos siguen funcionando con `case_ref`. |
| Email confirmation de Supabase puede no estar configurado | Verificar con el dashboard antes de implementar signup. Si está OFF, agregar nota en signup page. |
| Un admin podría aprobar a otro admin por error | El form de aprobación no expone el campo `role`. Solo cambia `status`. Cambiar a admin requiere SQL manual (documentado). |

**Deuda técnica documentada (queda para sub-proyecto F):**
- **Item E-1:** Validación regulatoria automática de cédula profesional contra registro oficial.
- **Item E-2:** Notificación por email al médico cuando admin aprueba/rechaza su cuenta.
- **Item E-3:** Audit log de acciones admin (`approve`, `reject`, `revoke`) con timestamp y admin que lo hizo (parcialmente cubierto por `approved_by`).

---

## Issues cubiertos

El sub-proyecto E se ejecutó sin issues Jira nominales (hallazgo H-018 del audit 2026-05-22). Entregables trazables por commit:

- `bb83b40` — asociación opcional paciente ↔ upload DICOM.
- `dac55d0` — signup vía trigger `on_auth_user_created`.
- `4944908` — fix recursión RLS en `profiles` + race condition de login.
- `5d014e9` — cierre + bootstrap admin + roadmap F.
- `5691d20` — colección Postman + test plan manual.

Detalle completo en [`docs/psp/postmortems/sub-proyecto-e.md`](../../psp/postmortems/sub-proyecto-e.md).
