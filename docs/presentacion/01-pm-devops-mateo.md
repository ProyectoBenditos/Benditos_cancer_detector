# Rol: PM + DevOps — Mateo

> **Leer primero:** [00-comun.md](00-comun.md)

---

## Misión en la defensa

Presentar el **alcance del MVP**, la **trazabilidad del proceso** (Jira + PSP) y cómo el sistema llega a producción (deploy manual, variables de entorno, migraciones). Eres el primero en hablar: contextualizas el proyecto para que los demás puedan profundizar en sus capas.

---

## Archivos / rutas clave

| Archivo | Descripción |
|---------|-------------|
| [docs/requisitos.md](../requisitos.md) | Requisitos funcionales y no funcionales del MVP |
| [docs/mvp_status.md](../mvp_status.md) | Estado actual de cada feature del MVP |
| [docs/roadmap.md](../roadmap.md) | Roadmap y milestones del proyecto |
| [docs/deploy.md](../deploy.md) | Guía completa de deploy Vercel + Render + Supabase |
| [docs/psp/milestones.md](../psp/milestones.md) | Milestones PSP con fechas y entregables |
| [docs/psp/traceability-matrix.md](../psp/traceability-matrix.md) | Matriz de trazabilidad Jira ↔ código |
| [docs/psp/defect-log.md](../psp/defect-log.md) | Registro de defectos y resolución |
| [docs/psp/acta-cierre-proyecto.md](../psp/acta-cierre-proyecto.md) | Acta de cierre y lecciones aprendidas |
| [docs/psp/audits/](../psp/audits/) | Auditorías PSP (kickoff, remediation, pre-defensa) |

---

## Qué exponer (guion de puntos)

1. **Contexto del problema**: detección tardía de cáncer pulmonar → OncoScan como herramienta de apoyo académico. Disclaimer: no es dispositivo médico.
2. **Alcance del MVP**: qué features están implementadas (upload DICOM, análisis IA, gestión de pacientes, dashboard, aprobación de médicos por admin).
3. **Metodología PSP**: proceso de desarrollo personal, métricas de calidad, auditorías, defect log.
4. **Trazabilidad Jira**: cómo cada KAN-xx se refleja en commits y en la traceability matrix.
5. **Deploy**:
   - **Vercel**: conectado al repo GitHub, root `apps/web`, variables de entorno configuradas en dashboard.
   - **Render** (Web Service Free): root `apps/api`, branch `main`, URL `https://benditos-cancer-detector.onrender.com`. Se migró desde Railway por costo; la instancia gratuita se duerme tras 15 min sin tráfico (cold start ~30–60 s).
   - **Supabase**: BD + Storage + Auth. Migraciones aplicadas manualmente via SQL Editor.
6. **Entornos**: local (localhost:3000 + localhost:8000) vs staging/producción.
7. **Sin CI/CD**: el pipeline es manual hoy; se puede mencionar como mejora futura.

---

## Variables de entorno por entorno

### Backend (`apps/api/`)

| Variable                  | Local              | Producción (Render)                |
|---------------------------|--------------------|------------------------------------|
| `SUPABASE_URL`            | URL del proyecto   | URL del proyecto                   |
| `SUPABASE_SERVICE_ROLE_KEY`| service_role key  | service_role key (secret)          |
| `SUPABASE_BUCKET_NAME`    | `dicom-uploads`    | `dicom-uploads`                    |
| `HF_API_BASE_URL`         | URL HF Space       | `https://luisdam-oncoscan-ai.hf.space` |
| `HF_PREDICT_TIMEOUT`      | `120`              | `120`                              |
| `HF_MODEL_VERSION`        | `luisdam-oncoscan-ai@v1` | `luisdam-oncoscan-ai@v1`   |

### Frontend (`apps/web/`)

| Variable                           | Local                    | Producción (Vercel)            |
|------------------------------------|--------------------------|--------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`         | URL del proyecto         | URL del proyecto               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key      | publishable key                |
| `NEXT_PUBLIC_API_URL`              | `http://localhost:8000`  | `https://benditos-cancer-detector.onrender.com` |
| `API_URL`                          | `http://localhost:8000`  | `https://benditos-cancer-detector.onrender.com` |

> Ver plantilla: [apps/web/.env.example](../../apps/web/.env.example)

---

## Migraciones de BD

Aplicadas manualmente en Supabase Dashboard → SQL Editor:

1. `supabase/migrations/20260521120000_profiles_patients.sql`
2. `supabase/migrations/20260530100000_predicciones_metadata.sql`
3. `supabase/migrations/20260530110000_profiles_consent.sql`

> La tabla `dicom_uploads` base no está en las migraciones (hueco conocido). Si se recrea la BD desde cero, hay que crearla manualmente.

---

## Preguntas probables + respuesta

**¿Por qué no hay CI/CD?**
> El MVP académico prioriza funcionalidad sobre automatización de pipeline. Deploy manual da visibilidad total a cada cambio en producción. Es una deuda técnica conocida.

**¿Cómo se controla la calidad sin CI?**
> Mediante PSP: auditorías de código, defect log, smoke tests documentados en `docs/smoke-test.md` y `docs/qa/`. Los tests se corren localmente antes de hacer deploy.

**¿Qué pasa si Render o Vercel cae?**
> Son servicios independientes. Vercel sirve el frontend estático con CDN. Render corre el backend. Si Render cae el frontend muestra error de conexión pero no se pierde data (BD en Supabase, independiente).

**¿Por qué Render y no Railway?**
> Railway dejó de tener capa gratuita útil y el backend es un proxy liviano. Render Free cubre el uso académico; el costo es el cold start tras 15 min de inactividad.

**¿Cómo se maneja la seguridad de secretos?**
> Las claves están en variables de entorno de cada plataforma (Render environment, Vercel env vars), nunca en el código ni en git.

---

## Comandos que debes saber demostrar

```bash
# Ver estado del repo
git log --oneline -10

# Despertar/verificar el backend en Render
curl https://benditos-cancer-detector.onrender.com/api/v1/health

# Correr el proyecto localmente
cd apps/api && uvicorn app.main:app --reload --port 8000
cd apps/web && npm run dev

# Ver los tests antes de deploy
cd apps/api && pytest tests/ -v
cd apps/web && npm run test
```
