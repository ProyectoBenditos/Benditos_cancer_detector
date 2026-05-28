# Capturas de respaldo — Defensa OncoScan

Capturas estáticas para la demo. El laboratorio puede no tener internet estable —
estas imágenes permiten mostrar el flujo sin conexión.

## Capturas requeridas (mínimo 4, recomendado 6)

Guardar como PNG o JPG. Usar datos sintéticos (TEST-001, etc.). **No capturar emails personales ni datos de pacientes reales.**

| Archivo sugerido | Pantalla | Qué debe mostrar |
|-----------------|----------|-----------------|
| `01-login.png` | `/login` | Formulario de acceso |
| `02-signup-consent.png` | `/signup` | Checkbox de consentimiento con texto visible |
| `03-dashboard-admin.png` | `/platform` (admin) | Tarjeta "Médicos pendientes" con count ≥ 1 arriba del dashboard |
| `04-upload-disclaimer.png` | `/platform/upload` | Banner "No es dispositivo médico" visible y formulario de carga |
| `05-analisis-resultado.png` | `/platform/uploads/[id]` | Banner disclaimer + model_version + inference_time_ms + predicted_at visibles |
| `06-pacientes-busqueda.png` | `/platform/pacientes?q=TEST` | Input de búsqueda con resultados filtrados |

## Instrucciones

1. Tomar las capturas en el entorno staging con datos sintéticos.
2. Nombrar los archivos con el prefijo numérico para que mantengan el orden.
3. Resolución recomendada: 1280×800 px o superior.
4. Guardar en esta carpeta y commitear con el mensaje `docs(KAN-87): capturas de respaldo para defensa`.

## Nota sobre datos

Las capturas **no deben** mostrar:
- Emails reales de usuarios
- External IDs o aliases de pacientes reales
- Scores o resultados de análisis de pacientes reales
- URLs de Supabase Storage sin firmar

Usar cuentas y pacientes de prueba creados específicamente para la demo.

---

## Calentamiento del HF Space (hacer 5-10 min antes de la demo)

El modelo IA en Hugging Face Space `luisdam-oncoscan-ai` hace cold-start si no recibe tráfico. Para evitar que el jurado espere durante la demo:

1. **5-10 minutos antes** de comenzar la sustentación, subir un DICOM CT válido en staging y esperar que el análisis complete.
2. Anotar la hora exacta del calentamiento: \_\_\_\_\_\_\_\_\_\_\_\_
3. El Space permanece activo por aproximadamente 15-20 minutos tras el último request. Planificar la demo dentro de esa ventana.
4. Si el análisis tarda más de 60 segundos durante el calentamiento, esperar hasta que complete — es el cold-start normal del Space gratuito.
5. **Backup**: si el HF Space falla durante la demo, mostrar la captura `05-analisis-resultado.png` como evidencia del análisis previo.
