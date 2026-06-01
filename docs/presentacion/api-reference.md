# Catálogo de API — OncoScan Backend

> Base URL en producción: `https://ideal-strength.up.railway.app`
> Base URL en local: `http://localhost:8000`
> Todos los endpoints bajo `/api/v1/` requieren `Authorization: Bearer <JWT>` salvo los indicados.

---

## Health

### `GET /api/v1/health`

**Auth:** No requerida.

**Respuesta `200`:**
```json
{
  "status": "ok",
  "service": "oncascan-api",
  "version": "0.1.0"
}
```

---

## DICOM

### `POST /api/v1/dicom/upload`

Sube un archivo DICOM o imagen al sistema. Valida tags DICOM, rechaza modalidades distintas a CT, almacena en Supabase Storage y crea un registro en `dicom_uploads`.

**Auth:** Bearer JWT requerido.

**Body:** `multipart/form-data`

| Campo       | Tipo   | Requerido | Descripción                                           |
|-------------|--------|-----------|-------------------------------------------------------|
| `file`      | File   | Sí        | Archivo `.dcm`, `.png`, `.jpg` o `.jpeg`              |
| `case_ref`  | string | No        | Referencia interna del caso                           |
| `patient_id`| string | No        | UUID del paciente en tabla `patients`                 |

**Validaciones:**
- Extensión: `.dcm`, `.png`, `.jpg`, `.jpeg`
- Para DICOM: verifica tags `Modality`, `PatientID`, `StudyInstanceUID`, `SOPInstanceUID`, `Rows`, `Columns`; rechaza si Modality ≠ `CT`

**Respuesta `200`:**
```json
{
  "message": "Archivo cargado correctamente",
  "dicom_id": "uuid",
  "user_id": "uuid",
  "filename": "estudio.dcm",
  "storage_path": "<uuid>/estudio.dcm",
  "modality": "CT",
  "study_date": "20260101",
  "patient_id_dicom": "P001",
  "file_type": "dicom",
  "case_ref": "Caso-001"
}
```

**Errores:**
| Código | Causa                                    |
|--------|------------------------------------------|
| 400    | Extensión inválida, DICOM corrupto, tag faltante, Modality ≠ CT, archivo vacío |
| 401    | JWT inválido o ausente                   |
| 500    | Error de almacenamiento en Supabase      |

---

### `POST /api/v1/dicom/analyze/{dicom_id}`

Descarga el archivo ya subido, lo convierte a PNG (si es DICOM), llama al HF Space `/predict` con las features clínicas y persiste el resultado en `dicom_uploads`.

> **Flujo síncrono** — puede tardar hasta 120 s por cold-start del Space. El frontend usa timeout de 150 s.

**Auth:** Bearer JWT requerido.

**Path param:** `dicom_id` — UUID del registro en `dicom_uploads` (devuelto por `/upload`).

**Body:** `application/json` — objeto `ClinicalFeatures`:

| Campo          | Tipo  | Rango | Default |
|----------------|-------|-------|---------|
| `subtlety`     | float | 1–5   | 3.0     |
| `calcification`| float | 1–6   | 6.0     |
| `sphericity`   | float | 1–5   | 4.0     |
| `margin`       | float | 1–5   | 4.0     |
| `lobulation`   | float | 1–5   | 1.0     |
| `spiculation`  | float | 1–5   | 1.0     |
| `texture`      | float | 1–5   | 5.0     |
| `malignancy`   | float | 1–5   | 3.0     |

**Respuesta `200`:**
```json
{
  "dicom_id": "uuid",
  "score": 0.82,
  "nivel_riesgo": "ALTO",
  "recomendacion": "Derivar a oncología para biopsia",
  "modelo_version": "v1.2",
  "model_version": "luisdam-oncoscan-ai@unknown",
  "inference_time_ms": 4200,
  "predicted_at": "2026-06-01T10:00:00Z"
}
```

**Errores:**
| Código | Causa                                              |
|--------|----------------------------------------------------|
| 404    | `dicom_id` no encontrado o no pertenece al usuario |
| 502    | Error de red o timeout del HF Space                |
| 500    | Error interno                                      |

---

## Analysis (flujo asíncrono)

### `POST /api/v1/analysis/predict`

Registra un análisis, sube la imagen a Storage y lanza la inferencia en background. Devuelve `202` inmediatamente; el cliente hace polling con `GET /analysis/{id}`.

**Auth:** Bearer JWT requerido.

**Body:** `multipart/form-data`

| Campo          | Tipo  | Requerido | Rango |
|----------------|-------|-----------|-------|
| `imagen`       | File  | Sí        | `.png`, `.jpg`, `.jpeg`, máx. 10 MB |
| `subtlety`     | float | Sí        | 1–5   |
| `calcification`| float | Sí        | 1–6   |
| `sphericity`   | float | Sí        | 1–5   |
| `margin`       | float | Sí        | 1–5   |
| `lobulation`   | float | Sí        | 1–5   |
| `spiculation`  | float | Sí        | 1–5   |
| `texture`      | float | Sí        | 1–5   |
| `malignancy`   | float | Sí        | 1–5   |

**Respuesta `202`:**
```json
{
  "upload_id": "uuid",
  "status": "processing"
}
```

**Errores:**
| Código | Causa                          |
|--------|--------------------------------|
| 400    | Extensión inválida, archivo vacío |
| 413    | Imagen > 10 MB                 |
| 500    | Error subiendo a Storage       |

---

### `GET /api/v1/analysis/{upload_id}`

Devuelve el estado del análisis. Usar para polling hasta que `upload_status` sea `ai_completed` o `ai_failed`.

**Auth:** Bearer JWT requerido.

**Path param:** `upload_id` — UUID devuelto por `POST /analysis/predict`.

**Respuesta `200`:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "original_name": "imagen.png",
  "storage_path": "<uuid>/analysis/<uuid>_imagen.png",
  "file_size": 204800,
  "file_type": "png_analysis",
  "upload_status": "ai_completed",
  "clinical_features": { "subtlety": 3, "calcification": 6, ... },
  "ai_score": 0.74,
  "ai_risk_level": "MEDIO",
  "ai_recommendation": "Seguimiento en 6 meses",
  "ai_model_version": "v1.2",
  "ai_processed_at": "2026-06-01T10:01:30Z",
  "ai_error": null,
  "metadata_json": { "filename": "imagen.png", "content_type": "image/png" },
  "created_at": "2026-06-01T10:00:00Z",
  "model_version": "luisdam-oncoscan-ai@unknown",
  "inference_time_ms": 3800,
  "predicted_at": "2026-06-01T10:01:30Z"
}
```

Estados posibles de `upload_status`: `uploaded` → `processing` → `ai_completed` | `ai_failed` | `error`

**Errores:**
| Código | Causa                                              |
|--------|----------------------------------------------------|
| 404    | `upload_id` no encontrado o no pertenece al usuario|
| 500    | Error consultando la base de datos                 |

---

## Autenticación

Todos los endpoints autenticados esperan:
```
Authorization: Bearer <supabase_access_token>
```

El JWT lo provee `supabase.auth.getSession()` en el cliente. El backend lo verifica en `app/core/security.py` con la clave pública de Supabase.

---

_Ver también: [esquema-bd.md](esquema-bd.md) para la estructura de la tabla `dicom_uploads`._
_Colección Postman: [`docs/postman/`](../postman/)._
