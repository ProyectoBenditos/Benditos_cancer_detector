# [ONCO-0] Fase 0 — MVP base de la plataforma OncoScan

**Tipo:** Epic
**Estado:** Done
**Sprint / Fase:** Fase 0 (foundational)
**Fecha de cierre:** 2026-05-08 (commit `dace374` marca el inicio del sub-proyecto A inmediatamente después)
**Labels:** `mvp`, `foundational`, `monorepo`, `dicom`, `ai`

---

## Summary

Construir el MVP funcional de extremo a extremo de la plataforma OncoScan: monorepo Next.js + FastAPI, autenticación con Supabase, subida y procesamiento de DICOM, integración con el modelo de IA en Hugging Face, y las páginas operativas básicas (dashboard, historial, alertas).

## Descripción

Esta fase deja la plataforma en un estado funcional mínimo: un médico puede iniciar sesión, subir un estudio DICOM, ejecutar el análisis IA (8 features clínicas + imagen), ver el resultado en un dashboard y revisar el historial de cargas. No hay todavía consistencia visual ni accesibilidad cerrada — eso es trabajo de sub-proyectos posteriores. El objetivo de Fase 0 es validar el camino feliz end-to-end con el equipo académico y los stakeholders clínicos.

## Alcance entregado

- **Monorepo**: `apps/web/` (Next.js 16 + React 19 + Tailwind 4) y `apps/api/` (FastAPI + Python 3.11).
- **Auth**: Supabase Auth con middleware Next.js que protege `/platform/*`.
- **Storage**: bucket Supabase para los archivos DICOM, con signed URLs server-side.
- **Base de datos**: tabla `dicom_uploads` con columnas para metadatos DICOM, score IA, nivel de riesgo y recomendación.
- **Integración IA**: proxy FastAPI hacia el HF Space `luisdam-oncoscan-ai` endpoint `/predict`, validación previa del DICOM, persistencia del `result_json`.
- **Páginas funcionales**:
  - `/login` (formulario de acceso).
  - `/platform` (dashboard con stats y CTAs).
  - `/platform/upload` (subir DICOM + features clínicas + analizar).
  - `/platform/uploads` (historial con búsqueda por `case_ref` u `original_name`).
  - `/platform/uploads/[id]` (detalle del estudio + resultado IA).
  - `/platform/analyze` y `/platform/analyze/[id]` (flujo de análisis con polling).
  - `/platform/alertas` (Centro de Alertas para riesgo ALTO).
- **CORS y deploy**: orígenes explícitos para Vercel (commit `9939e55`), preparado para producción académica.

## Criterios de aceptación

- [x] Login con Supabase Auth y redirección protegida a `/platform`.
- [x] Subida de archivo DICOM ≤ 50 MB con validación de modalidad CT.
- [x] Persistencia de `case_ref` opcional para identificar el estudio.
- [x] Análisis IA devuelve `score`, `nivel_riesgo` (ALTO/MEDIO/BAJO) y `recomendación`.
- [x] Historial filtrable por nombre o `case_ref`.
- [x] Centro de Alertas muestra estudios `ai_risk_level = "ALTO"`.
- [x] Tabla `dicom_uploads` poblándose desde el flujo real.
- [x] Backend deployable en producción con CORS correcto para Vercel.

## Fuera de scope (queda para sub-proyectos posteriores)

- Consistencia visual / design system (→ Sub-proyecto B).
- Accesibilidad WCAG (→ Sub-proyecto B).
- Workflow de Claude para asistir desarrollo (→ Sub-proyecto A).
- Refactor a Server Actions / error boundaries por ruta (→ Sub-proyecto C).
- Activación de PhantomButtons / PhantomLinks (→ Sub-proyecto C).
- Test suite automatizada (→ futuro).

## Commits representativos

- `bb0c019` Prueba 1 — implementación inicial de API y subida DICOM.
- `369842c` Dashboard + reporte de alertas.
- `34dc5c2` Case_Ref para nombrar análisis y permitir búsqueda.
- `2e1f2d7` Barra de búsqueda en historial DICOM.
- `371aa22` Merge de `ai-service` a `main` (integración con HF Space).
- `38f1566` Documentación técnica de la integración IA.
- `9939e55` CORS explícito para Vercel.

## Deuda técnica conocida al cierre

- Estilos inconsistentes: 4 estilos primarios de botón distintos, hex hardcoded en login y sidebar, `red-*` y `rose-*` mezclados con tokens `brand-*`.
- Sin componente `Button`, `AlertBanner` ni `RiskBadge` compartido (todo inline en páginas).
- `StatusBadge` no reconoce los estados reales `ai_completed` / `ai_failed`.
- Sin focus rings ni ARIA semántico para alertas clínicas.
- Sin workflow asistido por Claude (los commits eran completamente manuales).

→ Estos puntos motivan los sub-proyectos A y B.
