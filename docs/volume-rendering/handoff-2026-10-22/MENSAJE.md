# Mensaje para el compañero

Te dejo el avance de OncoScan del 22 de octubre y la documentación para continuar.

La parte local ya reconstruye una TC real de 139 cortes, segmenta los cinco lóbulos con MONAI y muestra HiResCAM sobre el volumen 3D. Se están usando los pesos reales de los modelos. Pasaron 226 pruebas del frontend, 56 del backend y el build.

Empieza por `docs/HANDOFF-2026-10-22.md`. Ahí están los archivos, comandos, evidencias y pendientes ordenados. La arquitectura para llevarlo a producción está en `docs/volume-rendering/PRODUCCION.md`.

Continúa desde la rama `feat/volumen-3d-handoff-2026-10-22`. Obtén los pesos `.pth` por el canal privado del proyecto y reproduce el flujo en otro entorno. Después hay que montar staging con GPU, persistir la cola/resultados y probar el flujo autenticado completo. La opción que menos cambia el código es alojar API y worker juntos en la misma VM GPU; el frontend puede seguir en Vercel. Si conservamos la API en Render y separamos el worker, hay que implementar comunicación privada autenticada: el código actual solo acepta loopback.

La GTX 1650 se usa solo en desarrollo. En producción la reemplaza la GPU del servidor, sin volver a entrenar por ese cambio. Aún no se desplegó esta versión.

Ten presentes los límites: el calor explica el clasificador por corte, no es una máscara de tumor; los controles actuales recortan el volumen, no son MPR completo; la respiración es ilustrativa. MONAI Physio y la fase 4 siguen pendientes. No presentar las pruebas de funcionamiento como validación clínica.

La muestra local está en `http://localhost:3000/demo/pulmon-3d`. El inventario de entrega incluye hashes y un verificador para comprobar que recibiste los mismos archivos.

La vista 2D sigue en «Corte axial y activación»: se volvieron a comprobar 115 pruebas del visor/herramientas y una inferencia PNG real con mapa y superposición válidos; evidencia en `two-dimensional-check.json`.
