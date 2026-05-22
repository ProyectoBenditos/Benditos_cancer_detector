# Reasignación de issues huérfanos — OncoScan

Hallazgo H-010 de la auditoría 2026-05-22: 9 issues sin `assignee` (21.4% del backlog). Este documento registra el criterio aplicado a cada reasignación, según la matriz de roles confirmada por el equipo.

## Matriz de roles

| Persona | Rol |
|---------|-----|
| Mateo Salas | Frontend lead + integrador PSP |
| Lu Xury (Luis Daniel) | ML Engineer / IA |
| Nicolas Chavez Oliveros | Frontend dashboard + esquema BD |
| Juan Esteban Aldana | Backend / Arquitectura |
| Other_Sotelo | Project Manager / PSP coordinator |

## Resoluciones

| KAN | Resumen abreviado | Naturaleza | Assignee asignado | Justificación |
|-----|-------------------|------------|--------------------|---------------|
| KAN-4 | Entrega 1, planteamiento del proyecto | Entrega académica (PM) | Other_Sotelo | PMBOK / cronograma del curso corresponde al PM. |
| KAN-33 | Entrega 2 | Entrega académica (PM) | Other_Sotelo | Igual que KAN-4. |
| KAN-38 | Crear POST `/api/v1/dicom/analyze/{id}` HF→Supabase | Backend FastAPI | Juan Esteban Aldana | Endpoint del API Gateway, dominio backend. |
| KAN-39 | Aceptar `.dcm`/`.png`/`.jpg` en upload | Backend FastAPI | Juan Esteban Aldana | Toca `apps/api/app/api/v1/routers/dicom.py`. |
| KAN-40 | Sliders features clínicas pre-análisis | Frontend dashboard | Nicolas Chavez Oliveros | UI del dashboard de análisis. |
| KAN-41 | Mostrar score/nivel/recomendación con colores | Frontend alertas | Nicolas Chavez Oliveros | UI dependiente del módulo alertas. |
| KAN-42 | Columnas riesgo/score en historial DICOM | Frontend dashboard | Nicolas Chavez Oliveros | UI del historial. |
| KAN-43 | Mostrar resultado IA + parámetros + estado | Frontend dashboard | Nicolas Chavez Oliveros | UI del detalle de análisis. |
| KAN-44 | Dependencias para conversión DICOM → PNG | Backend Python | Juan Esteban Aldana | Toca `requirements.txt` y `apps/api/app/api/v1/routers/dicom.py`. |

## Reglas para futuros huérfanos

- Cualquier issue creado debe traer `assignee` en el mismo paso de creación. La auditoría volverá a flaggear si reaparecen huérfanos.
- Si un issue queda sin owner natural, se asigna a Other_Sotelo (PM) hasta que se reasigne en stand-up.
- La sección "Distribución de assignees" del próximo audit debe mostrar 0 issues sin asignar.
