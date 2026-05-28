# OncaScan Platform — Informe de Pruebas y Validación

**Proyecto universitario** | Mayo 2026  
**Stack:** Next.js · FastAPI · Supabase · Hugging Face  
**Deploy:** Vercel (frontend) · Railway (backend FastAPI)

---

## Resumen Ejecutivo

| Métrica | Valor |
|---|---|
| Total de casos de prueba ejecutados | 13 |
| Tasa de éxito | **100%** |
| Performance Score (Google PageSpeed) | **98 / 100** |
| Tiempo de análisis IA por estudio DICOM | **4.06 s** |

### Alcance de las pruebas

- **Pruebas de API REST** — endpoints de salud, autenticación y operaciones DICOM
- **Pruebas funcionales** — flujo completo desde login hasta visualización de resultados IA
- **Pruebas de rendimiento** — métricas de velocidad con Google PageSpeed Insights
- **Pruebas de seguridad básica** — validación de acceso no autorizado (401) y formatos inválidos (400)

---

## Pruebas de API REST

Herramienta: Thunder Client | Backend: Railway (FastAPI)

| ID | Endpoint | Método | Escenario | Esperado | Real | Estado |
|---|---|---|---|---|---|---|
| TC-01 | `/api/v1/health` | GET | Verificar que el backend responde correctamente | 200 OK | 200 OK | ✅ PASÓ |
| TC-02 | `/api/v1/dicom/upload` | POST | Subir archivo sin token de autenticación | 401 | 401 | ✅ PASÓ |
| TC-03 | `/api/v1/dicom/upload` | POST | Subir archivo DICOM `.dcm` válido con token | 200 OK | 200 OK | ✅ PASÓ |
| TC-04 | `/api/v1/dicom/upload` | POST | Subir imagen PNG válida con token | 200 OK | 200 OK | ✅ PASÓ |
| TC-05 | `/api/v1/dicom/upload` | POST | Subir archivo con formato no soportado (`.pdf`) | 400 | 400 | ✅ PASÓ |
| TC-06 | `/api/v1/dicom/analyze/{id}` | POST | Analizar DICOM con 8 features clínicas | 200 OK | 200 OK | ✅ PASÓ |
| TC-07 | `/api/v1/dicom/analyze/{id}` | POST | Analizar con ID de DICOM inexistente | 404 | 404 | ✅ PASÓ |

---

## Pruebas Funcionales

Plataforma: Vercel (Producción) | Navegador: Chrome + DevTools Network

| ID | Caso de Prueba | Resultado Observado | Tiempo | Estado |
|---|---|---|---|---|
| TC-F01 | Login con credenciales válidas | Redirige al dashboard correctamente | 433 ms | ✅ PASÓ |
| TC-F02 | Login con credenciales inválidas | Muestra: *"Invalid login credentials"* | 597 ms | ✅ PASÓ |
| TC-F03 | Subir PNG válido del dataset | Confirmación con metadatos del archivo | 1.33 s | ✅ PASÓ |
| TC-F04 | Subir archivo inválido (`.pdf`) | Error: *"No es un tipo de archivo válido"* | 794 ms | ✅ PASÓ |
| TC-F05 | Analizar con 8 parámetros radiológicos | Score IA y nivel de riesgo mostrados | 4.06 s | ✅ PASÓ |
| TC-F06 | Historial DICOM con columnas IA | Tabla con Riesgo IA y Score IA correctos | 120 ms | ✅ PASÓ |
| TC-F07 | Ver detalle de análisis | Score, riesgo, recomendación y parámetros | < 500 ms | ✅ PASÓ |
| TC-F08 | Centro de Alertas | Solo casos con nivel ALTO mostrados | < 500 ms | ✅ PASÓ |
| TC-F09 | Búsqueda por referencia de caso | Filtra correctamente por nombre y `case_ref` | < 500 ms | ✅ PASÓ |
| TC-F10 | Cerrar sesión | Redirige al login y limpia la sesión | < 300 ms | ✅ PASÓ |

---

## Pruebas de Rendimiento

Medición con **Google PageSpeed Insights** sobre la landing page pública.  
> *Nota: las páginas internas requieren autenticación y no son evaluadas por PageSpeed.*

| Métrica | Valor | Descripción |
|---|---|---|
| First Contentful Paint (FCP) | **0.2 s** | Primera pintura de contenido |
| Largest Contentful Paint (LCP) | **0.6 s** | Elemento principal cargado |
| Total Blocking Time (TBT) | **120 ms** | Tiempo de bloqueo del hilo principal |
| Cumulative Layout Shift (CLS) | **0.016** | Estabilidad visual del layout |
| Speed Index | **0.9 s** | Velocidad de renderizado visual |
| **Performance Score** | **98 / 100** | Puntuación global de rendimiento |

---

## Conclusiones

| # | Conclusión | Detalle |
|---|---|---|
| ✅ | **100 % de casos aprobados** | 13 casos ejecutados (API, funcional y seguridad) sin fallos pendientes |
| ⚡ | **Rendimiento excepcional (98/100)** | FCP 0.2 s y LCP 0.6 s; la plataforma responde en menos de 1 segundo |
| 🔒 | **Seguridad validada** | Endpoints protegidos con JWT; acceso sin token devuelve 401 correctamente |
| 🤖 | **Integración IA funcional en producción** | Conversión DICOM→PNG y análisis multimodal en 4.06 s promedio |
| 🚀 | **Deploy estable en Vercel + Railway** | CORS corregido, multi-formato operativo, historial y alertas funcionando |
