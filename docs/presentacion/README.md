# docs/presentacion/ — Índice

Documentación de apoyo para la defensa del proyecto OncoScan.

---

## Cómo usarla

1. **Todos** leen primero [00-comun.md](00-comun.md).
2. **Cada integrante** lee su doc de rol (01–05).
3. El equipo completo repasa [06-guion-presentacion.md](06-guion-presentacion.md) para coordinar tiempos y transiciones.
4. Los anexos [esquema-bd.md](esquema-bd.md) y [api-reference.md](api-reference.md) son referencia técnica que los docs de rol enlazan.

---

## Documentos

| Archivo | Audiencia | Descripción |
|---------|-----------|-------------|
| [00-comun.md](00-comun.md) | **Todos** | Stack, monorepo, arquitectura (Mermaid), cómo correr localmente, flujo end-to-end |
| [01-pm-devops-mateo.md](01-pm-devops-mateo.md) | PM + DevOps | Alcance MVP, PSP/Jira, deploy Vercel+Railway, variables de entorno |
| [02-ia-qa.md](02-ia-qa.md) | IA + QA | HF Space, features clínicas, flujo sync/async, tests, smoke test |
| [03-database.md](03-database.md) | Base de Datos | Tablas, RLS, `is_admin()`, trigger `handle_new_user()`, migraciones |
| [04-frontend.md](04-frontend.md) | Frontend | App Router, rutas, componentes UI, design tokens, auth gate |
| [05-backend.md](05-backend.md) | Backend | FastAPI, routers, JWT, PHI guard, DICOM→PNG, hf_client |
| [06-guion-presentacion.md](06-guion-presentacion.md) | Todos | Orden de exposición, tiempos, demo en vivo, Q&A anticipadas |

## Anexos técnicos

| Archivo | Descripción |
|---------|-------------|
| [esquema-bd.md](esquema-bd.md) | Esquema consolidado: tablas, columnas, RLS, triggers, funciones |
| [api-reference.md](api-reference.md) | Catálogo de todos los endpoints (método, auth, body, respuesta, errores) |

## Archivo de configuración

| Archivo | Descripción |
|---------|-------------|
| [apps/web/.env.example](../../apps/web/.env.example) | Plantilla de variables de entorno del frontend (sin secretos) |

---

_Para preparar el entorno local: ver [docs/setup-nuevo-pc.md](../setup-nuevo-pc.md)._
_Para el deploy: ver [docs/deploy.md](../deploy.md)._
