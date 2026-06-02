# Spec: Registrar paciente desde la página Subir DICOM

**Fecha:** 2026-06-01  
**Autor:** Mateo  
**Estado:** Aprobado por el usuario

---

## Contexto

La página `/platform/upload` permite subir archivos DICOM y asociarlos a un paciente existente. Actualmente, si el paciente no existe, el médico debe navegar a `/platform/pacientes/nuevo`, registrarlo, y volver — perdiendo el archivo ya seleccionado y la referencia del caso.

Este spec describe añadir un modal de registro de paciente **en la misma página**, sin abandonar el flujo de subida.

---

## Objetivo

El médico puede registrar un paciente nuevo directamente desde el formulario de Subir DICOM, sin perder el estado de la página (archivo seleccionado, referencia del caso).

---

## Componentes afectados

| Archivo | Cambio |
|---------|--------|
| `apps/web/src/components/ui/Modal.tsx` | **Nuevo** — componente reutilizable |
| `apps/web/src/app/platform/pacientes/actions.ts` | **Nuevo action** `createPatientInline` |
| `apps/web/src/app/platform/upload/page.tsx` | Integración del modal + refactor del selector de paciente |

---

## 1. Componente `Modal` (`src/components/ui/Modal.tsx`)

### Props

```ts
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}
```

### Comportamiento

- Renderiza solo cuando `open === true`.
- Overlay semitransparente sobre el contenido de la página (`bg-black/40`).
- Panel centrado, `max-w-md`, con fondo `brand-surface` (`bg-white`), bordes redondeados (`rounded-2xl`), sombra.
- Cierra con:
  - Clic en el overlay.
  - Tecla `Escape`.
  - Botón de cierre `×` en la esquina superior derecha.
- **Accesibilidad:**
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apuntando al título.
  - Foco inicial en el primer campo del formulario al abrir.
  - Foco restaurado al elemento que lo abrió (el botón `+ Registrar paciente`) al cerrar.
  - Foco atrapado dentro del modal mientras está abierto (Tab / Shift+Tab no salen).

### Implementación de focus trap

Manejado con un `useEffect` que escucha `keydown`, obtiene todos los focusables dentro del modal (`a, button, input, textarea, select, [tabindex]`) y cicla entre el primero y el último.

---

## 2. Server action `createPatientInline`

Ubicación: `apps/web/src/app/platform/pacientes/actions.ts`

### Firma

```ts
export type PatientInlineState = {
  error?: string;
  patient?: { id: string; external_id: string; display_alias: string | null };
};

export async function createPatientInline(
  _prev: PatientInlineState,
  formData: FormData
): Promise<PatientInlineState>;
```

### Lógica

1. Extrae y valida `external_id` (obligatorio, máx. 100 chars).
2. Valida autenticación con Supabase.
3. Inserta en `patients` con `user_id`, `external_id`, `display_alias`, `notes`.
4. Si error `23505` (código duplicado): devuelve `{ error: "Ya tienes un paciente con el código \"X\"." }`.
5. En éxito: devuelve `{ patient: { id, external_id, display_alias } }`.
6. **No llama `redirect()`** — la acción es llamada desde un modal en cliente.

La action original `createPatientAction` queda intacta para la página `/nuevo`.

---

## 3. Cambios en `upload/page.tsx`

### Selector de paciente

- **Siempre visible**, independientemente de si `patients.length === 0`.
- Junto al label se agrega un botón secundario (ghost/link): **`+ Registrar paciente`**.
  - `onClick` abre el modal (`setModalOpen(true)`).
  - Referencia con `useRef` para restaurar el foco al cerrar.

### Estado nuevo

```ts
const [modalOpen, setModalOpen]       = useState(false);
const registerBtnRef = useRef<HTMLButtonElement>(null);
```

El `useActionState` del modal usa `createPatientInline`:

```ts
const [modalState, modalAction, modalPending] = useActionState(createPatientInline, {});
```

### Flujo de éxito al registrar

En un `useEffect` que observa `modalState.patient`:

1. Agrega el nuevo paciente a `patients`.
2. Establece `patientId` al id del nuevo paciente (autoselección).
3. Cierra el modal (`setModalOpen(false)`).
4. Muestra `toast.success("Paciente registrado y seleccionado.")`.
5. Resetea `modalState` (limpia el form).

### Flujo de error

- `AlertBanner variant="error"` dentro del modal cuando `modalState.error` existe.

### PHI

- No se loguea `external_id`, `display_alias` ni `id` del paciente en `console.*`.

---

## 4. Contenido del modal

Campos del formulario (idénticos a `/pacientes/nuevo`):

| Campo | Tipo | Requerido |
|-------|------|-----------|
| Código de paciente | `input[text]` | Sí, máx. 100 chars |
| Alias o descripción | `input[text]` | No, máx. 200 chars |
| Notas clínicas | `textarea` | No, máx. 1000 chars |

Botones: `Cancelar` (cierra modal, `variant="secondary"`) y `Registrar` (`type="submit"`, `variant="primary"`, con `loading` prop del `pending`).

---

## 5. Impacto en la navegación

Nulo. El flujo existente de `/platform/pacientes/nuevo` no se modifica. El modal es un complemento aditivo.

---

## 6. Fuera del alcance

- Edición de pacientes desde la página de upload.
- Búsqueda/filtro en el selector de pacientes.
- Validación de unicidad de `external_id` en tiempo real (se hace al guardar).
