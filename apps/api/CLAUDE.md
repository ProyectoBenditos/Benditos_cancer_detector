# apps/api — Contexto de Backend para Claude Code

## Stack

FastAPI 0.115 + Python 3.11 + httpx + supabase-py + python-multipart.

## Estructura

```
app/
  api/v1/routers/   # Rutas FastAPI (analyze.py, uploads.py, …)
  services/         # Lógica de negocio desacoplada de los routers
  core/             # Config, cliente Supabase, settings
main.py             # Entrypoint uvicorn
```

## Autenticación

Todas las rutas bajo `/api/v1/` requieren JWT de Supabase en header `Authorization: Bearer <token>`. No exponer rutas sin validar el token.

## PHI — reglas estrictas

Nunca loguear en `print()`, `logger.*`, ni en mensajes de error al cliente:

- `email` del usuario
- `file_path` o nombre de archivo DICOM
- `Case_Ref`
- `result_json` (predicción IA completa)

Ante error, loguear solo el tipo de error y el código HTTP. Sin stack traces al cliente.

## HF Space (modelo IA)

- URL base: `HF_API_BASE_URL` (variable de entorno).
- Timeout configurable: `HF_PREDICT_TIMEOUT` (default 120s — el Space hace cold-start).
- Si el Space falla o timeout: actualizar estado del caso a `ai_failed`, devolver error genérico al cliente. Nunca propagar el error interno del Space.
