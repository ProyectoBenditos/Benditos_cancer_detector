# Fase D del visor: lectura ciega y modo práctica — Diseño

**Fecha:** 2026-10-27
**Origen:** sección 10.6 de `docs/plan-trabajo-semana-entrante.md` y la sesión de diseño del 27 de octubre.
**Estado:** aprobado por Mateo para pasar al plan (sin revisión externa del documento).

## 1. Intención

Mostrar en la sustentación dos formas de usar OncoScan sin que la IA condicione al lector:

- **Lectura ciega**, sobre estudios reales de la plataforma. El médico forma y registra su opinión antes de ver la IA. Así se reduce el sesgo de automatización y queda guardado qué pensaba antes de verla.
- **Modo práctica**, sobre casos públicos de LIDC-IDRI. El usuario busca nódulos en un corte completo y luego compara sus marcas con la referencia de los radiólogos y con el resultado de la IA.

Es una demostración del MVP, no un estudio de lectores. **Criterio de éxito:** la doctora del jurado abre un caso, lo marca y ve la comparación en pocos minutos, sin explicaciones y sin que nada falle. Las dos piezas deben quedar igual de pulidas.

## 2. Objetivos, no objetivos y antiobjetivos

**Objetivos**
- Lectura ciega estricta, activable por médico.
- Modo práctica con 5 casos LIDC y comparación con la referencia.
- Enlace a la demo 3D en el dashboard.

**No objetivos**
- Métricas agregadas.
- Reparto de casos con IA y sin IA entre lectores.
- Cronómetro como dato de estudio.
- Exportación a CSV de las lecturas de práctica.
- Guardar las lecturas de práctica.
- Un modelo que detecte nódulos.
- Cualquier cambio en el servidor de IA de Oracle.

**Antiobjetivos** (cosas que harían fracasar la fase aunque funcione)
- Que la pantalla dé a entender que la IA encontró o contó nódulos por sí sola.
- Que un estudio pendiente de lectura ciega revele su riesgo en otra pantalla: el historial, las alertas, los reportes o el dashboard.
- Usar `brand-danger` fuera de alertas clínicas.

## 3. Lectura ciega

### 3.1 Activación y alcance
- Preferencia `profiles.blind_reading` (booleano, `false` por defecto). Se cambia en Ajustes con un interruptor.
- **Pendiente de lectura ciega:** la preferencia está activa, el estudio está analizado (`upload_status` en `analyzed` o `ai_completed`) y el estudio no tiene impresión inicial ni valoración (`upload_reviews`). Un estudio que ya tenía valoración antes de activar la preferencia no se oculta.
- **Estricta** (decisión de Mateo): no hay botón para ver la IA sin registrar la impresión. La única salida es desactivar la preferencia en Ajustes, y eso vale para todos los estudios.
- Si la migración no está aplicada (la columna no existe), la función queda apagada y las páginas funcionan como hoy.

### 3.2 Qué se oculta mientras está pendiente
- **Página del estudio:**
  - la tarjeta de resultado (score, nivel de riesgo, recomendación, modelo);
  - el botón del informe;
  - la tarjeta de metadata de inferencia;
  - la insignia del lóbulo.
- **Visor 2D:**
  - no recibe el mapa de calor;
  - los modos cortina, lado a lado y superposición, y el parpadeo, quedan deshabilitados con el texto del motivo;
  - el editor de marcadores no muestra "Opinión frente a la IA";
  - el panel no muestra "Resultado IA".
- **Visor 3D:** sin el modo "Mapa de calor" y sin el marcador del nódulo.
- **Formulario de valoración:** no se muestra hasta registrar la impresión, porque guardar una valoración también revelaría la IA.
- **Informe** (`/platform/uploads/[id]/informe`): redirige a la página del estudio.
- **Otras pantallas:**
  - En el historial, el paciente y el análisis por lotes aparece "Pendiente de lectura" en lugar del riesgo y el score.
  - En las alertas, el estudio no aparece.
  - En los conteos por riesgo de reportes y dashboard, el estudio no cuenta.
  - El CSV de reportes no lo incluye.
- **Flujo de subida:** al terminar el análisis no se muestran resultado, visor ni valoración. Se muestra un aviso con el enlace "Abrir el estudio" para hacer la lectura allí.
- El objetivo es evitar el sesgo, no el secreto: la API sigue devolviendo el resultado a quien lo pida directamente. Lo que importa es que la página nunca envíe al navegador el score ni el mapa de calor de un estudio pendiente.

### 3.3 Impresión inicial
- Se registra con los marcadores y Medir que ya existen, más tres campos:
  - Lung-RADS (obligatorio);
  - conducta (obligatoria);
  - nota opcional de hasta 4.000 caracteres.
- No incluye concordancia con la IA, porque el médico todavía no la ha visto.
- El botón es "Registrar impresión y ver la IA". Queda deshabilitado mientras los marcadores se están guardando, si su guardado falló o si no se pudieron cargar.
- Se guarda en `upload_initial_impressions`, una fila por estudio:
  - `markers_snapshot`: copia de los marcadores tomada en el servidor desde `upload_annotations` en ese momento;
  - `revealed_at`.
- La fila **no se puede editar ni borrar** (RLS sin UPDATE ni DELETE).
- Después de registrar:
  - la página muestra todo lo de siempre, más la tarjeta "Impresión inicial (antes de la IA)", de solo lectura;
  - el formulario de valoración llega prellenado con el Lung-RADS y la conducta de la impresión, si todavía no hay valoración.

## 4. Modo práctica

### 4.1 Casos
- 5 pacientes LIDC-IDRI del conjunto de test del modelo v2 (`docs/modelo-v2-densenet/splits/split_assignment.csv`).
- Se preparan con `scripts/prepare_practice_cases.py`:
  1. Descarga las series de TCIA.
  2. Toma las anotaciones de `pylidc`.
  3. Elige, por paciente, el corte axial que pasa por el centroide de su nódulo de referencia más grande.
- **Nódulo de referencia:** grupo de anotaciones marcado por al menos 3 de los 4 radiólogos, con diámetro medio entre 6 y 30 mm. En el corte cuentan todos los nódulos de referencia que lo atraviesan.
- **Resultado de la IA:** se calcula una sola vez, enviando a `/predict` el corte completo con la misma conversión que una subida `.dcm` (`model_input_png`). Las 8 variables son las medianas del consenso de los radiólogos para el nódulo elegido, recortadas a los rangos de la API.
- Los derivados públicos se guardan en `apps/web/public/demo/practica/`: el PNG del corte con ventana pulmonar, el PNG del mapa de calor y `manifest.json`. La procedencia va en `samples/practice/provenance.json`. Los DICOM descargados no se versionan.
- **Riesgo conocido** (solo en este documento, no en pantalla): que un caso sea del test de v2 no garantiza que la v1.2 de Oracle no lo haya visto en su entrenamiento.

### 4.2 Flujo en `/platform/practica`
1. **Intro:** qué es, el aviso fijo de la IA, la lista de los 5 casos y el botón "Empezar".
2. **Lectura:**
   - visor 2D sin IA, con marcadores y Medir (la calibración sale del manifest);
   - no hay persistencia;
   - botón "Ver resultado".
3. **Resultado:**
   - sobre el corte, las marcas del lector y los nódulos de referencia, dibujados como anillos con su diámetro real;
   - un resumen en texto;
   - el resultado de la IA: score, nivel de riesgo y mapa de calor superponible sobre el mismo corte;
   - botones "Repetir caso" y "Siguiente caso".
4. **Fin:** mensaje de cierre y enlace para volver al inicio del modo práctica.

### 4.3 Comparación
- Una marca acierta si está a 10 mm o menos del centro de un nódulo de referencia (límite incluido).
- El emparejamiento es uno a uno y empieza por la pareja más cercana.
- El ancla de una medición es su punto medio.
- Resumen:
  - "Encontraste {k} de {n} nódulos de referencia." (en singular, "nódulo", si n = 1)
  - Si sobran marcas: "{u} marcas no coinciden con ningún nódulo de referencia." (en singular, "1 marca no coincide…")

### 4.4 Textos fijos
- **Aviso de la IA:** "La IA de OncoScan da un score y un mapa de calor para el corte completo: no localiza ni cuenta nódulos. Sus 8 variables clínicas, incluida la sospecha de malignidad, vienen del consenso de los radiólogos de LIDC-IDRI."
- **Pie de página:** "Casos públicos de LIDC-IDRI (The Cancer Imaging Archive, CC BY 3.0). No son pacientes de OncoScan y tus lecturas no se guardan."

## 5. Enlaces
- Dashboard: enlace "Ver demostración 3D" a `/demo/pulmon-3d`.
- Menú lateral: entrada "Modo práctica" a `/platform/practica`.
- Ambos tocan `platform/page.tsx` y `Sidebar.tsx`, que está cambiando el PR de versiones. Se hacen cuando ese PR esté en `main`, junto con el enmascarado de riesgo del dashboard.

## 6. Restricciones
- Nada cambia en Oracle, Render ni Vercel.
- Una migración nueva, que Mateo aplica a mano.
- PHI:
  - las notas de la impresión nunca van a `console.*` ni a logs;
  - los errores al cliente son textos fijos.
- Colores: "Pendiente de lectura" en slate; pins, anillos de referencia y líneas en `brand-primary` o `sky-*` en oscuro; nunca `brand-danger`.
- Commits en español, sin atribución a IA. El push lo hace Mateo.

## 7. Decisiones tomadas por el diseño (no por Mateo)
- Lung-RADS y conducta son obligatorios en la impresión inicial; la nota no.
- La impresión inicial es inmutable.
- El formulario de valoración se prellena con la impresión.
- Si la columna `blind_reading` no existe, la función queda apagada.
- En el flujo de subida y el análisis por lotes la preferencia se lee en el navegador; mientras carga no se muestra el resultado.
- La IA del modo práctica analiza el corte completo, igual que en una subida real, y no un recorte de 128×128. El servidor lo reduce a 128×128 como siempre.
- Umbral de acierto: 10 mm.
- Criterio de nódulo de referencia: 3 de 4 radiólogos y entre 6 y 30 mm.

## 8. Lo que queda al implementador
- Estilos y disposición dentro del sistema de diseño (`apps/web/CLAUDE.md`).
- Cómo cargar el manifest: desde el navegador, porque `public/` no está garantizado en el sistema de archivos del servidor en Vercel.
- Detalles de `pylidc`: la configuración de la ruta DICOM y la compatibilidad de versión. Si `pylidc` no funciona con la versión de NumPy, se fija NumPy en el requirements del script.
