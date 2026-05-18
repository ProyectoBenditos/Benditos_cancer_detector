# OncoScan — Contexto para Claude Code

## Qué es OncoScan

Plataforma académica de apoyo a la detección temprana de cáncer pulmonar. Procesa imágenes DICOM, ejecuta un modelo de IA en Hugging Face y muestra alertas clínicas estructuradas. **No es un dispositivo médico certificado.**

## Stack

| Capa | Tecnología |
|------|-----------|
| Web | Next.js 16 + React 19 + Tailwind 4 |
| API | FastAPI + Python 3.11 + httpx |
| Base de datos | Supabase (PostgreSQL + Storage) |
| IA | HF Space `luisdam-oncoscan-ai` — endpoint `/predict` |
| Auth | Supabase Auth + middleware Next.js |

## Mapa del repo

| Directorio | Contenido |
|-----------|-----------|
| `apps/web/` | Next.js — UI, rutas, server actions |
| `apps/api/` | FastAPI — proxy de IA, validación DICOM, rutas autenticadas |
| `docs/` | Specs, ADRs, resúmenes técnicos |
| `.claude/commands/` | Slash commands del proyecto |

## Datos sensibles (PHI)

Campos que contienen Información de Salud Protegida:

- `email` del usuario autenticado
- Rutas y nombres de archivos DICOM
- `Case_Ref` (identificador de caso)
- `result_json` (predicción IA)
- URLs de Supabase Storage

**Reglas:**
- Nunca loguear PHI en `console.log`, `console.error` ni logs de FastAPI.
- Nunca exponer URLs de Storage al cliente sin signed URL generada server-side.
- No pedir PHI en prompts a Claude salvo que sea estrictamente necesario.

## Slash commands del proyecto

| Comando | Cuándo usarlo |
|---------|--------------|
| `/oncoscan-component <Nombre>` | Crear un nuevo componente UI reutilizable |
| `/oncoscan-page <ruta>` | Crear o refactorizar una página de la plataforma |
| `/oncoscan-a11y [archivo]` | Auditar accesibilidad WCAG AA de un archivo o ruta |
| `/oncoscan-clinical-review [archivo]` | Revisar seguridad clínica, PHI y jerarquía de alertas |

## Convenciones de commit

Mensajes en español. Formato: `tipo: descripción breve`.

Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`.

## Sub-CLAUDE.md disponibles

- [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) — patrones de UI, tokens, componentes existentes
- [`apps/api/CLAUDE.md`](apps/api/CLAUDE.md) — estructura FastAPI, reglas de PHI en backend
