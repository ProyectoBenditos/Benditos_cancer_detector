# Integración del volumen 3D — 23 de octubre de 2026

Resumen de lo que cambió respecto de la entrega del 22 de octubre (rama `feat/volumen-3d-integracion`).

## Qué cambió

**API**
- Pines: `numpy==2.3.4`, `Pillow==11.3.0`, `scipy==1.16.3`, `nibabel==5.3.2`; lockfile sincronizado; archivos sueltos de la raíz retirados.
- Subida: clasificación por tipo (`.dcm`, `.zip`, `.nii`, `.nii.gz`, `.png`, `.jpg`); `.zip`, `.nii` y `.nii.gz` solo con `VOLUME_UPLOADS_ENABLED=true` (si no, 400, también al analizar), límite de 50 MB (413), ZIP revisado antes de descomprimir (1000 entradas, 300 MB, razón 100) y una sola serie CT.
- NIfTI: la cabecera se desidentifica antes de guardar (`descrip`, `aux_file`, `db_name`, `intent_name`, `data_type`, extensiones), gzip acotado a 300 MB; la auditoría registra lo borrado y `zero_retention_verified=False`.
- Contrato con la IA: por defecto `AI_INPUT_MODE=png` envía a Oracle v1.2 el mismo PNG min-max que `main` (corte central en series, NIfTI y multiframe); `source` solo para el worker v2 local. `model_version` recupera la semántica de `main`. La respuesta incluye `source_slice`.
- Errores tipificados de análisis (503/504/502/500) con mensajes fijos; los logs solo llevan `error_type` y hash.
- Endpoints de atlas retirados; la descarga de Storage ya no bloquea el event loop.

**Web**
- La pestaña 3D solo aparece para series/NIfTI y con `NEXT_PUBLIC_VOLUME_3D_ENABLED=true`; pestañas con ARIA; sin lóbulo inventado; texto «Análisis sobre el corte N de M».
- HiResCAM/Grad-CAM se citan según la versión del modelo; validación de tipo y tamaño en el cliente (`.zip` y NIfTI solo con la bandera 3D).
- Visor 3D: inicia en Anatomía, controles de teclado, `prefers-reduced-motion` y mensajes de error de producto.
- Subtipo histológico solo con riesgo MEDIO/ALTO y con advertencia de dominio; la página del modelo aclara qué está en producción y qué gráficas son ilustrativas.

**Repositorio**: se retiran `.agents/` y las muestras duplicadas de `samples/` (quedan `samples/volume-rendering-v2/` y `samples/real-lung/`); el generador escribe por defecto en `samples/volume-rendering-v2/`.

## Variables nuevas

| Variable | Dónde | Producción | Local |
|---|---|---|---|
| `AI_INPUT_MODE` | API (Render) | sin definir o `png` | `source` (con el worker v2) |
| `NEXT_PUBLIC_VOLUME_3D_ENABLED` | Web (Vercel) | sin definir o `false` | `true` |
| `VOLUME_UPLOADS_ENABLED` | API (Render) | sin definir o `false` | `true` |

## Verificador de la entrega

`scripts/verify_volume_handoff.py` reportará diferencias esperadas en los archivos tocados por esta integración. `docs/volume-rendering/handoff-2026-10-22/run-manifest.json` no se modifica: es el registro de la entrega original.

## Fuera de alcance

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
| Acotar memoria de carga y análisis de volúmenes (parche de cabecera NIfTI sin decodificar vóxeles, lectura del corte central, `stop_before_pixels` en series, topes medidos contra la RAM de Render) antes de habilitar `VOLUME_UPLOADS_ENABLED` en producción | Hoy un NIfTI ocupa ~9,5 veces su tamaño en RAM y un ZIP ~2,7 veces; Render Free tiene 512 MB |

## Pendiente (manual)

- Prueba contra el servidor real `https://oncoscan-ai.duckdns.org` (API local con `HF_API_BASE_URL` de Oracle y sin `AI_INPUT_MODE`; web sin la bandera 3D): analizar `samples/volume-rendering-v2/dicom_unitario_caso01.dcm` y un PNG. Esperado: análisis con mapa, sin pestañas y sin insignia de lóbulo. No se ejecutó por falta de autorización para usar el servidor real.
- Revisión visual del visor 3D en un escritorio con GPU, un portátil con GPU integrada y un teléfono móvil.
- Medir memoria subiendo un NIfTI y un ZIP reales de ~50 MB antes de habilitar `VOLUME_UPLOADS_ENABLED`.
- Confirmar variables en Render (`AI_INPUT_MODE` sin definir o `png`; `VOLUME_UPLOADS_ENABLED` sin definir o `false`) y en Vercel (`NEXT_PUBLIC_VOLUME_3D_ENABLED` sin definir o `false`).

## Hallazgos no críticos de las revisiones

Las revisiones clínica y de accesibilidad no encontraron hallazgos críticos. Quedan como mejoras:

- `VolumeViewer3D.tsx`: la pantalla completa es una superposición CSS sin cierre con Escape ni trampa de foco; hoy se sale con el botón «Salir de pantalla completa».
- `VolumeViewer3D.tsx`: el contenedor del lienzo usa `role="img"` con `tabIndex={0}` y teclado; un rol interactivo (`application` o `group`) describiría mejor su comportamiento.
- `VolumeViewer3D.tsx`: los botones de la barra de herramientas no definen un anillo de foco propio (usan el del navegador) y los iconos no llevan `aria-hidden`.
- `informe/LungLobeDiagram.tsx`: la insignia del lóbulo usa tonos rosa con `animate-ping`; conviene respetar `prefers-reduced-motion`.
- Pendientes previos sin tocar: 12 avisos de ESLint (imágenes `<img>`, importaciones sin usar en `ReportPrintControls.tsx`).
