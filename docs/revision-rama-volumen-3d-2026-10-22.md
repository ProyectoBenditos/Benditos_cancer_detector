# Revisión de la rama `feat/volumen-3d-handoff-2026-10-22`

**Fecha:** 22 de octubre de 2026
**Rama revisada:** `origin/feat/volumen-3d-handoff-2026-10-22`, commit `a17daa2` (Luis Daniel)
**Comparada contra:** `main` en `645e676`
**Alcance:** revisión sin fusionar y sin editar código. Las rutas y líneas citadas son las de la rama, salvo que se indique lo contrario.

---

## 1. Veredicto

La rama trae un trabajo técnico serio: el visor 3D con WebGL2, la segmentación lobar con MONAI, el mapa de calor HiResCAM sobre el volumen y la carga de series DICOM en ZIP y de NIfTI. Además viene bien documentada y es honesta sobre sus límites.

**No se puede fusionar a `main` tal como está.** Hay tres razones:

1. **Rompería el análisis en producción.** Cambia el contrato con el servidor de IA: ahora envía el archivo crudo en lugar del PNG y por defecto apunta a `localhost`. El servidor Oracle (v1.2) no está preparado para eso.
2. **Depende de una GPU y de un worker local** que no existen en Render ni en Oracle. Eso choca con la restricción de presupuesto cero (R1) y con la de *zero retention* del plan (sección 7.5).
3. **No instala limpio.** Falta `nibabel` en `requirements.txt` y el `package-lock.json` de la web está desincronizado.

Hay partes que sí valen la pena y se pueden traer por separado: el modelo v2 en 2D, la ventana pulmonar en HU, la carga de series y la página de demostración (ver la sección 7).

---

## 2. ¿Se hizo sobre nuestros cambios?

**Sí.** El ancestro común de la rama y `main` es `645e676`, que es justo el `HEAD` actual de `main`. La rama ya contiene todo lo nuestro:

- Fases A, B y C del visor (PR #18, `feat/visor-fase-b`, `feat/visor-fase-c`).
- `fix/panel-sin-resultado-ia`, `fix/menu-movil` y `fix/movil-desbordes`.
- El commit de documentación del modelo v2 (`645e676`).

Se fusionaría sin conflictos de Git. Tampoco toca nuestros archivos de las fases A–C:

| Archivo nuestro | ¿Lo modifica? |
|---|---|
| `components/ui/BeforeAfterViewer.tsx` y subcomponentes del visor | No |
| `uploads/[id]/actions.ts` (server actions de marcadores) | No |
| `supabase/migrations/20261021120000_upload_annotations.sql` | No |
| `apps/web/src/lib/*` | No |

Lo que sí hace es **envolver** nuestro visor en un componente nuevo, `components/dicom/StudyViewerTabs.tsx`, con dos pestañas: "Corte axial y activación" (nuestro `BeforeAfterViewer`) y "Gemelo Digital 3D". Las props de marcadores (`annotations`) siguen pasando completas, así que el guardado de marcadores sigue funcionando, también desde la pantalla de subida.

Cambios colaterales sobre lo nuestro:

- En `uploads/[id]/page.tsx` quitó la nota con la referencia a Grad-CAM (`SourceLink` a Selvaraju et al., 2017) y la reemplazó por un texto propio sin fuente.
- En `upload/page.tsx` y en `uploads/[id]/page.tsx` quedó el import de `BeforeAfterViewer` sin usar (eslint lo marca como warning).

---

## 3. Qué se verificó

Todo se corrió en un worktree aparte. `main` no se tocó.

| Verificación | Resultado |
|---|---|
| `npm ci` en `apps/web` | ❌ **Falla.** `package.json` agrega `three@^0.186.1` y `@types/three@^0.186.0`, pero el `package-lock.json` no se actualizó (faltan `three`, `@types/three`, `fflate`, `meshoptimizer` y otros) |
| `npm install` + `vitest run` | ✅ 226/226 pruebas, 25 archivos |
| `tsc --noEmit` | ✅ Sin errores |
| `eslint` sobre los archivos tocados | ✅ 0 errores, 4 warnings (imports sin usar: `BeforeAfterViewer` ×2, `Sparkles`; una dependencia de `useEffect`) |
| `next build` (con variables de entorno ficticias) | ✅ Compila. Crea la ruta estática `/demo/pulmon-3d` |
| `next start` + rutas | ✅ `/demo/pulmon-3d` responde 200 sin sesión, el manifiesto 200 y el atlas 200 (8,9 MB). `/platform/upload` sin sesión sigue redirigiendo a `/login` |
| Render del visor 3D en navegador sin GPU (Edge headless con SwiftShader) | ⚠️ La interfaz carga ("WebGL 2", "Ver pico · corte 118"), pero el lienzo queda negro. No es concluyente: la evidencia de Luis (`docs/volume-rendering/real-ct/heatmap-desktop.png`) sí muestra el volumen con GPU GTX 1650. Falta probarlo en equipos sin GPU dedicada (portátiles con gráfica integrada, móviles) |
| `pytest` en `apps/api` (venv actual, Python 3.14) | ❌ 39 pasan, 4 fallan y `test_volume_artifacts.py` no carga. **Todas las fallas son por `ModuleNotFoundError: nibabel`** |
| Worker ML (`local_ml_server.py`) | No ejecutable aquí: requiere los `.pth` privados, Python 3.11 con CUDA y el checkpoint MONAI. Se revisó solo el código |
| Datos de paciente en las muestras versionadas | ✅ Los DICOM de `samples/` traen nombres como `JARAMILLO^HERNAN DARIO` y cédulas `CC-…`, pero son **sintéticos**: los genera `scripts/create_test_samples.py` para probar la desidentificación. Los de `docs/modelo-v2-densenet/muestras_prueba/` usan IDs públicos de LIDC |

---

## 4. Impacto sobre `main` y producción si se fusionara

### 4.1 Análisis de estudios

- `apps/api/app/api/v1/routers/dicom.py:504`: el valor por defecto de `HF_API_BASE_URL` pasó de `https://oncoscan-ai.duckdns.org` a `http://127.0.0.1:8001`.
- `/predict` ahora recibe **el archivo original** (DICOM, ZIP o NIfTI) en vez del PNG convertido. Antes se convertía con `dicom_to_png_bytes`.
- En Render, `HF_API_BASE_URL` apunta a Oracle v1.2. Ese servidor espera una imagen PNG. Resultado probable:
  - `.dcm`: lo más probable es que falle o que el modelo reciba una entrada que no espera. No se probó contra el servidor real.
  - `.zip` / `.nii`: falla seguro con 502 ("El modelo no devolvió el corte canónico del volumen"), porque Oracle no devuelve `keyframe_base64`.
  - `.png` / `.jpg`: sigue funcionando.
- El análisis por lotes (`batch.py` → `services/hf_client.py`) **no** cambió y sigue enviando PNG a Oracle. Los dos flujos quedarían inconsistentes.

### 4.2 Pestaña 3D en producción

- Para series y NIfTI la pestaña 3D se abre **por defecto** y llama a `/api/v1/dicom/{id}/volume/prepare`.
- En Render, `LOCAL_ML_URL` solo acepta loopback (`volume.py`, `local_ml_base()`), así que el médico vería un 503 con el texto "Inicie el servicio local PyTorch/MONAI en el puerto 8001". Es un mensaje de desarrollador, no de producto.
- La pestaña 3D se ofrece también para PNG y DICOM de un solo corte, donde no puede funcionar.

### 4.3 Página del modelo (`/platform/modelo`)

- Pasa a mostrar las métricas de **v2.0** (DenseNet-121 + XGBoost: AUC 0,9684, sensibilidad 95,07 %), mientras producción sigue sirviendo **v1.2**. La plataforma describiría un modelo distinto del que responde.
- Los valores puntuales sí coinciden con `docs/modelo-v2-densenet/metrics_v2_report.json`. **Pero hay datos que no salen de ningún reporte:**
  - la curva de precisión por época;
  - los puntos de la curva ROC;
  - la distribución de riesgo (142/34/181);
  - el histograma de scores.

  El comentario los presenta como "Verified Patient-Level Test Set". Habría que generarlos desde los artefactos de entrenamiento o etiquetarlos como ilustrativos.
- `modelData.ts:161` dice "HiResCAM 128×128 (Subpixel…)". El propio handoff de Luis pide **no** describirlo así: las capas nativas son de 4×4 y 2×2 interpoladas.

### 4.4 Instalación y despliegue

- **Render:** sin `nibabel` en `requirements.txt`, subir un `.nii` termina en 500. Además, Render Free tiene disco efímero, así que la caché `.cache/` se pierde en cada reinicio.
- **Vercel:** usa `npm install`, así que probablemente compile igual. Aun así, el lockfile desincronizado hace que el build no sea reproducible.
- **Raíz del repo:** se agregan `pnpm-workspace.yaml` (con valores de relleno: `sharp: set this to true or false`) y un `package.json` generado por `npm init`. Hay que verificar que Vercel no cambie de gestor de paquetes por eso.
- **Storage:** Supabase Free limita cada archivo a 50 MB. Una serie de TC real en ZIP pesa entre 60 y 120 MB (lo dice el plan v2.0), así que la carga de series reales fallaría en Storage.

### 4.5 Base de datos

No requiere migraciones. Usa valores nuevos de `file_type` (`dicom_series`, `nifti_volume`), y la columna no tiene `CHECK` que los rechace. Guarda `subtipo_histologico`, `lobar_info` y `explicabilidad` dentro de `metadata_json`.

---

## 5. Impacto sobre nuestros planes

### 5.1 Decisión previa sobre el plan v2.0

El equipo había decidido dejar fuera `docs/plan-modelo-v2.0-segmentacion-volumetrica.md` porque choca con el plan semanal: GPU, MedGemma y datasets nuevos. Esta rama implementa buena parte de ese plan (volumen 3D, MONAI, visor volumétrico, respiración) y en `PRODUCCION.md` propone una VM con GPU (ejemplo: AWS `g4dn.2xlarge`, T4 de 16 GB).

**Hay que decidir explícitamente en equipo si se retoma ese alcance y con qué presupuesto.** Hoy contradice:

| Restricción del plan semanal (sección 7.5) | Qué hace la rama |
|---|---|
| R1: servidor de IA sin GPU (Oracle ARM Always Free) | El flujo 3D requiere GPU CUDA; la ruta por CPU no está medida |
| *Zero retention*: procesar sin guardar y conservar solo resultados | Guarda el ZIP o NIfTI completo en Supabase Storage y los derivados (`.cache/volumes`, `.cache/lung-masks`) en disco, sin política de borrado |
| Límite de almacenamiento de Supabase Free | Series de 60–120 MB por estudio |

### 5.2 Sección 7.4: hoja de ruta de modelos 3D

- **Punto 3 (serie DICOM completa + detector MONAI de nódulos):** la rama resuelve la **carga** de la serie, pero el modelo MONAI que integra es **segmentación lobar** (SegResNet), no **detección de nódulos** (RetinaNet). Lo más valioso de ese punto, que es la ubicación y el diámetro del nódulo, sigue pendiente.
- **Punto 4 (hallazgos incidentales):** la máscara lobar de MONAI es justo lo que hace falta para el **índice de enfisema** (% de vóxeles < −950 HU dentro del pulmón). Es una buena oportunidad derivada de este trabajo.

### 5.3 Visor, sección 10

| Fase | Impacto |
|---|---|
| **D. Lectura ciega y modo práctica** (la siguiente) | **Hay que rediseñarla con la pestaña 3D en cuenta.** Hoy el visor 3D abre en modo "Mapa de calor" (`VolumeViewer3D.tsx:74`), y `StudyViewerTabs` muestra el subtipo histológico y el lóbulo **encima** del visor antes de que el médico lea. Eso contradice la lectura ciega: la IA debe quedar oculta en las dos pestañas hasta registrar la impresión inicial |
| **E. Visor DICOM real (Cornerstone3D)** | **Se solapa.** La rama hizo un render volumétrico propio con Three.js y deja como pendiente "MPR real, cursores sincronizados". Hay que decidir si el 3D de Three.js se queda como vista de exploración y Cornerstone3D se usa para lectura diagnóstica (MPR, WW/WL real, `LengthTool`), o si se continúa todo sobre Three.js |
| **Marcadores (fases B y C)** | Las coordenadas se guardan normalizadas sobre la imagen 2D. En una serie, la imagen 2D es el **corte central** (`runtime.py:121`), así que el marcador no sabe a qué corte pertenece. Si se adoptan series, `upload_annotations` necesita una columna `slice_index` (o `z`), y el visor necesita poder navegar entre cortes |
| **Herramienta Medir (`L`)** | **Se desbloquea en parte.** `volume_metadata.pixel_spacing` ya se extrae del DICOM, que es el requisito de la sección 10.5 para medir en mm sin inventar |

### 5.4 Modelo v1.2 → v2.0

El modelo v2 en 2D (DenseNet-121 + dominio LIDC + XGBoost + CLID) **no necesita GPU para inferir una sola imagen de 128×128**: se puede servir en CPU. Desplegar `runtime.predict()` en el servidor Oracle ARM es un paso intermedio realista que **sí respeta R1**:

1. El 2D v2 va a producción en Oracle.
2. El 3D queda como demostración local hasta que haya presupuesto de GPU.

Falta medir la latencia en ARM.

---

## 6. Hallazgos

Cada hallazgo indica archivo, problema y propuesta. Están ordenados por prioridad.

### 6.1 Arreglar: bloquean la fusión

| # | Dónde | Problema | Propuesta |
|---|---|---|---|
| A1 | `apps/api/app/api/v1/routers/dicom.py:504` y siguientes | Valor por defecto a `localhost` y envío del archivo crudo a `/predict`; rompe la compatibilidad con Oracle v1.2 | Mantener el contrato actual (PNG a Oracle) como camino por defecto. Usar el archivo crudo y `keyframe_base64` solo si el servidor declara soporte, por ejemplo con un campo `capabilities` en `/health` o una variable `AI_CONTRACT=v2` |
| A2 | `apps/api/requirements.txt` | Faltan `nibabel` y `scipy`; `numpy==1.26.4` no instala en Python 3.14 | Declarar `nibabel==5.3.2` y `scipy==1.15.3`. Fijar una sola versión de Python para la API (Render usa la que indique `runtime.txt` o `.python-version`). Regenerar el archivo con `-Encoding utf8` si se hace desde PowerShell |
| A3 | `apps/web/package-lock.json` | Desincronizado con `package.json` (`three`, `@types/three`) | Ejecutar `npm install` en `apps/web` y versionar el lockfile. `@types/three` debería ir en `devDependencies` |
| A4 | `dicom.py:191` (`zf.read(fname)`) | Sin límite de tamaño descomprimido ni de número de entradas. Un ZIP bomba agota la memoria del backend. El límite de 1,5 GB solo está en el worker (`ct_volume.py`), no en la subida | Antes de leer, sumar `ZipInfo.file_size` y rechazar si pasa de un tope (por ejemplo 500 MB o 1.000 entradas). Leer por `SeriesInstanceUID` y rechazar series mezcladas |
| A5 | `upload/page.tsx:551`, `uploads/[id]/page.tsx:257` | `lobarLocation \|\| "LSI"`: si no hay lóbulo, muestra "Lóbulo: LSI" como dato real. El runtime **siempre** devuelve `lobar_info: None` (`runtime.py:166`), así que casi todos los estudios dirían LSI | Si no hay lóbulo, no mostrar el badge (o mostrar "Lóbulo no determinado"). Nunca inventar una ubicación |
| A6 | `StudyViewerTabs.tsx` | La pestaña 3D se ofrece para PNG y DICOM de un corte, y en producción expone el mensaje "Inicie el servicio local…" | Mostrar la pestaña 3D solo para `dicom_series` y `nifti_volume`, y solo si el backend confirma que el worker está disponible (por ejemplo, un flag en `/api/v1/health`). Cambiar los textos de error a lenguaje de producto |

### 6.2 Cambiar: seguridad clínica y PHI (reglas del `CLAUDE.md`)

| # | Dónde | Problema | Propuesta |
|---|---|---|---|
| C1 | `dicom.py:329` y `dicom.py:434` | Los NIfTI **no se desidentifican**: se guardan tal cual. Aun así, se registra una auditoría con `"Sin PHI en cabecera"` y `zero_retention_verified: True`. La cabecera NIfTI (`descrip`, `aux_file`, `db_name`) puede traer datos del paciente | Limpiar esos campos al subir y registrar en la auditoría lo que realmente se hizo. No afirmar *zero retention* cuando el archivo queda en Storage |
| C2 | `dicom.py:613` | `log_event("signed_url_failed", error=str(e))`: el mensaje puede incluir la ruta de Storage (PHI). Antes solo se registraba `error_type` | Volver a `error_type=type(e).__name__` |
| C3 | `dicom.py:635` | Se quitó el manejo específico de `TimeoutException` (504) y `HTTPStatusError` (502). Todo cae en un 500 que devuelve `str(e)` al cliente y lo guarda en `ai_error` | Restaurar los `except` específicos de `main`. No devolver `str(e)` al cliente |
| C4 | `dicom.py` (análisis) | Se eliminó `log_event("dicom_analysis_completed", …)`; se pierde trazabilidad del tiempo de inferencia y de la versión del modelo | Restaurarlo |
| C5 | `apps/api/local_ml_server.py:83` | El estado de error del job devuelve `str(error)` y la API lo reenvía al navegador; puede contener rutas o nombres de archivo | Devolver un mensaje genérico y dejar el detalle solo en el log local |
| C6 | `runtime.py:121` | En series y NIfTI, el score de **todo el estudio** sale del **corte central**, sin relación con dónde está el nódulo | Mostrarlo explícitamente en la interfaz ("análisis sobre el corte N de M") o dejar que el médico elija el corte. Lo correcto a mediano plazo es el detector de nódulos (sección 5.2) |
| C7 | `StudyViewerTabs.tsx`, `HistologicalSubtypeCard.tsx:61` | El subtipo CLID se muestra siempre, incluso con riesgo BAJO, en verde y como "% Confianza". Puede decir "Normal" con un score ALTO, o "Adenocarcinoma" con uno BAJO. Además, CLID se entrenó con otro dataset (cambio de dominio frente a LIDC y a las TC de usuarios) | Mostrar el subtipo solo si el riesgo es MEDIO o ALTO, con color neutro, sin la palabra "Confianza" y con la advertencia de cambio de dominio. Pasarlo por `/oncoscan-clinical-review` |
| C8 | Evidencia `docs/volume-rendering/real-ct/heatmap-desktop.png` | En la TC pública CTChest el calor aparece como **bandas horizontales** en vértices y bases. Es el síntoma "Calor en bandas" de la tabla de problemas del handoff. Es lo esperable al pasar por cada corte de 512×512 un modelo entrenado con recortes de nódulo de 128 px y las mismas variables clínicas | No usar esta vista con médicos sin explicar que el mapa no localiza lesiones. Considerar no mostrar el modo calor por defecto (ver D en 5.3) |
| C9 | `uploads/[id]/page.tsx` | Se perdió la cita a Grad-CAM (`SourceLink`) | Mantener la referencia, ahora a HiResCAM (Draelos & Carin, 2020), con su enlace |
| C10 | `modelData.ts` | Curvas y distribuciones sin respaldo en reportes, presentadas como verificadas, y la descripción "128×128" de HiResCAM | Ver 4.3 |

### 6.3 Mejorar: calidad del código y del repositorio

| # | Dónde | Problema | Propuesta |
|---|---|---|---|
| M1 | Commit `a17daa2` | Un solo commit de 172 archivos (+13.569/−572) que mezcla funcionalidad, documentación, muestras y herramientas. No sigue la convención `tipo: descripción` por cambio | Dividirlo en PRs: (1) dependencias y lockfiles, (2) ventana HU y carga de series, (3) modelo v2 2D, (4) visor 3D y demo, (5) documentación |
| M2 | `.agents/skills/` (~80 archivos) | Herramientas de agentes (incluye `agents/openai.yaml`) ajenas a la aplicación | Sacarlas del repo o moverlas a un repo personal |
| M3 | Raíz: `find_data.py`, `package.json`, `pnpm-workspace.yaml` | Archivos de trabajo local o de relleno | Eliminarlos. Si se quiere pnpm, decidirlo en equipo con un solo lockfile |
| M4 | `samples/` y `samples/volume-rendering-v2/` | Muestras casi duplicadas (unos 8 MB) | Dejar una sola versión |
| M5 | `apps/web/public/demo/lung-ct/atlas.png` (8,9 MB) | Pesa en cada clon y en Vercel; la página de demo lo descarga entero | Valorar WebP/KTX2 o un atlas de menor resolución para móvil |
| M6 | `dicom.py:639` y `dicom.py:680` (`GET /dicom/{id}/volume`, `GET /dicom/{id}/atlas`) | Código muerto: el frontend no los usa. `/atlas` hace trabajo pesado de CPU de forma síncrona dentro de un `async` (bloquea el event loop) y cualquier usuario puede dispararlo con `slice_size` hasta 512 | Eliminarlos o moverlos a `run_in_threadpool` con límites |
| M7 | `volume.py:67` | `supabase.storage.download()` síncrono dentro de un `async`; descarga y reenvía el estudio completo en cada `/prepare`, aunque ya esté en caché | Consultar primero el estado por `study_key` y descargar solo si no existe. Usar `run_in_threadpool` |
| M8 | `analysis.py:294` | `except Exception: pass` al leer `metadata_json`, sin capturar `error` de la consulta (regla aprendida en Sub-proyecto E) | Capturar y registrar el tipo de error |
| M9 | `runtime.py` | Carga código ejecutable desde `docs/modelo-v2-densenet/entrenamiento_e_inferencia_v2.py` | Mover la arquitectura a `apps/api/app/ml/` y dejar en `docs/` solo la documentación |
| M10 | `dicom.py:30` | `.gz` está permitido como extensión, así que un `.tar.gz` pasa como NIfTI | Validar la doble extensión `.nii.gz` |
| M11 | `upload/page.tsx` | `fileType` se deduce del nombre del archivo en el cliente | Usar el `file_type` que devuelve el backend en la respuesta de subida |
| M12 | Upload | El aviso dice "Tamaño máximo: 50MB", pero no hay validación previa en el cliente ni en el backend para ZIP/NIfTI | Validar el tamaño antes de subir y mostrar un error claro |
| M13 | Varios | 4 warnings de eslint (imports sin usar) | Limpiarlos |
| M14 | Documentación | `HANDOFF-2026-10-22.md` (líneas 163–164) dice "Ejecución asistida de hoy". Según la convención del equipo, los artefactos se redactan como obra del equipo o del rol responsable | Reemplazar por "Ejecución del 22 de octubre (ML/IA)" o similar |

### 6.4 Mejorar: diseño y accesibilidad

Pendiente de pasar `/oncoscan-a11y` y `/oncoscan-frontend-design` sobre `StudyViewerTabs` y `VolumeViewer3D`. Lo observado:

| # | Dónde | Problema | Propuesta |
|---|---|---|---|
| D1 | `StudyViewerTabs.tsx:78` y `:81` | Usa `brand-danger` para el icono y el badge "Raymarching 3D". Ese token está reservado para alertas clínicas | Usar `brand-primary` (o `sky-300` en tema oscuro) |
| D2 | `StudyViewerTabs.tsx` | Las pestañas son botones sueltos, sin `role="tablist"`, `role="tab"` ni `aria-selected`, y no se recorren con flechas | Aplicar el patrón ARIA de pestañas, igual que hicimos con el radiogroup en la fase B |
| D3 | `VolumeViewer3D.tsx` | La rotación solo funciona arrastrando; no hay teclado para rotar ni hacer zoom. No respeta `prefers-reduced-motion` en la animación de respiración | Agregar flechas, `+` y `-` cuando el lienzo tenga foco; respetar `prefers-reduced-motion` |
| D4 | `VolumeViewer3D.tsx` | Los deslizadores del calor usan el acento `#D4004F` (el color de alerta) | Igual que D1 |
| D5 | Textos | "Gemelo Digital 3D", "Raymarching 3D", "Cargando motor de Raymarching 3D (WebGL)…" son jerga técnica o de marketing para un médico | Algo como "Volumen 3D" y "Preparando el volumen…" |
| D6 | Pestaña 3D | No tiene el panel del caso, los marcadores ni el aviso clínico dentro de la pantalla completa, como sí los tiene nuestro visor 2D (fase B, problema 3) | Unificar la pantalla completa: en la Fase D, el panel del caso debería acompañar a las dos pestañas |

### 6.5 Añadir

1. **Contrato versionado con el servidor de IA:** `/health` debería informar `model_version` y capacidades (`accepts_raw_dicom`, `returns_keyframe`). El backend elige el camino según eso, sin depender de variables de entorno sueltas.
2. **Pruebas de regresión del contrato con Oracle v1.2:** un test que garantice que, sin capacidades v2, `analyze_dicom` sigue enviando PNG.
3. **Política de retención** para `dicom_series` y `nifti_volume` en Storage y para `.cache/` (borrado en cascada al eliminar el estudio), coherente con la sección 7.5.
4. **`slice_index` en `upload_annotations`** si se adoptan series (ver 5.3).
5. **Índice de enfisema** con la máscara lobar (sección 7.4, punto 4); sale casi gratis de este trabajo.
6. **Desidentificación de NIfTI** y prueba que la verifique (ver C1).
7. **Prueba E2E de aislamiento entre dos usuarios** en `/volume/*`, ya listada como P0 en el handoff.

---

## 7. Camino propuesto

La idea es no perder el trabajo de Luis sin comprometer producción ni el plan acordado.

1. **No fusionar la rama completa.** Dejarla como referencia y conversarla con Luis.
2. **PR 1, sin riesgo:** lockfile, `requirements.txt` con `nibabel` y `scipy`, y limpieza (M2–M4, M13). Se puede fusionar ya.
3. **PR 2, carga de series:** ventana pulmonar en HU, ZIP con límites (A4) y desidentificación de NIfTI (C1), manteniendo el análisis por PNG hacia Oracle (A1).
4. **PR 3, modelo v2 en 2D:** desplegar `runtime.predict()` en Oracle ARM por CPU tras medir la latencia. Actualizar la página del modelo solo cuando v2 esté en producción, con datos respaldados (C10).
5. **PR 4, visor 3D:** detrás de una bandera, solo para series y solo si hay worker. Hacer antes la Fase D y decidir la Fase E (Three.js frente a Cornerstone3D).
6. **Decisión de equipo:** ¿se retoma el alcance GPU del plan v2.0? Si sí, con qué presupuesto y proveedor. Si no, el 3D queda como demostración local para la sustentación.

---

## 8. Preguntas para Luis y el equipo

1. ¿El servidor Oracle se va a actualizar a v2? ¿Con qué contrato de `/predict`?
2. ¿Hay presupuesto para una GPU, o el 3D queda como demostración local?
3. ¿Qué evidencia respalda las curvas por época, la ROC y la distribución de riesgo de la página del modelo?
4. ¿CLID se evaluó sobre imágenes de LIDC o sobre TC fuera de su dataset? ¿Con qué resultado?
5. ¿El visor 3D se reemplaza más adelante con Cornerstone3D (Fase E), o se continúa con Three.js?
6. ¿Cómo y dónde se van a compartir los `.pth` privados?
