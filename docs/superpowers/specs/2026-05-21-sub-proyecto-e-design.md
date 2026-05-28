# Sub-proyecto E — Resumen ejecutivo de implementación

**Fecha de cierre:** 2026-05-21  
**Branch:** `merge/fronted-nicolas-into-main`

---

## Scope ejecutado

### Task 1 — Migrations Supabase
- Creado `supabase/migrations/20260521120000_profiles_patients.sql`.
- DDL completo: tablas `profiles` y `patients`, 5 + 4 policies RLS, columna `patient_id` en `dicom_uploads`.
- **Pendiente de aplicación manual en dashboard Supabase** (sin CLI configurado).

### Task 2 — Vitest + tests unitarios
- Instalados: `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- `vitest.config.ts` con environment jsdom y alias `@/` → `src/`.
- 14 tests en 3 suites: `analyzeAction` (7), `download/route` (3), `createPatientAction` (4). Todos pasan.

### Task 3 — Signup de médicos
- `/signup` con `SignupForm` (client component, `useActionState`), `signupAction` (server action), nota pre-submit de revisión pendiente.
- `/cuenta-pendiente` para médicos con `status !== 'approved'`.
- Gate en `platform/layout.tsx`: redirige a `/cuenta-pendiente` si no aprobado (y no es admin).
- Link "Regístrate" agregado a `/login`.

### Task 3.5 — Panel admin de médicos
- `/platform/admin/medicos` — lista por estado (pendientes/aprobados/rechazados).
- `/platform/admin/medicos/[id]` — detalle + botones aprobar/rechazar/revocar/reconsiderar.
- Server actions: `approveMedicoAction`, `rejectMedicoAction`, `revokeMedicoAction` — todas verifican `role='admin'` como defense-in-depth.
- Link en Sidebar visible solo para admins.

### Task 4 — CRUD de pacientes
- `/platform/pacientes` — lista con empty state + CTA.
- `/platform/pacientes/nuevo` — form con `createPatientAction`.
- `/platform/pacientes/[id]` — detalle + estudios asociados + botón eliminar.
- `loading.tsx` con skeleton.
- PhantomLink "Pacientes Registrados" reemplazado por link real.

### Task 5 — Asociar paciente al upload DICOM
- Upload form actualizado: `useEffect` carga pacientes del usuario, `<select>` opcional.
- `patient_id` se envía al FastAPI como Form param opcional.
- `dicom.py` acepta `patient_id: Optional[str] = Form(None)` y lo guarda en `dicom_uploads`.
- Detail de upload muestra el paciente asociado con link a su perfil.

### Task 6 — Colección Postman
- `docs/postman/oncoscan.postman_collection.json` con 6 requests.
- `docs/postman/README.md` con instrucciones de importación, obtención del token, y test plan manual.

### Task 7 — Documentación
- `docs/admin-bootstrap.md` — pasos para crear el primer admin y admins futuros.
- Este documento (resumen ejecutivo).

---

## Deuda técnica documentada

| Item | Descripción | Sub-proyecto |
|------|-------------|-------------|
| E-1 | Validación automática de cédula profesional contra registro oficial | F |
| E-2 | Notificación por email al médico cuando admin aprueba/rechaza | F |
| E-3 | Audit log completo de acciones admin (parcialmente cubierto por `approved_by`) | F |
| D-6 | Token `bg-slate-950` en landing — verificar si es válido en Tailwind 4 | F |

---

## Roadmap Sub-proyecto F (propuesta)

1. **Validación de cédula** — integrar con RETHUS o registro oficial colombiano para verificación automática.
2. **Notificación por email** — Supabase Edge Function o Resend para enviar email al médico cuando su cuenta es aprobada o rechazada.
3. **Audit log de acciones admin** — tabla `admin_audit_log` con `action`, `target_profile_id`, `admin_id`, `timestamp`, `reason`.
4. **Tests en FastAPI** — `pytest` con fixtures de Supabase test para endpoints `/dicom/upload`, `/dicom/analyze`, `/analysis/predict`.
5. **Accesibilidad del panel admin** — aplicar `/oncoscan-a11y` al panel de médicos y signup.
6. **Búsqueda de pacientes** — filtro en `/platform/pacientes` por `external_id` o `display_alias`.

---

## Issues cubiertos

El sub-proyecto E se ejecutó sin issues Jira nominales (hallazgo H-018 del audit 2026-05-22). Entregables trazables por commit y post-mortem retroactivo en [`docs/psp/postmortems/sub-proyecto-e.md`](../../psp/postmortems/sub-proyecto-e.md):

- `bb83b40` — asociación opcional paciente ↔ upload DICOM.
- `dac55d0` — signup vía trigger `on_auth_user_created` (fix bypass RLS).
- `4944908` — fix recursión RLS en `profiles` + race condition de login.
- `5d014e9` — cierre + bootstrap admin + roadmap F.
- `5691d20` — colección Postman + test plan manual.

Convención de issue-por-feature aplica desde el sub-proyecto F (KAN-70 + KAN-73 + DoR en [`docs/psp/definition-of-ready.md`](../../psp/definition-of-ready.md)).
