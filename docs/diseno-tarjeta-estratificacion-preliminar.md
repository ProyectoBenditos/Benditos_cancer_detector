# Especificación Técnica: Tarjeta Preliminar de Estratificación Clínica y Detección

> **Estado:** Documentado / Pendiente de aprobación para desarrollo futuro  
> **Módulo:** Frontend (`apps/web`)  
> **Componente planificado:** `ClinicalStratificationCard.tsx`  
> **Vistas destino:** [`/platform/upload`](apps/web/src/app/platform/upload/page.tsx) y [`/platform/uploads/[id]`](apps/web/src/app/platform/uploads/[id]/page.tsx)

---

## 1. Justificación Clínica y de UX

### El Problema Identificado
En la versión actual de OncoScan, al procesar una tomografía en la pantalla de subida, la interfaz solo presenta métricas aisladas (*Score IA*, *Nivel de Riesgo cualitativo* y la cortina *Grad-CAM*). Toda la estratificación clínica cuantitativa (Lung-RADS, tipología de nódulo, variables morfológicas y conducta de patología) se encuentra en la vista secundaria del Informe Estandarizado (`/informe`). 

Esto genera un **punto ciego para evaluadores y médicos**, llevando a asumir erróneamente que la plataforma no realiza detección ni estratificación estandarizada.

### La Solución
Incorporar una tarjeta clínica de alta jerarquía visual directamente en la pantalla de resultados post-análisis, de modo que el especialista reciba en un solo vistazo la detección espacial, la estratificación por tramos clínicos y la recomendación médica.

---

## 2. Arquitectura de Contenidos del Componente

```
┌────────────────────────────────────────────────────────────────────────┐
│ [STATUS] Nódulo Localizado en Lóbulo Superior Izquierdo (Grad-CAM)    │
├────────────────────────────────────────────────────────────────────────┤
│ ESTRATIFICACIÓN DE RIESGO DE MALIGNIDAD (Tabla 2 SciELO / ACCP)        │
│                                                                        │
│   Bajo (<12%)        Intermedio (12% - 69%)            Alto (>69%)     │
│ [████████████████] [████████████████████████] [████████████████████]   │
│                                        ▲ (Score: 68.4%)                │
│ Nivel Clínico: RIESGO INTERMEDIO-ALTO                                  │
├────────────────────────────────────────────────────────────────────────┤
│ TIPOLOGÍA MORFOLÓGICA DEL NÓDULO (Criterios Guía Fleischner)           │
│                                                                        │
│ • Tipo: Nódulo Parcialmente Sólido (Subsólido mixto)                   │
│ • Densidad interna: Componente en vidrio esmerilado + núcleo sólido    │
│ • Conducta recomendada: Tomografía de control a 3-6 meses o           │
│   Biopsia Trucut guiada por TC si el componente sólido es ≥ 8 mm.      │
├────────────────────────────────────────────────────────────────────────┤
│ [ Botón Primario: Ver Informe Clínico Estandarizado y PDF ]            │
│ [ Botón Secundario: Registrar Feedback del Especialista ]             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Umbrales Clínicos y Lógica de Clasificación

### A. Estratificación por Probabilidad (Tabla 2 SciELO / ACCP)
Para alinearse con la literatura médica aportada por el evaluador clínico:

| Rango de Probabilidad | Categoría Clínica | Color Semántico UI | Acción Sugerida |
| :--- | :--- | :--- | :--- |
| **$< 12\%$** | **Riesgo Bajo** | Esmeralda (`#10b981`) | Seguimiento tomográfico diferido (12 meses o según protocolo local). |
| **$12\% \text{ a } 69\%$** | **Riesgo Intermedio** | Ámbar / Ocre (`#f59e0b`) | TC de tórax con contraste a 3–6 meses o PET-CT para caracterización metabólica. |
| **$> 69\%$** | **Riesgo Alto** | Carmesí clínico (`#e11d48`) | Consulta oncológica prioritaria, valoración quirúrgica o Biopsia Trucut (GPC 36). |

### B. Mapeo de Tipología de Nódulo (Guía Fleischner)
La tipología se determina a partir del atributo morfológico de atenuación interna (`texture`, escala 1 a 5 de LIDC-IDRI):

```typescript
export function getNoduleTypology(textureValue: number): {
  type: "Vidrio Esmerilado Puro (No sólido)" | "Parcialmente Sólido (Subsólido)" | "Completamente Sólido";
  description: string;
  fleischnerGroup: "subsolid-pure" | "subsolid-part" | "solid";
} {
  if (textureValue <= 1) {
    return {
      type: "Vidrio Esmerilado Puro (No sólido)",
      description: "Atenuación tenue sin oscurecimiento de estructuras vasculares subyacentes.",
      fleischnerGroup: "subsolid-pure"
    };
  }
  if (textureValue < 5) {
    return {
      type: "Parcialmente Sólido (Subsólido)",
      description: "Nódulo mixto con componente en vidrio deslustrado y foco sólido central.",
      fleischnerGroup: "subsolid-part"
    };
  }
  return {
    type: "Completamente Sólido",
    description: "Opacidad homogénea de densidad de partes blandas que oblitera los vasos.",
    fleischnerGroup: "solid"
  };
}
```

---

## 4. Interfaz TypeScript de Props

```typescript
export interface ClinicalStratificationCardProps {
  /** Probabilidad de malignidad calculada por el modelo (0 a 1) */
  malignancyScore: number;
  /** Categoría cualitativa actual del modelo (BAJO, MEDIO, ALTO) */
  riskLevel: "BAJO" | "MEDIO" | "ALTO";
  /** Valor de textura/atenuación interna (1 a 5 de LIDC-IDRI) */
  texture: number;
  /** Ubicación lobular confirmada (ej. 'Lóbulo Superior Izquierdo') */
  lobarLocation?: string;
  /** ID del estudio analizado para redirección */
  uploadId?: string;
  /** Callback opcional si se interactúa dentro de modal */
  onViewReportClick?: () => void;
}
```

---

## 5. Hoja de Ruta para su Implementación

Cuando se autorice la construcción de esta funcionalidad:
1. **Crear el componente:** Ubicarlo en `apps/web/src/components/informe/ClinicalStratificationCard.tsx` respetando las directrices de diseño médico (sin degradados saturados, fondo blanco/marfil clínico, tipografía autoritativa).
2. **Integrar en `/platform/upload`:** Insertarlo en la columna derecha de resultados, entre el visor de Grad-CAM y las acciones de descarga.
3. **Integrar en `/platform/uploads/[id]`:** Asegurar que la vista persistente del análisis también cuente con este bloque para revisiones retrospectivas.
4. **Verificación visual y de tipos:** Ejecutar `npm run build` en `apps/web` y validar renderizado responsivo.

