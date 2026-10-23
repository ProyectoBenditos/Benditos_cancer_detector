# Integración segura del volumen 3D — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar la rama de Luis (visor 3D, MONAI, HiResCAM, series ZIP/NIfTI) lista para fusionar a `main` sin romper producción (Render + Oracle v1.2), corrigiendo los hallazgos de la revisión.

**Architecture:** La rama `feat/volumen-3d-integracion` sale de `origin/feat/volumen-3d-handoff-2026-10-22` (`a17daa2`). El backend vuelve al contrato PNG con Oracle por defecto y solo envía el archivo fuente cuando `AI_INPUT_MODE=source`, que es lo que usa el worker local. La lógica nueva sale de `routers/dicom.py` a servicios pequeños con pruebas (`upload_types`, `dicom_series`, `nifti_deid`, `ct_window`, `ai_contract`). En la web, la pestaña 3D queda detrás de `NEXT_PUBLIC_VOLUME_3D_ENABLED` y solo para series y NIfTI, y se quitan los datos clínicos inventados o no validados de la interfaz.

**Tech Stack:** FastAPI + pydicom + nibabel + httpx (pytest); Next.js 16 + React 19 + Three.js (vitest + Testing Library).

**Spec:** [docs/revision-rama-volumen-3d-2026-10-22.md](../../revision-rama-volumen-3d-2026-10-22.md). Los códigos A1–A6, C1–C10, M1–M14 y D1–D6 de cada tarea son los de ese documento.

## Global Constraints

- Commits en español, formato `tipo(alcance): descripción` (`feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`). **Sin** `Co-Authored-By` ni menciones a IA o asistentes en commits, código ni documentos.
- El push y el PR los hace Mateo. Nunca `git push`.
- PHI: nunca registrar en logs `str(e)`, rutas de Storage, nombres de archivo, `email`, `Case_Ref` ni `result_json`. En los logs, solo `error_type=type(e).__name__` y `hash_id(...)`.
- Sin `brand-danger` fuera de alertas clínicas. En tema oscuro, los acentos van en `sky-200`/`sky-300`/`sky-400`.
- Si un archivo se regenera desde PowerShell, siempre con `-Encoding utf8`.
- Pines de API (instalan en Python 3.11 y 3.14, comprobado el 2026-10-23): `numpy==2.3.4`, `Pillow==11.3.0`, `scipy==1.16.3`, `nibabel==5.3.2`.
- Tamaño máximo de subida: 50 MB (`50 * 1024 * 1024` bytes), por el límite de archivo de Supabase Free.
- No modificar `docs/volume-rendering/handoff-2026-10-22/run-manifest.json`: es el registro de la entrega de Luis, y `scripts/verify_volume_handoff.py` reportará diferencias por diseño.
- Comandos de prueba: API en `apps/api` con `.venv/Scripts/python.exe -m pytest -q`; web en `apps/web` con `npx vitest run`, `npx tsc --noEmit` y `npx eslint <archivos>`.

## Review Focus

1. **`.dcm` multiframe en modo PNG:** debe enviarse el corte central, no fallar. La prueba va en la Tarea 4.
2. **ZIP con carpetas, archivos DICOM sin extensión y `__MACOSX/`:** debe leer los cortes válidos e ignorar los demás. La prueba va en la Tarea 2.
3. **Respuesta de Oracle v1.2 sin `explicabilidad`, o con `explicabilidad: null`:** no debe romper y debe conservar `heatmap_base64`. La prueba va en la Tarea 4.
4. **`.NII.GZ` en mayúsculas o un `.tar.gz`:** el primero se acepta como NIfTI y el segundo se rechaza con 400. La prueba va en la Tarea 2.
5. **Estudios viejos** (`file_type` = `dicom`, `image` o `png_analysis`, sin `volume_metadata`): el detalle muestra solo el visor 2D, sin pestañas ni lóbulo inventado. La prueba va en la Tarea 7.

## Fuera de alcance (planes separados)

| Tema | Por qué va aparte |
|---|---|
| Fase D: lectura ciega y modo práctica, incluido el panel del caso en la pantalla completa 3D (D6) | Es la siguiente fase del visor y tiene su propio diseño |
| Detector MONAI de nódulos (RetinaNet), índice de enfisema | Funcionalidad nueva de IA; requiere un diseño con Luis |
| Despliegue de v2 2D en Oracle ARM por CPU | Infraestructura; primero medir la latencia |
| `slice_index` en `upload_annotations` | Depende de que se adopten series en el visor 2D |
| Retención y borrado de derivados (`.cache/`, Storage) | Requiere una política acordada |
| E2E de aislamiento entre dos usuarios en staging | Requiere cuentas de staging |
| M5 (atlas más liviano), M9 (mover la arquitectura fuera de `docs/`) | Tocan el pipeline ML y los hashes de Luis; decidir con él |
| Métricas por paciente con IC por bootstrap | Requiere recuperar las predicciones originales (Luis) |

---

### Task 1: Dependencias, lockfile y línea base

Resuelve A2, A3, M3 y el `.gitignore`.

**Files:**
- Modify: `apps/api/requirements.txt`
- Modify: `apps/web/package.json`, `apps/web/package-lock.json`
- Modify: `.gitignore`
- Delete: `package.json` (raíz), `pnpm-workspace.yaml`, `find_data.py`
- Add: `docs/revision-rama-volumen-3d-2026-10-22.md`, este plan

**Interfaces:**
- Produces: un entorno donde `pytest` corre las suites de volumen (con `nibabel` y `scipy`) y donde `npm ci` funciona.

- [ ] **Step 1: Registrar la línea base.** Ejecutar `.venv/Scripts/python.exe -m pytest -q` en `apps/api`. Esperado: 4 fallas y 1 error de colección, todos `ModuleNotFoundError: nibabel`.
- [ ] **Step 2: Fijar los pines de API.** En `apps/api/requirements.txt`, cambiar `numpy==1.26.4` → `numpy==2.3.4` y `Pillow==10.4.0` → `Pillow==11.3.0`, y agregar `scipy==1.16.3` y `nibabel==5.3.2`.
- [ ] **Step 3: Instalar y correr la suite completa.** Ejecutar `.venv/Scripts/python.exe -m pip install -r requirements.txt -r requirements-dev.txt` y luego `pytest -q`. Esperado: **todas pasan**, incluido `tests/test_volume_artifacts.py`.
- [ ] **Step 4: Arreglar las dependencias web.** En `apps/web/package.json`, mover `@types/three` a `devDependencies`. Ejecutar `npm install` en `apps/web` y después `npm ci --dry-run`. Esperado: ya no aparece `Missing: ... from lock file`.
- [ ] **Step 5: Arreglar el `.gitignore` de la raíz.** El patrón `scripts/*` de Luis está anclado a la raíz y dejó de ignorar `apps/api/scripts/`. Agregar debajo de las excepciones de `scripts/`:
  ```
  apps/api/scripts/
  ```
  Verificar con `git status --short` que `apps/api/scripts/` ya no aparece.
- [ ] **Step 6: Borrar los archivos de relleno** `package.json` (raíz), `pnpm-workspace.yaml` y `find_data.py` con `git rm`.
- [ ] **Step 7: Commit.**
  ```bash
  git add apps/api/requirements.txt apps/web/package.json apps/web/package-lock.json .gitignore docs/revision-rama-volumen-3d-2026-10-22.md docs/superpowers/plans/2026-10-23-volumen-3d-integracion.md
  git commit -m "chore: fijar dependencias de volumen, sincronizar lockfile y quitar archivos de relleno"
  ```

---

### Task 2: Clasificación de subidas y lectura segura de series ZIP

Resuelve A4, M10 y el límite de 50 MB del backend (M12).

**Files:**
- Create: `apps/api/app/services/upload_types.py`, `apps/api/app/services/dicom_series.py`
- Modify: `apps/api/app/api/v1/routers/dicom.py` (bloque ZIP de `upload_dicom`, `ALLOWED_EXTENSIONS`, los flags `is_*` de `upload_dicom` y `analyze_dicom`)
- Modify: `apps/api/app/services/ct_volume.py` (rama `.zip` de `read_ct`)
- Test: `apps/api/tests/test_upload_types.py`, `apps/api/tests/test_dicom_series.py`, `apps/api/tests/test_dicom.py`

**Interfaces:**
- Produces, en `upload_types.py`:
  ```python
  UploadKind = Literal["dicom", "dicom_series", "nifti_volume", "image"]
  def classify_upload(filename: str) -> UploadKind | None
  def kind_of_record(record: dict) -> UploadKind
  ```
  - `classify_upload`: no distingue mayúsculas. Mapea `.dcm`→`dicom`, `.zip`→`dicom_series`, `.nii` y `.nii.gz`→`nifti_volume`, `.png`/`.jpg`/`.jpeg`→`image`; cualquier otra extensión (incluido `.tar.gz` y `.gz` suelto) → `None`.
  - `kind_of_record`: si `record["file_type"]` es `dicom_series` o `nifti_volume`, lo devuelve; si no, `classify_upload(record["original_name"])`; si eso da `None`, devuelve `"image"`.
- Produces, en `dicom_series.py`:
  ```python
  MAX_UPLOAD_BYTES = 50 * 1024 * 1024
  MAX_ZIP_ENTRIES = 1000
  MAX_ZIP_UNCOMPRESSED_BYTES = 300 * 1024 * 1024
  MAX_COMPRESSION_RATIO = 100
  class SeriesError(ValueError): ...   # mensaje en español, apto para mostrar al usuario
  def read_ct_series(zip_bytes: bytes, *, max_uncompressed: int = MAX_ZIP_UNCOMPRESSED_BYTES) -> list[tuple[float, bytes, pydicom.Dataset]]
  ```

- [ ] **Step 1: Escribir las pruebas que fallan** en `tests/test_upload_types.py`:
  - `classify_upload("ESTUDIO.NII.GZ") == "nifti_volume"`;
  - `classify_upload("x.tar.gz") is None`;
  - `classify_upload("x.gz") is None`;
  - `classify_upload("x.DCM") == "dicom"`;
  - `kind_of_record({"file_type": "png_analysis", "original_name": "a.png"}) == "image"`;
  - `kind_of_record({"file_type": "dicom", "original_name": "raro.bin"}) == "image"`.
- [ ] **Step 2: Escribir las pruebas que fallan** en `tests/test_dicom_series.py`. Reutilizar `_create_test_dicom_bytes` de `tests/test_dicom.py`: moverlo a un módulo nuevo `tests/dicom_factory.py` como `make_test_dicom_bytes(...)`, con un parámetro opcional `series_uid`, e importarlo desde ambos archivos:
  - `test_lee_cortes_en_carpetas_y_sin_extension_ignorando_macosx`: un ZIP con `serie/a.dcm`, `serie/B` (sin extensión) y `__MACOSX/serie/._a.dcm` devuelve 2 cortes ordenados por Z.
  - `test_rechaza_demasiadas_entradas`: `MAX_ZIP_ENTRIES + 1` entradas → `SeriesError`.
  - `test_rechaza_tamano_descomprimido_excesivo`: `max_uncompressed=1000` con un corte más grande → `SeriesError`, **sin llamar a `ZipFile.read`** (monkeypatch que falla si se llama).
  - `test_rechaza_relacion_de_compresion_sospechosa`: una entrada de 10 MB de ceros → `SeriesError`.
  - `test_rechaza_varias_series`: dos `SeriesInstanceUID` distintos → `SeriesError` con el texto `"varias series"`.
  - `test_zip_sin_ct_mantiene_mensaje`: solo modalidad `MR` → `SeriesError("El archivo .zip no contiene cortes tomográficos de tórax (CT) válidos en formato DICOM.")`.
- [ ] **Step 3:** Correr `pytest tests/test_upload_types.py tests/test_dicom_series.py -q`. Esperado: FAIL (los módulos no existen).
- [ ] **Step 4: Implementar los dos módulos.** `read_ct_series` valida **antes de leer** con `ZipFile.infolist()`: número de entradas, suma de `file_size` y `file_size / max(compress_size, 1)` por entrada. Después filtra los candidatos (basename `.dcm` o sin punto; descarta rutas que empiezan con `__MACOSX/` o basenames que empiezan con `.`), lee, se queda con `Modality == "CT"`, agrupa por `SeriesInstanceUID` (`""` si falta) y ordena por Z con la misma prioridad actual (`ImagePositionPatient[2]`, `SliceLocation`, `InstanceNumber`). Mensaje para varias series: `f"El ZIP contiene {n} series CT; suba una sola serie."`.
- [ ] **Step 5: Integrar en `dicom.py`.**
  - `upload_dicom` usa `classify_upload` (`None` → 400 con `"Formato no soportado. Use .dcm, .zip, .nii, .nii.gz, .png o .jpg"`).
  - Si `len(contents) > MAX_UPLOAD_BYTES` → 413 con `"El archivo supera el máximo de 50 MB."`.
  - El caso ZIP llama a `read_ct_series` y convierte `SeriesError` en 400 con su mensaje.
  - `analyze_dicom` reemplaza los flags `is_*` por `kind_of_record(record)`.
  - Borrar `ALLOWED_EXTENSIONS`.
- [ ] **Step 6: Integrar en `ct_volume.read_ct`.** La rama `.zip` usa `read_ct_series(data, max_uncompressed=1_500_000_000)` y toma los datasets; se conserva el mensaje del límite de 1,5 GB.
- [ ] **Step 7: Agregar a `tests/test_dicom.py`:**
  - `test_dicom_upload_tar_gz_devuelve_400`;
  - `test_dicom_upload_mayor_a_50mb_devuelve_413` (con `b"0" * (50 * 1024 * 1024 + 1)` y nombre `a.png`);
  - `test_dicom_upload_zip_varias_series_devuelve_400`.
- [ ] **Step 8:** Correr `pytest -q`. Esperado: todo PASS.
- [ ] **Step 9: Commit.** `feat(api): validar tipo, tamaño y serie única en la subida de ZIP antes de descomprimir`

---

### Task 3: Desidentificación de NIfTI

Resuelve C1 y la parte de M6 que afecta a la subida.

**Files:**
- Create: `apps/api/app/services/nifti_deid.py`
- Modify: `apps/api/app/api/v1/routers/dicom.py` (caso NIfTI de `upload_dicom`)
- Test: `apps/api/tests/test_nifti_deid.py`, `apps/api/tests/test_dicom.py`

**Interfaces:**
- Produces:
  ```python
  NIFTI_TEXT_FIELDS = ("descrip", "aux_file", "db_name")
  def deidentify_nifti_bytes(data: bytes, *, gzipped: bool) -> tuple[bytes, dict]
  ```
  El `dict` tiene las mismas claves que el de `deidentify_dicom_bytes`: `source_sha256`, `sanitized_sha256`, `pseudonymized_patient_id` (`f"ONC-NII-{uuid4().hex[:8].upper()}"`), `tags_cleared_count`, `deidentified_at` (ISO UTC) y `normative_compliance = "NIfTI: descrip, aux_file, db_name y extensiones de cabecera eliminados"`. Lanza `ValueError("El archivo NIfTI no es válido.")` si no se puede leer.

- [ ] **Step 1: Escribir las pruebas que fallan** en `tests/test_nifti_deid.py`, con un `nib.Nifti1Image` de 4×4×3 cuya cabecera tenga `descrip=b"PACIENTE^PRUEBA"`, `aux_file=b"CC-123"` y una extensión `Nifti1Extension("comment", b"PatientName=X")`:
  - después de `deidentify_nifti_bytes(..., gzipped=True)`, los tres campos son `b""`, `len(header.extensions) == 0` y `tags_cleared_count == 3`;
  - los vóxeles y el affine son idénticos (`np.testing.assert_array_equal`);
  - `sanitized_sha256 != source_sha256`;
  - con `gzipped=False` la salida no empieza con `b"\x1f\x8b"`;
  - con bytes basura lanza `ValueError`.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3: Implementar.** `gzip.decompress` si `gzipped`; `nib.Nifti1Image.from_bytes`; vaciar los campos y `header.extensions.clear()`; `img.to_bytes()`, y `gzip.compress` si `gzipped`.
- [ ] **Step 4: Integrar en el caso NIfTI de `upload_dicom`.**
  - Llamar a `deidentify_nifti_bytes(contents, gzipped=filename.lower().endswith(".gz"))` **antes** de leer el volumen; `contents` pasa a ser la salida.
  - `audit_deid` es el dict devuelto. Borrar el `audit_deid` armado a mano y su texto `"Sin PHI en cabecera"`.
  - Borrar la llamada a `generate_texture_atlas` y la clave `atlas_dimensions`; nadie las consume (ver M6).
  - `ValueError` → 400.
- [ ] **Step 5: Agregar a `tests/test_dicom.py`:** `test_dicom_upload_nii_desidentifica_cabecera`. Sube un NIfTI con `descrip` de paciente, recupera los bytes que se pasaron a `supabase_mock.storage.from_().upload` y comprueba que `descrip` quedó vacío y que la auditoría insertada lleva `tags_cleared_count >= 1`.
- [ ] **Step 6:** Correr `pytest -q`. Esperado: PASS.
- [ ] **Step 7: Commit.** `fix(api): desidentificar la cabecera NIfTI antes de guardarla y auditar lo que realmente se limpia`

---

### Task 4: Contrato con el servicio de IA compatible con Oracle v1.2

Resuelve A1, la incompatibilidad `heatmap_base64` frente a `overlay_base64` y la parte de C6 que corresponde al backend.

**Files:**
- Create: `apps/api/app/services/ct_window.py` (mover aquí `apply_lung_window_hu`, `apply_lung_window` y `dicom_to_png_bytes` desde `dicom.py`, sin cambios de comportamiento)
- Create: `apps/api/app/services/ai_contract.py`
- Modify: `apps/api/app/api/v1/routers/dicom.py` (`analyze_dicom`, imports)
- Modify: `apps/api/app/services/hf_client.py` (devolver `normalize_ai_response(payload)`)
- Modify: `apps/api/.env.example` (documentar `AI_INPUT_MODE=png`)
- Modify: `scripts/start_local_services.ps1` (`$env:AI_INPUT_MODE = 'source'`)
- Test: `apps/api/tests/test_ai_contract.py`, `apps/api/tests/test_dicom.py`

**Interfaces:**
- Consumes: `UploadKind`, `kind_of_record` y `read_ct_series` (Tarea 2).
- Produces, en `ct_window.py`:
  ```python
  def dicom_to_png_bytes(file_bytes: bytes, slice_idx: int | None = None) -> bytes   # ya existe; se mueve
  def volume_keyframe_png(kind: UploadKind, data: bytes) -> tuple[bytes, int]       # (PNG del corte central, índice 0-based)
  ```
  En `dicom_series`, el corte central de `read_ct_series` con `apply_lung_window`. En `nifti_volume`, el canónico RAS con la misma orientación que la subida (`vol[::-1, ::-1, s].T`, `apply_lung_window_hu`) y `s = shape[2] // 2`.
- Produces, en `ai_contract.py`:
  ```python
  AiInputMode = Literal["png", "source"]
  def ai_input_mode() -> AiInputMode          # lee os.environ["AI_INPUT_MODE"]; ausente o inválido → "png"
  @dataclass(frozen=True)
  class InferenceFile:
      filename: str
      content: bytes
      content_type: str
      keyframe_png: bytes | None
      source_slice_index: int | None
  def build_inference_file(kind: UploadKind, original_name: str, data: bytes, mode: AiInputMode) -> InferenceFile
  async def post_predict(file: InferenceFile, features: dict[str, float]) -> dict   # usa config.HF_API_BASE_URL y HF_PREDICT_TIMEOUT, 2 reintentos ante ConnectError/Timeout, raise_for_status
  def normalize_ai_response(payload: dict) -> dict
  ```
  - `build_inference_file` en modo `png`:
    - `dicom` → `("imagen.png", dicom_to_png_bytes(data), "image/png", keyframe=ese PNG, índice=None)`;
    - `image` → convertido a PNG RGB, igual que `main`;
    - `dicom_series`/`nifti_volume` → `volume_keyframe_png`.
  - En modo `source`: `(original_name, data, "application/octet-stream", None, None)`.
  - `normalize_ai_response` devuelve una copia con `explicabilidad = payload.get("explicabilidad") or {}` y `heatmap_base64 = payload.get("heatmap_base64") or explicabilidad.get("overlay_base64")`.

- [ ] **Step 1: Escribir las pruebas que fallan** en `tests/test_ai_contract.py`:
  - `ai_input_mode()` con la variable ausente, con `"PNG?"` y con `"source"` → `"png"`, `"png"`, `"source"`;
  - modo `png` con un `.dcm` de un corte → `content_type == "image/png"` y `content[:8] == b"\x89PNG\r\n\x1a\n"`;
  - modo `png` con un `.dcm` **multiframe** de 5 frames → PNG válido (Review Focus 1);
  - modo `png` con una serie ZIP de 5 cortes → `source_slice_index == 2` y `keyframe_png == content`;
  - modo `png` con un NIfTI de 4×4×6 → `source_slice_index == 3`;
  - modo `source` → `content is data` y `keyframe_png is None`;
  - `normalize_ai_response({"score": 1, "heatmap_base64": "A"})["heatmap_base64"] == "A"`;
  - `normalize_ai_response({"explicabilidad": {"overlay_base64": "B"}})["heatmap_base64"] == "B"`;
  - `normalize_ai_response({"explicabilidad": None})` no lanza (Review Focus 3).
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3: Implementar `ct_window.py` y `ai_contract.py`.** En `dicom.py`, importar desde `ct_window` en lugar de definir las funciones.
- [ ] **Step 4: Reescribir el bloque de inferencia de `analyze_dicom`.**
  - `kind = kind_of_record(record)`; `file = build_inference_file(kind, record["original_name"], file_bytes, ai_input_mode())`; `ai_result = normalize_ai_response(await post_predict(file, features.model_dump(exclude={"lobar_location"})))`.
  - PNG "antes": `file.keyframe_png`; si es `None`, se decodifica `ai_result["keyframe_base64"]`; si tampoco existe y `kind` es de volumen, 502 (mensaje actual).
  - `source_slice_index = file.source_slice_index if file.source_slice_index is not None else ai_result.get("source_slice_index")`. Guardarlo en `metadata_json["analysis_source_slice"]` y devolver en la respuesta `"source_slice": {"index": i, "total": volume_metadata["num_slices"]}`, o `None` si falta alguno de los dos.
  - `model_version = ai_result.get("modelo_version") or os.getenv("HF_MODEL_VERSION", "oncoscan-ai@multimodal-v1.2")`, el valor de `main`.
  - Borrar las lecturas `os.getenv("HF_API_BASE_URL", "http://127.0.0.1:8001")`.
- [ ] **Step 5: En `hf_client.predict`, `return normalize_ai_response(payload)`.** Con eso, el análisis por lotes guarda el mapa también cuando responde el worker v2.
- [ ] **Step 6: Escribir las pruebas que fallan** en `tests/test_dicom.py` para `/api/v1/dicom/analyze/{id}`, con `monkeypatch.setattr(dicom_module, "post_predict", fake)` y el registro del mock de Supabase con `original_name="estudio.dcm"`:
  - `test_analyze_dcm_envia_png_por_defecto`: el `InferenceFile` que recibe `fake` tiene `content_type == "image/png"`;
  - `test_analyze_dcm_envia_fuente_con_ai_input_mode_source` (`monkeypatch.setenv("AI_INPUT_MODE", "source")`) → `application/octet-stream`;
  - `test_analyze_respuesta_v12_sin_explicabilidad_guarda_heatmap`: `fake` devuelve `{"score":0.7,"nivel_riesgo":"ALTO","recomendacion":"r","modelo_version":"multimodal-v1.2","heatmap_base64":"QQ=="}` y la respuesta trae `heatmap_base64 == "QQ=="`;
  - `test_analyze_zip_devuelve_corte_fuente`: con una serie de 5 cortes, la respuesta trae `source_slice == {"index": 2, "total": 5}`.
- [ ] **Step 7:** Correr `pytest -q`. Esperado: PASS.
- [ ] **Step 8:** Documentar `AI_INPUT_MODE=png` en `apps/api/.env.example` (comentario: `png` para Oracle v1.2, `source` para el worker local v2) y agregar `$env:AI_INPUT_MODE = 'source'` en `scripts/start_local_services.ps1`, junto a `HF_API_BASE_URL`.
- [ ] **Step 9: Commit.** `fix(api): conservar el contrato PNG con el servidor de IA y enviar el archivo fuente solo en modo local`

---

### Task 5: Errores y trazabilidad del análisis

Resuelve C2, C3, C4, C5 y M8.

**Files:**
- Modify: `apps/api/app/api/v1/routers/dicom.py` (manejo de excepciones de `analyze_dicom` y `signed_url_failed`)
- Modify: `apps/api/app/api/v1/routers/analysis.py:294` (bloque `except Exception: pass`)
- Modify: `apps/api/local_ml_server.py:83`
- Test: `apps/api/tests/test_dicom.py`

**Interfaces:**
- Consumes: `post_predict` (Tarea 4), que es lo que se mockea para provocar cada error.

- [ ] **Step 1: Escribir las pruebas que fallan** (mock de `post_predict` que lanza cada error; en cada caso, comprobar el código, el `detail` exacto y el `ai_error` enviado a `supabase_mock.table().update`):

  | Excepción | Código | `detail` | `ai_error` |
  |---|---|---|---|
  | `httpx.ConnectError("x")` | 503 | `"No se pudo conectar con el servicio de IA. Intenta de nuevo en unos segundos."` | `"ConnectError"` |
  | `httpx.ReadTimeout("x")` | 504 | `"El servicio de IA tardó demasiado en responder. Intenta de nuevo."` | `"TimeoutException"` |
  | `httpx.HTTPStatusError` con status 500 | 502 | `"El servicio de IA respondió con error 500."` | `"HTTPStatusError 500"` |
  | `RuntimeError("/ruta/secreta/paciente.dcm")` | 500 | `"Error en análisis"` | `"RuntimeError"` |
  | Volumen sin keyframe en modo `source` | 502 | el mensaje actual | — |

  Además: `test_analyze_no_registra_ruta_en_logs` con `caplog`: ningún registro contiene `"/ruta/secreta"`.
- [ ] **Step 2:** Correr. Esperado: FAIL. Hoy el 502 del keyframe se convierte en 500 y el `detail` incluye `str(e)`.
- [ ] **Step 3: Implementar.** Orden de los `except`: `HTTPException` (marca `upload_status="error"` y vuelve a lanzar), `httpx.ConnectError`, `httpx.TimeoutException`, `httpx.HTTPStatusError`, `httpx.HTTPError` (502, `"Error comunicando con el servicio de IA."`, `ai_error=type(e).__name__`) y `Exception`. Cada rama registra `log_event("dicom_analysis_failed", level="ERROR", error_type=type(e).__name__, upload_id_hash=hash_id(dicom_id))`. En éxito, restaurar `log_event("dicom_analysis_completed", upload_id_hash=hash_id(dicom_id), inference_time_ms=..., model_version=...)`. `signed_url_failed` pasa a `log_event("signed_url_failed", level="ERROR", error_type=type(e).__name__)`.
- [ ] **Step 4: En `analysis.py:294`,** reemplazar `pass` por `log_event("analysis_metadata_read_failed", level="WARNING", error_type=type(e).__name__)` (con `except Exception as e`).
- [ ] **Step 5: En `local_ml_server.py:83`,** el `message` del job en error pasa a `"No se pudo preparar el volumen. Revise el registro local del servicio."`. El detalle sigue en `logging.exception`. No tiene prueba automática (el worker requiere torch); verificarlo leyendo el diff.
- [ ] **Step 6:** Correr `pytest -q`. Esperado: PASS.
- [ ] **Step 7: Commit.** `fix(api): restaurar errores tipados del análisis y no exponer detalles internos ni rutas`

---

### Task 6: Quitar endpoints muertos y no bloquear el event loop

Resuelve M6 y M7.

**Files:**
- Modify: `apps/api/app/api/v1/routers/dicom.py` (borrar `get_volume_manifest`, `get_volume_atlas`, `generate_texture_atlas`, `apply_atlas_window` y los imports que queden sin usar: `StreamingResponse`, `Query`, `math` si aplica)
- Modify: `apps/api/app/api/v1/routers/volume.py:67`
- Modify: `apps/api/tests/test_volume_artifacts.py:44-45`, `apps/api/tests/test_volume_rendering.py:63-81`

- [ ] **Step 1: Confirmar que no se usan.** Ejecutar `git grep -n "/atlas\|/volume\"\|atlas_endpoint\|atlas_dimensions" -- apps/web/src apps/api/app`. Esperado: sin resultados en `apps/web/src`.
- [ ] **Step 2: Actualizar las pruebas.** Quitar los parámetros `("/api/v1/dicom/example/volume", "get")` y `("/api/v1/dicom/example/atlas", "get")` y borrar `test_atlas_is_canonical_linear_hu_and_physically_ordered`. Agregar `test_endpoints_de_atlas_retirados`: `client.get("/api/v1/dicom/x/atlas", headers=auth_headers).status_code == 404`.
- [ ] **Step 3:** Borrar el código listado arriba.
- [ ] **Step 4: En `volume.prepare`,** `data = await run_in_threadpool(supabase.storage.from_(SUPABASE_BUCKET_NAME).download, record["storage_path"])` (`from starlette.concurrency import run_in_threadpool`). Evitar la descarga cuando el volumen ya está en caché requiere un índice por `study_key` en el worker; queda fuera de este plan, junto con la persistencia de jobs de `PRODUCCION.md`.
- [ ] **Step 5:** Correr `pytest -q`. Esperado: PASS.
- [ ] **Step 6: Commit.** `refactor(api): retirar los endpoints de atlas sin uso y descargar el estudio fuera del event loop`

---

### Task 7: Pestañas del visor: flag, tipos, lóbulo, corte y referencia

Resuelve A5, A6, C6 (interfaz), parte de C7, C9, D1, D2, D5, M11 y M12 (cliente).

**Files:**
- Create: `apps/web/src/components/dicom/studyViewer.ts`, `apps/web/src/components/dicom/studyViewer.test.ts`
- Create: `apps/web/src/lib/uploadFile.ts`, `apps/web/src/lib/uploadFile.test.ts`
- Create: `apps/web/src/components/dicom/StudyViewerTabs.test.tsx`
- Modify: `apps/web/src/components/dicom/StudyViewerTabs.tsx`
- Modify: `apps/web/src/lib/references.ts` (agregar `hirescam`)
- Modify: `apps/web/src/app/platform/upload/page.tsx` (`UploadResponse`, `AnalysisResult`, validación antes de subir, props de `StudyViewerTabs`, import sin usar)
- Modify: `apps/web/src/app/platform/uploads/[id]/page.tsx` (props de `StudyViewerTabs`, import sin usar)
- Modify: `apps/web/.env.example` si existe; si no, documentarlo en el commit (`NEXT_PUBLIC_VOLUME_3D_ENABLED=false`)
- Modify: `scripts/start_local_services.ps1` (`$env:NEXT_PUBLIC_VOLUME_3D_ENABLED = 'true'`)

**Interfaces:**
- Consumes: el campo `source_slice` de la respuesta de análisis (Tarea 4) y `metadata_json.analysis_source_slice`.
- Produces, en `studyViewer.ts`:
  ```ts
  export function isVolumeFileType(fileType?: string | null): boolean        // dicom_series | nifti_volume
  export function volume3dEnabled(): boolean                                // process.env.NEXT_PUBLIC_VOLUME_3D_ENABLED === "true"
  export function explainabilityReference(modelVersion?: string | null): Reference  // /v2/ → REFERENCES.hirescam; si no, REFERENCES.gradcam
  ```
- Produces, en `uploadFile.ts`:
  ```ts
  export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
  export function validateUploadFile(file: { name: string; size: number }): string | null
  ```
  Devuelve el mensaje de error o `null`:
  - `"Formato no soportado. Use .dcm, .zip, .nii, .nii.gz, .png o .jpg."`;
  - `"El archivo supera el máximo de 50 MB."`.
- Produces: nuevas props de `StudyViewerTabs` (se **quitan** `numSlices` y `subtipoHistologico`):
  ```ts
  fileType?: string | null;
  lobarLocation?: string | null;
  sourceSlice?: { index: number; total: number } | null;
  modelVersion?: string | null;
  ```
- Produces: `REFERENCES.hirescam`:
  - `group: "metodos"`;
  - `short: "HiResCAM (Draelos y Carin, 2020)"`;
  - `citation: "Draelos RL, Carin L. Use HiResCAM instead of Grad-CAM for faithful explanations of convolutional neural networks. arXiv:2011.08891, 2020."`;
  - `url: "https://arxiv.org/abs/2011.08891"`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `studyViewer.test.ts`: los tres helpers; usar `vi.stubEnv("NEXT_PUBLIC_VOLUME_3D_ENABLED", "true")`.
  - `uploadFile.test.ts`: `"a.NII.GZ"` válido, `"a.tar.gz"` inválido, tamaño `MAX_UPLOAD_BYTES + 1` inválido.
  - `StudyViewerTabs.test.tsx` (mockear `next/dynamic` para que devuelva un componente que renderiza `"visor-3d"`):
    - con `fileType="dicom"` no hay `role="tablist"` y no aparece el texto `"Lóbulo"` (Review Focus 5);
    - con `fileType="dicom_series"` y la flag en `"false"`, no hay `tablist`;
    - con `fileType="dicom_series"` y la flag en `"true"`: hay un `tablist` con dos `tab`; el primero, `"Corte axial"`, tiene `aria-selected="true"`; `ArrowRight` lo pasa a `"Volumen 3D"`;
    - con `lobarLocation={null}` no aparece `"Lóbulo"`; con `"LID"` aparece `"Lóbulo: LID"`;
    - con `sourceSlice={{ index: 2, total: 5 }}` aparece `"Análisis sobre el corte 3 de 5."`;
    - con `modelVersion="multimodal-v2.0-densenet-real"` aparece el enlace `"HiResCAM (Draelos y Carin, 2020)"`; sin versión, `"Grad-CAM (Selvaraju et al., 2017)"`;
    - el HTML renderizado no contiene `brand-danger`.
- [ ] **Step 2:** Correr `npx vitest run src/components/dicom src/lib/uploadFile.test.ts`. Esperado: FAIL.
- [ ] **Step 3: Implementar los helpers y `REFERENCES.hirescam`.** Abrir la URL de arXiv y confirmar el título antes de commitear.
- [ ] **Step 4: Reescribir `StudyViewerTabs`.**
  - Las pestañas solo existen si `isVolumeFileType(fileType) && volume3dEnabled()`; si no, se renderiza solo el visor 2D. El estado inicial es siempre `"2d"`.
  - Patrón ARIA de pestañas: `role="tablist"` con `aria-label="Vista del estudio"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`; flechas izquierda y derecha cambian de pestaña.
  - Textos de las pestañas: `"Corte axial"` y `"Volumen 3D"`. Fuera el badge "Raymarching 3D" y cualquier `brand-danger`; acentos con `brand-primary`.
  - Se elimina el badge de subtipo.
  - El badge de lóbulo solo aparece si `lobarLocation` no está vacío.
  - Leyenda bajo el 2D: `Mapa generado con <SourceLink href={ref.url}>{ref.short}</SourceLink>: indica las regiones que más pesaron en el score; no delimita el nódulo ni su tamaño.`, seguido de `Análisis sobre el corte {index + 1} de {total}.` cuando hay `sourceSlice`.
  - El texto de carga del 3D pasa a `"Preparando el volumen…"`.
- [ ] **Step 5: Conectar las páginas.**
  - `upload/page.tsx`:
    - agregar `file_type: string` a `UploadResponse` y `source_slice?: { index: number; total: number } | null` a `AnalysisResult`;
    - quitar `subtipo_histologico` y `lobar_info` de `AnalysisResult` si quedan sin uso;
    - antes de subir, si `validateUploadFile(file)` devuelve un mensaje, mostrarlo con `toast.error` y no subir;
    - props: `fileType={successData?.file_type ?? null}`, `lobarLocation={lobarLocation || null}`, `sourceSlice={analysisResult.source_slice ?? null}`, `modelVersion={analysisResult.modelo_version}`;
    - quitar el import de `BeforeAfterViewer`.
  - `uploads/[id]/page.tsx`:
    - `lobarLocation = clinical_features.lobar_location ?? metadata_json.lobar_info?.codigo ?? null`;
    - `sourceSlice` armado con `metadata_json.analysis_source_slice` y `metadata_json.volume_metadata.num_slices` cuando los dos son números;
    - `modelVersion={upload.ai_model_version}`;
    - quitar el import de `BeforeAfterViewer`.
- [ ] **Step 6:** Correr `npx vitest run`, `npx tsc --noEmit` y `npx eslint src/components/dicom src/app/platform/upload/page.tsx "src/app/platform/uploads/[id]/page.tsx" src/lib`. Esperado: todo PASS y 0 warnings en esos archivos, salvo el `react-hooks/exhaustive-deps` que ya existía en `upload/page.tsx:117`.
- [ ] **Step 7: Commit.** `fix(web): pestaña 3D solo para volúmenes con bandera, sin lóbulo inventado y con la referencia del método`

---

### Task 8: Visor 3D: vista inicial, teclado, movimiento reducido y errores

Resuelve C8, D3, D4 y la parte de A6 que corresponde al visor.

**Files:**
- Create: `apps/web/src/components/dicom/volumeKeys.ts`, `apps/web/src/components/dicom/volumeKeys.test.ts`
- Modify: `apps/web/src/components/dicom/volumeClient.ts`, `apps/web/src/components/dicom/volumeClient.test.ts`
- Modify: `apps/web/src/components/dicom/VolumeViewer3D.tsx`

**Interfaces:**
- Produces, en `volumeKeys.ts`:
  ```ts
  export type VolumeKeyAction =
    | { type: "rotate"; dx: number; dy: number }
    | { type: "zoom"; delta: number }
    | { type: "reset" }
    | null;
  export function volumeKeyAction(key: string): VolumeKeyAction
  ```
  Mapeo:
  - `ArrowLeft` → `{rotate, dx: 0, dy: -0.1}`; `ArrowRight` → `dy: 0.1`;
  - `ArrowUp` → `dx: -0.1`; `ArrowDown` → `dx: 0.1`;
  - `+` y `=` → `{zoom, delta: -0.1}`; `-` → `{zoom, delta: 0.1}`;
  - `0` → `{reset}`; cualquier otra tecla → `null`.
- Produces, en `volumeClient.ts`: `export function volumeErrorMessage(status: number, detail?: string): string`.
  - `503` → `"El volumen 3D no está disponible en este entorno."`;
  - `429` → `"Hay otros volúmenes en preparación. Intenta de nuevo en unos minutos."`;
  - `404` → `"No se encontró el volumen de este estudio."`;
  - cualquier otro → `` `No se pudo preparar el volumen (${status}).` ``.
  - **Nunca** devuelve `detail` del servidor.

- [ ] **Step 1: Escribir las pruebas que fallan.** `volumeKeys.test.ts` cubre cada tecla del mapeo y `"a"` → `null`. `volumeClient.test.ts` cubre los cuatro casos de `volumeErrorMessage` y verifica que un 503 con `detail: "Inicie el servicio local PyTorch/MONAI en el puerto 8001"` **no** incluye `"8001"`.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3: Implementar.** `requestJson` en `volumeClient.ts` usa `volumeErrorMessage(response.status)` en lugar de `error.detail`. En `VolumeViewer3D.tsx`:
  - estado inicial `viewMode` = `"anatomy"` (línea 74);
  - el contenedor del lienzo recibe `tabIndex={0}` y `onKeyDown`, que aplica `volumeKeyAction`: la rotación suma a `rotation.current`, el zoom ajusta `camera.position.z` con el mismo `clamp(…, 0.9, 4)` de `onWheel` y `reset` llama a `resetView`; si la acción no es `null`, `preventDefault()`;
  - se amplía el `aria-label` del contenedor: `"Volumen torácico 3D; arrastre o use las flechas para rotar, + y − para ampliar, 0 para restablecer"`;
  - con `window.matchMedia("(prefers-reduced-motion: reduce)").matches`, el botón "Simular respiración" queda `disabled` con `title="Desactivado por la preferencia de movimiento reducido"`;
  - los `accent-[#D4004F]` de los deslizadores pasan a `accent-sky-400`.
- [ ] **Step 4: Verificación manual.** Ejecutar `npx next build && npx next start -p 3107` y abrir `/demo/pulmon-3d` en un navegador con GPU (también en un portátil con gráfica integrada y en un móvil). Comprobar que la vista inicial es "Anatomía", que las flechas rotan con el lienzo enfocado y que no hay errores en la consola. Anotar el resultado en el commit.
- [ ] **Step 5:** Correr `npx vitest run` y `npx tsc --noEmit`. Esperado: PASS.
- [ ] **Step 6: Commit.** `fix(web): visor 3D inicia en anatomía, navegable con teclado y con mensajes de error para el usuario`

---

### Task 9: Subtipo histológico solo con riesgo y sin aparentar validación

Resuelve C7.

**Files:**
- Modify: `apps/web/src/components/informe/HistologicalSubtypeCard.tsx`, `HistologicalSubtypeCard.test.tsx`
- Modify: `apps/web/src/app/platform/uploads/[id]/informe/page.tsx`

**Interfaces:**
- Consumes: `RiskLevel` y `asRiskLevel` de `@/components/ui/RiskBadge`.
- Produces: nueva prop obligatoria `riskLevel: RiskLevel | null` en `HistologicalSubtypeCard`.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - Con `data` y `riskLevel="BAJO"` (o `null`) solo se ve el texto alternativo; no aparece `data.prediccion`.
  - Con `riskLevel="ALTO"` aparece `"94.2% probabilidad del modelo"` y **no** aparece `"Confianza"`.
  - Siempre que se muestra el subtipo, aparece el aviso exacto `"Clasificador entrenado con el dataset CLID; no se ha validado en LIDC-IDRI ni en tomografías de esta plataforma."`.
  - El HTML no contiene `emerald`.
  - Actualizar las tres pruebas existentes a la nueva prop.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3: Implementar.** Las prioridades: se muestra si `riskLevel` es `MEDIO` o `ALTO`; badge neutro `bg-slate-100 text-slate-800 border-slate-200`; aviso arriba de la distribución. En `informe/page.tsx` se pasa `riskLevel={asRiskLevel(upload.ai_risk_level)}`.
- [ ] **Step 4:** Correr `npx vitest run src/components/informe` y `npx tsc --noEmit`. Esperado: PASS.
- [ ] **Step 5: Commit.** `fix(web): mostrar el subtipo histológico solo con riesgo medio o alto y advertir que no está validado`

---

### Task 10: Página del modelo sin afirmar más de lo que hay

Resuelve C10 y la sección 4.3 de la revisión.

**Files:**
- Create: `apps/web/src/components/modelo/IllustrativeNote.tsx`, `apps/web/src/components/modelo/modelData.test.ts`
- Modify: `apps/web/src/components/modelo/modelData.ts`, `AccuracyChart.tsx`, `ROCCurve.tsx`, `RiskDistributionChart.tsx`, `ScoreDistribution.tsx`, `ArchitecturePipeline.tsx:66,188`
- Modify: `apps/web/src/app/platform/modelo/page.tsx:106,150`

**Interfaces:**
- Produces, en `modelData.ts`:
  ```ts
  export const MODEL_STATUS = { servingVersion: "multimodal-v1.2", documentedVersion: "multimodal-v2.0-densenet", documentedInProduction: false } as const;
  export const TEST_COHORT = { samples: 357, patients: 56 } as const;
  ```
- Produces: `IllustrativeNote()`, que renderiza `<p className="text-xs text-slate-500">Gráfica ilustrativa: no se reconstruyó a partir de las predicciones del conjunto de prueba.</p>`.

- [ ] **Step 1: Escribir las pruebas que fallan** en `modelData.test.ts`:
  - `CONFUSION_MATRIX` suma `TEST_COHORT.samples`;
  - `MODEL_METRICS.testCases === "357 muestras (56 pacientes)"`;
  - `MODEL_METRICS.explainability` no contiene `"128×128"`;
  - `MODEL_STATUS.documentedInProduction === false`.
- [ ] **Step 2:** Correr. Esperado: FAIL.
- [ ] **Step 3: Implementar.**
  - `MODEL_METRICS.testCases = "357 muestras (56 pacientes)"`.
  - `MODEL_METRICS.explainability = "HiResCAM (capas nativas 4×4 y 2×2, interpoladas)"`.
  - Los comentarios `Verified Patient-Level Test Set` y `357 Patient Cases` pasan a `valores del reporte metrics_v2_report.json` y `puntos ilustrativos`.
  - `IllustrativeNote` va al pie de los cuatro gráficos. En `ROCCurve`, la nota agrega: `El AUC de 0,9684 proviene del reporte; los puntos dibujados son aproximados.`.
  - En `page.tsx`: al inicio, `<AlertBanner variant="info" title="Modelo documentado aún no está en producción" description="Esta página describe OncoScan 2.0 (multimodal-v2.0-densenet). Los análisis de la plataforma los responde multimodal-v1.2." />`, que se muestra solo si `!MODEL_STATUS.documentedInProduction`.
  - Línea 106: reemplazar `HiResCAM 128×128` por `HiResCAM`.
  - Línea 150: `Los 357 casos ...` → `Las 357 muestras del conjunto de prueba provienen de 56 pacientes que no se usaron en entrenamiento ni validación.` (se quita "garantizando generalización real en clínica").
  - `ArchitecturePipeline.tsx:66` → `HiResCAM a nivel de elemento`; `:188` → `Separación a nivel paciente (357 muestras de 56 pacientes)`.
  - Quitar el import sin usar `Sparkles`.
- [ ] **Step 4:** Correr `npx vitest run`, `npx tsc --noEmit` y `npx eslint src/components/modelo src/app/platform/modelo`. Esperado: PASS, 0 warnings.
- [ ] **Step 5: Commit.** `fix(web): aclarar en la página del modelo qué está en producción y qué gráficas son ilustrativas`

---

### Task 11: Limpieza del repositorio, documentación y verificación final

Resuelve M2, M4 y M14, y cierra la integración.

**Files:**
- Delete: `.agents/` (completo)
- Delete: duplicados en `samples/`. Conservar `samples/volume-rendering-v2/` y `samples/real-lung/` (este último lo verifica el inventario); borrar `samples/corte_axial_caso04.png`, `samples/corte_axial_caso05.jpg`, `samples/dicom_multicorte_serie_caso02.zip`, `samples/dicom_unitario_caso01.dcm` y `samples/volumen_toracico_caso03.nii.gz`
- Modify: `samples/README.md`, `scripts/create_test_samples.py` (ruta de salida por defecto → `samples/volume-rendering-v2/`)
- Modify: `docs/HANDOFF-2026-10-22.md:163-164`
- Modify: `docs/volume-rendering/PRODUCCION.md` (sección 3, fila `HF_API_BASE_URL`)
- Create: `docs/volume-rendering/INTEGRACION-2026-10-23.md`

- [ ] **Step 1: Confirmar que nada depende de lo que se borra.** Ejecutar `git grep -n "\.agents\|samples/dicom_unitario_caso01\|samples/corte_axial\|samples/dicom_multicorte\|samples/volumen_toracico" -- ':!docs/volume-rendering/handoff-2026-10-22'`. Ajustar cada referencia que aparezca a `samples/volume-rendering-v2/...`.
- [ ] **Step 2:** `git rm -r .agents` y los cinco archivos de `samples/`. Actualizar `samples/README.md` y la ruta de salida de `create_test_samples.py`.
- [ ] **Step 3: Corregir los textos.**
  - `HANDOFF-2026-10-22.md` líneas 163–164: `Ejecución asistida de hoy` → `Ejecución del 22 de octubre (ML/IA)`.
  - `PRODUCCION.md`: la fila de `HF_API_BASE_URL` aclara que con Oracle v1.2 se deja la URL de Oracle y `AI_INPUT_MODE=png`, y que `source` solo aplica con el worker v2 en la misma máquina.
- [ ] **Step 4: Escribir `INTEGRACION-2026-10-23.md`** (máximo una página):
  - qué cambió respecto de la entrega del 22 de octubre;
  - variables nuevas: `AI_INPUT_MODE` (API) y `NEXT_PUBLIC_VOLUME_3D_ENABLED` (web), con sus valores en producción (`png`, `false`) y en local (`source`, `true`);
  - que `scripts/verify_volume_handoff.py` reportará diferencias esperadas en los archivos tocados;
  - la tabla "Fuera de alcance" de este plan.
- [ ] **Step 5: Verificación final.** Comandos y resultados esperados:
  - en `apps/api`: `.venv/Scripts/python.exe -m pytest -q` → todo PASS;
  - en `apps/web`: `npm ci` → sin errores; `npx vitest run` → todo PASS; `npx tsc --noEmit` → sin errores; `npx eslint src` → 0 errores (solo el warning previo de `upload/page.tsx:117`);
  - `next build` con variables ficticias → compila y aparece `/demo/pulmon-3d`;
  - `git status --short` → limpio, sin `apps/api/scripts/`.
- [ ] **Step 6: Prueba manual con producción simulada.** API local con `HF_API_BASE_URL=https://oncoscan-ai.duckdns.org` y sin `AI_INPUT_MODE`; web sin la bandera 3D. Subir y analizar `samples/volume-rendering-v2/dicom_unitario_caso01.dcm` y una imagen PNG. Esperado: análisis correcto con mapa, sin pestañas y sin badge de lóbulo. Si Mateo no autoriza usar el servidor real, dejar este paso para él y anotarlo.
- [ ] **Step 7: Revisiones del proyecto.** Correr `/oncoscan-clinical-review` sobre `apps/web/src/components/dicom` y `apps/web/src/components/informe`, y `/oncoscan-a11y` sobre `StudyViewerTabs.tsx` y `VolumeViewer3D.tsx`. Corregir lo crítico en esta tarea; lo demás se anota en `INTEGRACION-2026-10-23.md`.
- [ ] **Step 8: Commit.** `chore: retirar herramientas ajenas y muestras duplicadas, y documentar la integración del volumen 3D`
