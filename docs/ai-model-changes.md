# Resumen Técnico: Integración del Modelo IA (rama `ai-service`)

## 1. Contexto

La rama `ai-service` introduce el **flujo completo de inferencia con el modelo OncaScan AI** desplegado como Hugging Face Space. Cambia el funcionamiento del modelo: pasa de no existir en el backend a un pipeline asíncrono end-to-end (subida → background task → polling → resultado persistido).

### Estado de las ramas remotas

| Rama | Estado | Notas |
|---|---|---|
| `origin/main` | Base estable (sin IA) | Último commit propio: `41d5fe3` (merge PR #2 de Luis) |
| `origin/ai-service` | **+2 commits sobre main** | Trae todo el módulo IA — pendiente de merge |
| `origin/Luis` | Mergeada en main vía PR #1/#2 | Aporta CORS explícito para Vercel |
| `origin/fronted-nicolas` | Mergeada en main | Búsqueda en historial, dashboard, Case_Ref |

Local `ai-service` está sincronizada con `origin/ai-service` (sin commits propios pendientes).

### Commits relevantes del modelo

- `bc587e0` — **Modelo ia pre integracion con back** (14 archivos, +1020 / -44)
- `d2339b7` — **Modelo + back** (sólo bump de `package-lock.json`)

---

## 2. Cambio funcional

**Antes:** el backend sólo recibía DICOM, extraía metadatos con `pydicom` y los persistía. No había inferencia.

**Ahora:** se añade un canal paralelo de análisis IA sobre imágenes **PNG/JPG** (no DICOM) con 8 *features* clínicas LIDC-IDRI. El backend delega la inferencia a un Space externo en Hugging Face y entrega el resultado al frontend mediante *polling*.

Convive con el flujo DICOM antiguo: la misma tabla `dicom_uploads` discrimina por la nueva columna `file_type` (`dicom` vs `png_analysis`).

---

## 3. Arquitectura nueva

```
[Frontend Next.js]
   │  (1) POST /api/v1/analysis/predict (multipart: imagen + 8 features + JWT)
   ▼
[FastAPI /apps/api]
   ├─ Valida JWT (Supabase Auth)
   ├─ Valida extensión/MIME/tamaño (≤10 MB, PNG/JPG)
   ├─ Sube imagen a Supabase Storage (bucket dicom-files)
   ├─ INSERT dicom_uploads (file_type=png_analysis, upload_status=processing)
   ├─ Responde 202 {upload_id, status: "processing"}
   └─ BackgroundTask → hf_client.predict()
                         │
                         ▼
                  [HF Space: luisdam-oncoscan-ai.hf.space]
                         │  POST /predict
                         ▼
                  {score, nivel_riesgo, recomendacion, modelo_version}
                         │
                         ▼
                  UPDATE dicom_uploads (ai_score, ai_risk_level, ...,
                                        upload_status=ai_completed | ai_failed)

[Frontend] hace polling GET /api/v1/analysis/{id} cada 3 s (timeout 3 min)
```

---

## 4. Cambios por capa

### 4.1 Backend — [apps/api](apps/api/)

**Nuevo: [apps/api/app/services/hf_client.py](apps/api/app/services/hf_client.py)**
- Cliente HTTP `async` (httpx) contra el endpoint `/predict` del Space.
- Validación previa: las 8 *features* deben estar presentes (`subtlety`, `calcification`, `sphericity`, `margin`, `lobulation`, `spiculation`, `texture`, `malignancy`).
- Validación posterior: la respuesta debe ser JSON-dict con `score`, `nivel_riesgo`, `recomendacion`, `modelo_version`.
- Errores tipados con `HFInferenceError` cubriendo timeout, error de red, HTTP ≥400, JSON inválido, payload incompleto.

**Nuevo: [apps/api/app/api/v1/routers/analysis.py](apps/api/app/api/v1/routers/analysis.py)**

Dos endpoints bajo `/api/v1/analysis`:

| Método | Ruta | Función |
|---|---|---|
| `POST` | `/analysis/predict` | Recibe imagen + 8 features, persiste registro `processing`, dispara `BackgroundTasks` con `_run_inference`, devuelve `202` con `upload_id`. |
| `GET` | `/analysis/{upload_id}` | Devuelve fila completa para polling. Filtra por `user_id` del JWT (aislamiento). |

Detalles:
- Validaciones de form-data con `Form(..., ge=..., le=...)` aplicadas a cada feature según su rango (`calcification` 1-6, resto 1-5).
- Filtros: `ALLOWED_EXTENSIONS = {.png, .jpg, .jpeg}`, `ALLOWED_CONTENT_TYPES = {image/png, image/jpeg, image/jpg}`, `MAX_IMAGE_BYTES = 10 MB`.
- Path en Storage: `{user_id}/analysis/{uuid4}_{filename}`.
- `_run_inference` corre la corutina `hf_predict` con `asyncio.run` dentro del `BackgroundTask` (síncrono por contrato de Starlette) y persiste éxito o fallo en la misma fila.
- `_persist_failure` recorta el mensaje de error a 1000 caracteres antes de escribir.

**Modificado: [apps/api/app/core/config.py](apps/api/app/core/config.py)**
- Añade `HF_API_BASE_URL` (default `https://luisdam-oncoscan-ai.hf.space`) y `HF_PREDICT_TIMEOUT` (default `120` s, float).

**Modificado: [apps/api/app/main.py](apps/api/app/main.py)**
- Registra `analysis_router` bajo `/api/v1` con tag `analysis`.

**Modificado: `apps/api/requirements.txt`** — diff binario (UTF-16 BOM probable); el nuevo módulo necesita `httpx` que se añadió ahí.

### 4.2 Frontend — [apps/web](apps/web/)

**Nuevo: [apps/web/src/app/platform/analyze/page.tsx](apps/web/src/app/platform/analyze/page.tsx)**
- Formulario cliente (`useState`) con input `file` (PNG/JPG) y 8 campos numéricos para las features. Valor por defecto `3` (intermedio).
- Validación local de rangos antes de enviar.
- Adjunta el `access_token` de la sesión Supabase como `Authorization: Bearer …`.
- Tras éxito redirige a `/platform/analyze/[id]`.

**Nuevo: [apps/web/src/app/platform/analyze/[id]/page.tsx](apps/web/src/app/platform/analyze/[id]/page.tsx)**
- Página de polling para resultado IA.
- `POLL_INTERVAL_MS = 3000`, `POLL_TIMEOUT_MS = 180000` (3 min). Si expira muestra CTA de reintento manual (la inferencia sigue en backend).
- Renderiza estados: `processing` (spinner), `ai_completed` (score + badge de riesgo + recomendación + features usadas + modelo), `ai_failed` (mensaje y CTA reintentar).
- Mapa visual de `ai_risk_level`: `ALTO` rojo, `MEDIO` ámbar, `BAJO` esmeralda.

**Modificado: [apps/web/src/app/platform/uploads/page.tsx](apps/web/src/app/platform/uploads/page.tsx)**
- El historial pasa de "sólo DICOM" a **unificado DICOM + IA**.
- Selecciona también `file_type`, `ai_risk_level`, `ai_score`.
- Renderiza columna "Tipo" (DICOM / IA), columna combinada "Modalidad / Riesgo IA" (badge coloreado si es IA), y el link de acción enruta a `/platform/analyze/{id}` cuando `file_type === "png_analysis"`.

**Modificado: [apps/web/src/components/layout/Sidebar.tsx](apps/web/src/components/layout/Sidebar.tsx)**
- Añade entrada **"Análisis IA"** apuntando a `/platform/analyze`, con icono `Brain` (lucide) en la sección "Clínico Real (Activo)".

### 4.3 Base de datos — [docs/ai-service-migration.sql](docs/ai-service-migration.sql)

Migración idempotente sobre `public.dicom_uploads` que añade:

| Columna | Tipo | Default |
|---|---|---|
| `file_type` | `text NOT NULL` | `'dicom'` |
| `clinical_features` | `jsonb` | — |
| `ai_score` | `double precision` | — |
| `ai_risk_level` | `text` | — |
| `ai_recommendation` | `text` | — |
| `ai_model_version` | `text` | — |
| `ai_processed_at` | `timestamptz` | — |
| `ai_error` | `text` | — |

Más índice `dicom_uploads_user_file_type_idx (user_id, file_type, created_at DESC)` para listados filtrados.

**⚠️ Requiere ejecución manual** en el SQL editor de Supabase antes de promover el merge a producción. Los registros DICOM viejos quedan con `file_type='dicom'` automáticamente.

### 4.4 Documentación

- [docs/deploy.md](docs/deploy.md): añade vars `HF_API_BASE_URL`, `HF_PREDICT_TIMEOUT`, sección 5.4 con el servicio de inferencia, referencia a la migración y nota sobre cold-start.
- [docs/architecture_analysis.md](docs/architecture_analysis.md): nuevo análisis de arquitectura cliente-servidor + Supabase (no menciona aún el módulo IA — pendiente actualizar).

---

## 5. Contrato API

### `POST /api/v1/analysis/predict`
- **Auth:** Bearer JWT Supabase obligatorio.
- **Content-Type:** `multipart/form-data`.
- **Campos:** `imagen` (file PNG/JPG ≤10 MB) + 8 features numéricas.
- **Respuesta 202:** `{ "upload_id": "<uuid>", "status": "processing" }`.
- **Errores:** `400` (validación), `413` (>10 MB), `500` (Storage/DB).

### `GET /api/v1/analysis/{upload_id}`
- **Auth:** Bearer JWT (filtra por `user_id`).
- **Respuesta 200:** fila completa de `dicom_uploads` con los campos `ai_*`.
- **Errores:** `404` si no existe o no pertenece al usuario.

### Contrato del Space HF (`POST /predict`)
- Multipart: `imagen` + 8 features como strings.
- Respuesta esperada: `{ score: float, nivel_riesgo: "BAJO|MEDIO|ALTO", recomendacion: str, modelo_version: str }`.

---

## 6. Variables de entorno nuevas

```env
# apps/api/.env
HF_API_BASE_URL=https://luisdam-oncoscan-ai.hf.space   # opcional, tiene default
HF_PREDICT_TIMEOUT=120                                  # opcional, segundos
```

No se introducen variables nuevas en el frontend (reutiliza `NEXT_PUBLIC_API_URL`).

---

## 7. Riesgos y deuda detectada

| # | Riesgo | Impacto | Sugerencia |
|---|---|---|---|
| 1 | **Cold-start del HF Space** | Primera petición tarda 30-60 s; con `HF_PREDICT_TIMEOUT=120` aún cabe, pero ajustado. | Considerar warm-up periódico o subir timeout. |
| 2 | **BackgroundTask + `asyncio.run` se pierde si el worker reinicia** | Análisis quedan colgados en `processing` para siempre. | Job queue (Celery/Redis) o fallback de reintento; al menos un job de barrido que marque `ai_failed` por inactividad. |
| 3 | **`upload_status` no tiene índice** | Polling escanea full table conforme crezca el historial. | Índice parcial `WHERE upload_status = 'processing'`. |
| 4 | **`CORSMiddleware` con `allow_origins=["*"]`** | Contradice el PR de "CORS explícitos para Vercel" mergeado en `main` (`9939e55`). | Revisar conflicto al integrar; mantener la versión restrictiva. |
| 5 | **`print` como logging** en todo el flujo IA | Difícil filtrar/observar en Railway. | Adoptar `logging` con niveles. |
| 6 | **El Space es SPOF externo sin SLA** | Una caída de HF tumba el feature. | Plan B: contenedor propio del modelo o caché de resultados. |
| 7 | **El `_persist_failure` no diferencia tipos de error** | Un timeout y un 500 se ven igual al usuario final. | Añadir `ai_error_code` para diferenciar (`TIMEOUT`, `HTTP_4xx`, etc.). |
| 8 | **Mezcla DICOM + análisis IA en la misma tabla** | Funciona vía `file_type`, pero crece el ancho de fila con muchas columnas opcionales. | A futuro, considerar tabla dedicada `ai_predictions` (ya sugerido en `architecture_analysis.md §5`). |

---

## 8. 🚨 Hallazgo crítico de seguridad (cambios sin commitear localmente)

El `git status` actual muestra modificaciones no commiteadas en:

- **`apps/api/.env.example`** — el diff sustituye los placeholders por **credenciales reales de Supabase**:
  - `SUPABASE_URL=https://xxbymgefzoaaqmhaizde.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI…AyrEC` (service_role JWT con `exp` 2034)

  El `service_role` key **bypassea RLS**: si esto se commitea y se sube a un repo público (o expone vía Vercel), cualquiera puede leer/escribir toda la base. **Acción requerida antes de commitear:**
  1. Restaurar `.env.example` con placeholders (`git restore apps/api/.env.example`).
  2. **Rotar la `service_role` key en Supabase** (Settings → API → rotate) — debe asumirse comprometida.
  3. Mover las credenciales reales a `.env` local (ya gitignored).

- **`apps/api/requirements.txt`** — diff binario (probable cambio de encoding UTF-16/BOM). Verificar y reescribir como UTF-8 LF para evitar problemas en Railway.

---

## 9. Checklist de merge a `main`

- [ ] Ejecutar `docs/ai-service-migration.sql` en Supabase de staging y prod.
- [ ] Configurar `HF_API_BASE_URL` y `HF_PREDICT_TIMEOUT` en Railway.
- [ ] Resolver conflicto de CORS con el commit `9939e55` (Luis).
- [ ] Saneamiento de `.env.example` + rotación de `service_role` key.
- [ ] Smoke test: subir un PNG y verificar transición `processing → ai_completed` con score válido.
- [ ] Verificar que el historial unificado renderiza ambos tipos sin regresiones.
