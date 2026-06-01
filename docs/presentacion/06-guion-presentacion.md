# Guion de Presentación — OncoScan

> **Tiempo total estimado:** 25–35 minutos de presentación + 10 minutos de Q&A.
> Cada persona expone su parte y queda disponible para preguntas al final.

---

## Orden de exposición

| # | Quién | Tema | Tiempo est. |
|---|-------|------|-------------|
| 1 | **Mateo** (PM + DevOps) | Introducción, alcance y arquitectura general | 5–7 min |
| 2 | **Base de Datos** | Esquema BD, RLS, triggers | 5–6 min |
| 3 | **Backend** | API FastAPI, autenticación, flujo DICOM | 5–6 min |
| 4 | **IA + QA** | Modelo HF Space, features clínicas, tests | 5–6 min |
| 5 | **Frontend** | UI/UX, rutas, componentes, tokens de diseño | 4–5 min |
| 6 | **Demo en vivo** | Flujo completo: subir DICOM → análisis → resultado | 3–5 min |

---

## 1. Introducción (Mateo — PM + DevOps)

**Objetivo:** contextualizar el problema y establecer el alcance del MVP.

Puntos a cubrir:
- "OncoScan es una plataforma académica de apoyo a la detección temprana de cáncer pulmonar. No es un dispositivo médico certificado."
- Problema: la detección tardía como principal factor de mortalidad en cáncer pulmonar.
- Solución académica: médicos suben estudios DICOM, el sistema los analiza con IA y entrega un score de riesgo.
- Alcance del MVP: features implementadas, metodología PSP, trazabilidad Jira.
- Stack en una tabla (ver `00-comun.md`).
- Deploy: Vercel + Railway + Supabase — manual, sin CI/CD (decisión consciente).

**Transición:** "Ahora [Nombre BD] nos explica cómo están organizados los datos."

---

## 2. Base de Datos

**Objetivo:** mostrar la estructura y las decisiones de seguridad a nivel de datos.

Puntos a cubrir:
- Las 3 tablas: `profiles` (médicos), `patients`, `dicom_uploads`.
- RLS: "cada médico solo ve sus propios datos, a nivel de BD."
- `is_admin()` SECURITY DEFINER: por qué se necesita para evitar recursión.
- Trigger `handle_new_user()`: cómo se autocrea el perfil al registrarse.
- Las 3 migraciones aplicadas manualmente.

**Transición:** "Esos datos los gestiona el backend, que [Nombre Back] explica."

---

## 3. Backend

**Objetivo:** mostrar la API FastAPI y el flujo técnico de un caso.

Puntos a cubrir:
- Estructura de routers: `health`, `dicom`, `analysis`.
- Autenticación JWT con `Depends(get_current_user)`.
- Flujo DICOM: upload → validación → Storage → HF Space → BD.
- PHI guard en `log_event()`: "nunca loguear datos sensibles del paciente."
- Diferencia sync vs async (`/dicom/analyze/{id}` vs `/analysis/predict`).

**Transición:** "El modelo que llama el backend lo explica [Nombre IA+QA]."

---

## 4. IA + QA

**Objetivo:** explicar el modelo y demostrar calidad del sistema.

Puntos a cubrir:
- HF Space `luisdam-oncoscan-ai`: entrenado con LIDC-IDRI.
- Las 8 features clínicas: qué son y cómo las ingresa el médico.
- Request/response al Space: imagen PNG + features → score + nivel_riesgo.
- Cold-start: "puede tardar hasta 60s si el Space está inactivo, timeout configurado en 120s."
- Tests: `pytest tests/ -v`, `npm run test`, smoke test 33/33.

**Transición:** "Todo esto se presenta al usuario en el frontend que muestra [Nombre Front]."

---

## 5. Frontend

**Objetivo:** mostrar la UI y las decisiones de diseño.

Puntos a cubrir:
- App Router de Next.js: mapa de rutas.
- Auth gate en `platform/layout.tsx`.
- Flujo de la página principal `/platform/upload`: los 3 pasos (upload → features → resultado).
- Componentes UI reutilizables y design tokens.
- `brand-danger` solo para alertas clínicas — mostrar el badge ALTO en rojo.
- Server Components por defecto.

**Transición:** "Pasemos a la demo en vivo."

---

## 6. Demo en vivo (todos)

**Quién conduce:** preferiblemente Mateo o Frontend (tiene el navegador abierto).

**Pasos:**
1. Mostrar la pantalla de login y registro (`/login`, `/signup`).
2. Mostrar la cuenta pendiente (`/cuenta-pendiente`) — explicar flujo de aprobación.
3. Loguearse como médico aprobado.
4. Ir a `/platform/upload`, subir un archivo DICOM de prueba.
5. Ingresar las 8 features clínicas con los sliders.
6. Hacer clic en "Analizar con IA" — esperar resultado.
7. Mostrar el badge de nivel de riesgo y la recomendación.
8. Navegar a historial `/platform/uploads`.

> **Archivos de prueba:** usar los fixtures en `docs/qa/fixtures/` (ver `docs/qa/fixtures/README.md`).

---

## Q&A anticipadas (bloque final)

Preguntas probables del jurado y quién las responde:

| Pregunta | Quién responde |
|----------|----------------|
| "¿Qué tan preciso es el modelo?" | IA + QA |
| "¿Cómo garantizan la privacidad de los datos?" | Backend + BD |
| "¿Por qué no tienen CI/CD?" | PM/DevOps |
| "¿Qué pasaría en producción real (certificación médica)?" | PM/DevOps |
| "¿Por qué eligieron Supabase?" | BD + Backend |
| "¿Cómo funciona el RLS?" | BD |
| "¿Qué son las 8 features?" | IA + QA |
| "¿Cómo probaron el sistema?" | QA + Frontend |
| "¿Por qué Next.js en vez de React puro?" | Frontend |
| "¿Qué es FastAPI y por qué lo usaron?" | Backend |

---

## Notas logísticas

- Tener el proyecto **corriendo en local** (o apuntar a producción) antes de que empiece la defensa.
- Verificar que el HF Space responde haciendo una prueba de `/predict` desde el terminal 10 minutos antes.
- Tener una imagen DICOM de prueba lista en `docs/qa/fixtures/`.
- Si el Space está en cold-start durante la demo: "como explicamos, el modelo hace cold-start — el timeout es 120 segundos, un momento..." — continúa tranquilamente.
- Cada integrante tiene su doc de rol abierto por si necesita consultar detalles.
