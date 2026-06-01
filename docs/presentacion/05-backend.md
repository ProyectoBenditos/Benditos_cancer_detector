# Rol: Backend

> **Leer primero:** [00-comun.md](00-comun.md)

---

## Misión en la defensa

Explicar **la arquitectura FastAPI**, los endpoints y sus responsabilidades, cómo se autentica cada petición, el manejo de PHI en logs, y cómo el backend orquesta el flujo DICOM → Storage → HF Space → BD.

---

## Archivos / rutas clave

| Archivo | Descripción |
|---------|-------------|
| [apps/api/app/main.py](../../apps/api/app/main.py) | Entrypoint: crea la app FastAPI, registra routers |
| [apps/api/app/api/v1/routers/health.py](../../apps/api/app/api/v1/routers/health.py) | `GET /api/v1/health` — sin auth |
| [apps/api/app/api/v1/routers/dicom.py](../../apps/api/app/api/v1/routers/dicom.py) | Upload DICOM + análisis síncrono |
| [apps/api/app/api/v1/routers/analysis.py](../../apps/api/app/api/v1/routers/analysis.py) | Análisis asíncrono (POST 202 + GET polling) |
| [apps/api/app/core/security.py](../../apps/api/app/core/security.py) | Verificación de JWT Supabase |
| [apps/api/app/core/config.py](../../apps/api/app/core/config.py) | Carga env vars, lanza `RuntimeError` si faltan |
| [apps/api/app/core/logging.py](../../apps/api/app/core/logging.py) | `log_event()` con bloqueo de PHI, `hash_id()` |
| [apps/api/app/services/hf_client.py](../../apps/api/app/services/hf_client.py) | Cliente HTTP para el HF Space |
| [apps/api/app/db/supabase_client.py](../../apps/api/app/db/supabase_client.py) | Singleton del cliente Supabase Python |
| [apps/api/tests/](../../apps/api/tests/) | Suite pytest |
| [apps/api/CLAUDE.md](../../apps/api/CLAUDE.md) | Convenciones de backend del proyecto |

---

## Estructura del proyecto

```
apps/api/
├── app/
│   ├── main.py               # FastAPI app + routers
│   ├── api/v1/routers/
│   │   ├── health.py         # GET /health
│   │   ├── dicom.py          # POST /dicom/upload, POST /dicom/analyze/{id}
│   │   └── analysis.py       # POST /analysis/predict (202), GET /analysis/{id}
│   ├── core/
│   │   ├── config.py         # Env vars con validación
│   │   ├── security.py       # JWT verification
│   │   └── logging.py        # log_event() con PHI guard
│   ├── services/
│   │   └── hf_client.py      # predict() — proxy al HF Space
│   └── db/
│       └── supabase_client.py # Singleton supabase client
├── tests/                    # pytest
└── requirements.txt
```

---

## Endpoints y responsabilidades

### `GET /api/v1/health`
Sin auth. Devuelve `{"status":"ok"}`. Usado por Railway para health checks.

### `POST /api/v1/dicom/upload`
1. Valida extensión (`.dcm`, `.png`, `.jpg`, `.jpeg`)
2. Si es DICOM: verifica 6 tags requeridos + Modality=CT
3. Sube a Supabase Storage (`{user_id}/{uuid}_{filename}`)
4. Inserta fila en `dicom_uploads` con `upload_status="uploaded"`
5. Retorna `dicom_id` para el siguiente paso

### `POST /api/v1/dicom/analyze/{dicom_id}`
1. Descarga el archivo de Supabase Storage
2. Si es DICOM: convierte a PNG via pydicom + PIL (normalización de pixel array)
3. Llama `hf_client.predict()` de forma sincrónica (timeout 120s)
4. Persiste `ai_score`, `ai_risk_level`, `ai_recommendation` en `dicom_uploads`
5. Retorna el resultado completo

### `POST /api/v1/analysis/predict` (202 async)
1. Valida imagen PNG/JPG y features clínicas
2. Sube imagen a Storage
3. Inserta fila en `dicom_uploads` con `upload_status="processing"`
4. Lanza tarea en background (`BackgroundTasks`)
5. Retorna inmediatamente `{upload_id, status: "processing"}`

### `GET /api/v1/analysis/{upload_id}` (polling)
Devuelve la fila completa de `dicom_uploads`. El cliente hace polling hasta `upload_status != "processing"`.

---

## Autenticación JWT

Todas las rutas bajo `/api/v1/` (salvo `/health`) dependen de:

```python
current_user: dict = Depends(get_current_user)
```

`get_current_user` en `app/core/security.py` verifica el Bearer JWT contra la clave pública de Supabase. Si el token es inválido o está ausente devuelve `401`.

```
Authorization: Bearer <supabase_access_token>
```

---

## Manejo de PHI en logs

El módulo `app/core/logging.py` define:

- **`log_event(event_name, **kwargs)`**: rechaza en runtime cualquier kwarg en `PHI_KEYS` (email, file_path, case_ref, score, patient_id, result_json, etc.). Si se intenta loguear PHI lanza `ValueError`.
- **`hash_id(id)`**: retorna un hash opaco del ID para poder correlacionar logs sin exponer el valor real.

```python
# ✅ Correcto
log_event("dicom_upload_ok", upload_id_hash=hash_id(upload_id))

# ❌ Error en runtime
log_event("dicom_upload_ok", email=user_email)  # lanza ValueError
```

`print()` está prohibido en código productivo. Ningún stack trace llega al cliente.

---

## Config y arranque

`app/core/config.py` carga env vars al inicio. Si falta una variable crítica (como `SUPABASE_URL`), lanza `RuntimeError` antes de aceptar peticiones.

```bash
# Levantar en desarrollo
cd apps/api
uvicorn app.main:app --reload --port 8000

# Producción (Railway usa este comando internamente)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Preguntas probables + respuesta

**¿Por qué FastAPI y no Django o Flask?**
> FastAPI provee validación automática con Pydantic, tipado estático, generación de OpenAPI docs, y soporte nativo async — todo con menos boilerplate que Django. Es ideal para un proxy de IA con endpoints específicos.

**¿Cómo se garantiza que un médico no accede a los estudios de otro?**
> Doble capa: (1) el backend verifica el JWT y extrae `user_id`; (2) todas las queries a `dicom_uploads` incluyen `.eq("user_id", current_user["id"])`. Además RLS en Supabase es una tercera capa.

**¿Qué pasa si el HF Space está caído?**
> `hf_client.py` lanza `HFInferenceError`. El router captura el error, actualiza `upload_status = "ai_failed"` en BD y retorna `502` al cliente. El detalle del error se loguea internamente (sin PHI).

**¿Por qué convierten DICOM a PNG?**
> El modelo de HF fue entrenado con imágenes PNG normalizadas. El DICOM contiene datos crudos de píxeles con valores de Hounsfield que hay que normalizar (0–255) y convertir a RGB antes de enviarlo al modelo.

**¿Qué validan de los DICOM?**
> 6 tags requeridos: `Modality`, `PatientID`, `StudyInstanceUID`, `SOPInstanceUID`, `Rows`, `Columns`. Y que `Modality == "CT"` — el modelo solo soporta tomografías de tórax.

---

## Comandos que debes saber demostrar

```bash
# Levantar el backend
cd apps/api
uvicorn app.main:app --reload --port 8000

# Verificar health
curl http://localhost:8000/api/v1/health

# Correr tests
pytest tests/ -v

# Ver documentación auto-generada (Swagger)
# Abrir: http://localhost:8000/docs

# Ver variables de configuración cargadas (sin secretos)
python -c "from app.core.config import *; print('Config OK')"
```

---

_Ver también: [api-reference.md](api-reference.md) — catálogo completo de endpoints con ejemplos de request/response._
_Ver también: [apps/api/CLAUDE.md](../../apps/api/CLAUDE.md) — convenciones internas del backend._
