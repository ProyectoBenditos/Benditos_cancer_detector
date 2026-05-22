# Handoff — Sub-proyecto E (estado al 2026-05-22)

## Qué se implementó

Sub-proyecto E cerrado en código. 8 commits en branch `merge/fronted-nicolas-into-main`.

### Features entregadas

| Feature | Archivos clave |
|---------|---------------|
| Registro de médicos (`/signup`) con flujo `pending` | `apps/web/src/app/signup/` |
| Gate de acceso: médico no aprobado → `/cuenta-pendiente` | `apps/web/src/app/platform/layout.tsx` |
| Panel admin para aprobar/rechazar médicos | `apps/web/src/app/platform/admin/medicos/` |
| CRUD de pacientes (`/platform/pacientes`) | `apps/web/src/app/platform/pacientes/` |
| Asociar paciente al subir DICOM (select en upload form) | `apps/web/src/app/platform/upload/page.tsx` |
| Sidebar actualizado: link real "Pacientes Registrados" + sección Admin | `apps/web/src/components/layout/Sidebar.tsx` |
| Vitest + 14 tests unitarios (analyzeAction, download/route, createPatientAction) | `apps/web/src/*.test.ts` |
| Colección Postman (6 endpoints) | `docs/postman/` |
| Migration SQL con trigger automático | `supabase/migrations/20260521120000_profiles_patients.sql` |

### Stack de tablas nuevas

```
profiles  (id, full_name, cedula_profesional, especialidad, institucion, role, status, ...)
patients  (id, user_id, external_id, display_alias, notes, ...)
dicom_uploads += columna patient_id (FK → patients, nullable)
```

---

## Estado actual — qué falta hacer manualmente

### 1. Aplicar la migration en Supabase (BLOQUEANTE)

**Dashboard Supabase → SQL Editor → ejecutar el contenido completo de:**
```
supabase/migrations/20260521120000_profiles_patients.sql
```

Esto crea:
- Tabla `profiles` + 5 RLS policies
- Tabla `patients` + 4 RLS policies
- Columna `patient_id` en `dicom_uploads`
- **Trigger `on_auth_user_created`** — crea el perfil automáticamente al registrarse, bypaseando RLS

### 2. Crear el perfil del admin existente (después de la migration)

El usuario admin del proyecto ya existe en `auth.users` pero no tiene fila en `profiles`. Ejecutar:

```sql
INSERT INTO public.profiles (
  id, full_name, cedula_profesional, especialidad, institucion, role, status, approved_at
)
SELECT
  id,
  'Admin OncoScan',
  'ADMIN',
  'Administración',
  'Proyecto Benditos',
  'admin',
  'approved',
  now()
FROM auth.users
WHERE email = 'EMAIL-DEL-ADMIN';
```

### 3. Resolver usuario huérfano Mateo Salas

`mateosalas28@hotmail.com` quedó en `auth.users` sin perfil (el signup falló antes del fix).

**Opción A** — Borrar en Authentication → Users y volver a registrarse desde `/signup`.

**Opción B** — Insertar el perfil manualmente:
```sql
INSERT INTO public.profiles (id, full_name, cedula_profesional, especialidad, institucion, role, status)
SELECT id, 'Mateo Salas', '1004235543', 'Neumologia', 'Proyecto Benditos', 'medico', 'pending'
FROM auth.users WHERE email = 'mateosalas28@hotmail.com';
```

---

## Por qué falló el primer intento de registro

El `signupAction` original intentaba insertar directamente en `profiles` con el client de Supabase server. El problema: justo después de `auth.signUp()`, ese client no tiene sesión del usuario nuevo, así que `auth.uid()` es `null` y el RLS bloqueaba el INSERT.

**Fix aplicado:** el action ahora pasa los datos del médico como `options.data` en `signUp()`. El trigger de PostgreSQL los lee de `raw_user_meta_data` y hace el INSERT como `SECURITY DEFINER` (bypasea RLS). Sin service role key requerida.

---

## Flujo de signup actual (después del fix)

```
/signup → signupAction → supabase.auth.signUp({ options.data: { full_name, cedula, ... } })
                                    ↓
                         trigger on_auth_user_created
                                    ↓
                    INSERT INTO profiles (status='pending')
                                    ↓
                         redirect /signup?ok=true
```

El médico recién registrado intenta entrar a `/platform` → redirige a `/cuenta-pendiente`.
El admin entra a `/platform/admin/medicos` → aprueba → médico ya puede entrar.

---

## Tests

```bash
cd apps/web && npm test
# → 14 tests en 3 suites, todos pasan
```

## Branch y commits

Branch: `merge/fronted-nicolas-into-main`
Commits del sub-proyecto E (los últimos 10):
- `fix: rls recursiva en profiles + race condition de login con router.push`
- `fix: signup usa trigger on_auth_user_created en lugar de insert directo para evitar RLS`
- `docs: cierre sub-proyecto E + bootstrap admin + roadmap F`
- `docs: coleccion postman + test plan manual`
- `feat: asociar paciente opcional a upload DICOM`
- `feat: CRUD basico de pacientes en platform`
- `feat: panel admin para aprobar registros de medicos`
- `feat: signup de medicos con flujo pending + cuenta-pendiente gate`
- `feat: vitest + tests unitarios para analyzeAction, download/route y createPatientAction`
- `feat: schema profiles y patients con RLS + patient_id en dicom_uploads`

---

## Hotfix post-deploy (2026-05-22) — RLS recursiva y race condition de login

### Bug 1: `42P17 infinite recursion detected in policy for relation "profiles"`

Las policies `profiles_admin_select` y `profiles_admin_update` consultaban `public.profiles` dentro de su propia definición → PostgreSQL detecta recursión infinita y aborta cualquier SELECT, devolviendo `null` aunque el dato exista. Síntoma: el admin logueado veía "Perfil incompleto" porque el `from('profiles').select()` en `platform/layout.tsx` fallaba silenciosamente (el código no capturaba `error`, solo `data`).

**Fix:** Función `public.is_admin()` con `SECURITY DEFINER` que bypasea RLS al consultar `profiles`. Las policies ahora llaman `public.is_admin()` en vez de hacer `EXISTS (SELECT ... FROM profiles)`.

Si tu Supabase ya tiene la migration aplicada con la versión recursiva, corre **solo el fix**:

```sql
DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = '' STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY profiles_admin_select ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY profiles_admin_update ON public.profiles FOR UPDATE USING (public.is_admin());
```

### Bug 2: Race condition de cookies en login

`login/page.tsx` usaba `router.push("/platform")` seguido de `router.refresh()`. La navegación cliente-a-servidor a veces no incluía las cookies de sesión frescas que `signInWithPassword` acababa de setear → en el primer fetch del Server Component `auth.uid()` quedaba `null` → RLS devolvía 0 filas (este bug aparecía después de logout + re-login con sesión previa cacheada).

**Fix:** `window.location.href = "/platform"` fuerza un full page reload, garantizando que el browser envíe las cookies más recientes al servidor.

### Nota sobre proxy.ts vs middleware.ts

Next.js 16 deprecó `middleware.ts` a favor de `proxy.ts`. El proyecto ya usa `apps/web/src/proxy.ts` que invoca `updateSession()` correctamente. **No crear `middleware.ts`** — coexistir ambos archivos rompe el dev server.

---

## Issues cubiertos

Handoff operativo del sub-proyecto E. Sin issues Jira nominales; entregables referenciados por commit en [`2026-05-21-sub-proyecto-e.md`](2026-05-21-sub-proyecto-e.md) y post-mortem en [`docs/psp/postmortems/sub-proyecto-e.md`](../../psp/postmortems/sub-proyecto-e.md).

Desde el sub-proyecto F en adelante, cada handoff debe abrir issue(s) Jira antes del primer commit (regla de KAN-70 + DoR en [`docs/psp/definition-of-ready.md`](../../psp/definition-of-ready.md)).
