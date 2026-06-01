# Rol: IA + QA

> **Leer primero:** [00-comun.md](00-comun.md)

---

## Misión en la defensa

Explicar **cómo el modelo de IA procesa un estudio**, qué features clínicas recibe y qué devuelve, y demostrar que el sistema fue **verificado con una suite de tests** y smoke tests documentados.

---

## Archivos / rutas clave

| Archivo | Descripción |
|---------|-------------|
| [apps/api/app/services/hf_client.py](../../apps/api/app/services/hf_client.py) | Cliente que llama al HF Space `/predict` |
| [apps/api/app/api/v1/routers/analysis.py](../../apps/api/app/api/v1/routers/analysis.py) | Router análisis async (POST /analysis/predict, GET /analysis/{id}) |
| [apps/api/app/api/v1/routers/dicom.py](../../apps/api/app/api/v1/routers/dicom.py) | Upload + análisis DICOM síncrono |
| [apps/api/tests/](../../apps/api/tests/) | Suite pytest del backend |
| [apps/web/src/](../../apps/web/src/) | Tests Vitest del frontend |
| [docs/smoke-test.md](../smoke-test.md) | Protocolo de smoke test E2E |
| [docs/testing-guide.md](../testing-guide.md) | Guía de testing del proyecto |
| [docs/qa/](../qa/) | Fixtures, capturas y resultados de QA |
| [docs/qa/2026-05-30-smoke-test-defensa.md](../qa/2026-05-30-smoke-test-defensa.md) | Smoke test pre-defensa (33/33 pass) |
| [docs/ai-model-changes.md](../ai-model-changes.md) | Historial de cambios del modelo IA |

---

## El modelo de IA

### HF Space `luisdam-oncoscan-ai`

- **Plataforma:** Hugging Face Spaces
- **URL base:** `https://luisdam-oncoscan-ai.hf.space`
- **Endpoint:** `POST /predict`
- **Entrenado con:** dataset LIDC-IDRI (Lung Image Database Consortium)

### Request al modelo

El modelo recibe la imagen como PNG + 8 features clínicas radiológicas via `multipart/form-data`:

| Feature         | Escala | Descripción                         |
|-----------------|--------|-------------------------------------|
| `subtlety`      | 1–5    | Qué tan evidente es el nódulo       |
| `calcification` | 1–6    | Patrón de calcificación (6=ausente) |
| `sphericity`    | 1–5    | Forma del nódulo (5=esférico)       |
| `margin`        | 1–5    | Definición del borde (5=bien definido) |
| `lobulation`    | 1–5    | Irregularidad del contorno          |
| `spiculation`   | 1–5    | Proyecciones en el borde            |
| `texture`       | 1–5    | Densidad interna (5=sólido)         |
| `malignancy`    | 1–5    | Sospecha clínica (5=maligno)        |

### Response del modelo

```json
{
  "score": 0.82,
  "nivel_riesgo": "ALTO",
  "recomendacion": "Derivar a oncología para biopsia",
  "modelo_version": "v1.2"
}
```

| Campo           | Descripción                              |
|-----------------|------------------------------------------|
| `score`         | Probabilidad 0–1 de malignidad           |
| `nivel_riesgo`  | `ALTO` (>0.65), `MEDIO` (0.35–0.65), `BAJO` (<0.35) |
| `recomendacion` | Texto clínico de acción sugerida         |
| `modelo_version`| Versión del modelo en el Space           |

---

## Flujo sync vs async

### Flujo sincrónico (`/dicom/analyze/{id}`)

```
Frontend → POST /dicom/analyze/{id} → espera respuesta (hasta 150s)
                                            ↓
                                    HF Space /predict
                                            ↓
                                    UPDATE dicom_uploads
                                            ↓
                                    → respuesta JSON inmediata
```

### Flujo asíncrono (`/analysis/predict`)

```
Frontend → POST /analysis/predict → 202 { upload_id, status: "processing" }
                                         ↓ (background task)
                                    HF Space /predict
                                         ↓
                                    UPDATE dicom_uploads (ai_completed / ai_failed)

Frontend → GET /analysis/{upload_id} → polling cada X segundos
                                         ↓
                              retorna registro completo cuando status != "processing"
```

### Cold-start del Space

El HF Space puede tardar **30–60 segundos** en arrancar si lleva tiempo inactivo. El timeout configurado es **120 s** (`HF_PREDICT_TIMEOUT`). El frontend muestra advertencia si la petición tarda más de 2 minutos.

---

## Suite de tests

### Backend (pytest)

```bash
cd apps/api
pytest tests/ -v
```

Cubre: endpoints de health, upload, análisis, validaciones de features, manejo de errores HF.

### Frontend (Vitest)

```bash
cd apps/web
npm run test
```

Cubre: componentes UI críticos, lógica de validación de formularios.

### Smoke test E2E

Protocolo documentado en [docs/smoke-test.md](../smoke-test.md).
Resultado pre-defensa: **33/33 casos pass** — ver [docs/qa/2026-05-30-smoke-test-defensa.md](../qa/2026-05-30-smoke-test-defensa.md).

Capturas de pantalla: [docs/qa/screenshots-defensa/](../qa/screenshots-defensa/).

---

## Preguntas probables + respuesta

**¿Qué tan preciso es el modelo?**
> Está entrenado con LIDC-IDRI, uno de los datasets de referencia para nódulos pulmonares. Su precisión es de uso académico. Las métricas exactas están en `docs/ai-model-changes.md`. El disclaimer siempre acompaña el resultado: no reemplaza al especialista.

**¿Qué pasa si el modelo falla (timeout, error)?**
> El backend actualiza `upload_status = "ai_failed"` y `ai_error` con el mensaje. El frontend muestra un error genérico al usuario. El detalle del error se loguea solo internamente (sin PHI).

**¿Por qué 8 features? ¿Qué son?**
> Son las 8 características anotadas en LIDC-IDRI por radiólogos: sutileza, calcificación, esfericidad, margen, lobulación, espiculación, textura y malignidad. El modelo las combina con la imagen para predecir.

**¿El modelo ve imágenes en tiempo real?**
> No. El médico sube la imagen, la almacena en Supabase Storage, y el backend la descarga y envía al Space. No hay streaming.

---

## Comandos que debes saber demostrar

```bash
# Correr todos los tests del backend
cd apps/api
pytest tests/ -v

# Correr tests del frontend
cd apps/web
npm run test

# Ver el smoke test documentado
cat docs/smoke-test.md

# Llamar al modelo manualmente (ejemplo con curl)
curl -X POST https://luisdam-oncoscan-ai.hf.space/predict \
  -F "imagen=@imagen.png" \
  -F "subtlety=3" -F "calcification=6" -F "sphericity=4" \
  -F "margin=4" -F "lobulation=1" -F "spiculation=1" \
  -F "texture=5" -F "malignancy=3"
```
