# Registrar paciente desde Subir DICOM — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir registrar un paciente nuevo directamente desde la página `/platform/upload` mediante un modal, sin abandonar el flujo de subida de DICOM.

**Architecture:** Se crea un componente `Modal` reutilizable en el design system, un server action `createPatientInline` que devuelve el paciente creado (sin redirect), y se integran ambos en `upload/page.tsx` con autoselección del nuevo paciente al guardar.

**Tech Stack:** Next.js 16, React 19 (`useActionState`, `useId`), Tailwind 4, Supabase JS v2, sonner (toasts), lucide-react (iconos).

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| **Crear** | `apps/web/src/components/ui/Modal.tsx` |
| **Modificar** | `apps/web/src/app/platform/pacientes/actions.ts` |
| **Modificar** | `apps/web/src/app/platform/upload/page.tsx` |

---

## Task 1: Componente `Modal` reutilizable

**Files:**
- Create: `apps/web/src/components/ui/Modal.tsx`

- [ ] **Step 1: Crear el archivo Modal.tsx con implementación completa**

```tsx
"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, description, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const titleId = `modal-title-${uid}`;

  // Restaura el foco al elemento que abrió el modal cuando se cierra
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    return () => {
      trigger?.focus();
    };
  }, [open]);

  // Foco inicial en el primer campo al abrir
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();
  }, [open]);

  // Tecla Esc + focus trap
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !(el as HTMLButtonElement).disabled);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-slate-800">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="ml-4 rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que TypeScript no reporta errores**

Desde `apps/web/`:
```bash
npx tsc --noEmit
```
Expected: sin errores en `Modal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/Modal.tsx
git commit -m "feat: agregar componente Modal reutilizable al design system"
```

---

## Task 2: Server action `createPatientInline`

**Files:**
- Modify: `apps/web/src/app/platform/pacientes/actions.ts`

- [ ] **Step 1: Añadir tipos y action al final del archivo**

Abrir `apps/web/src/app/platform/pacientes/actions.ts` y agregar al final:

```ts
export type PatientInlineState = {
  error?: string;
  patient?: { id: string; external_id: string; display_alias: string | null };
};

export async function createPatientInline(
  _prev: PatientInlineState,
  formData: FormData,
): Promise<PatientInlineState> {
  const externalId = (formData.get("external_id") as string | null)?.trim() ?? "";
  const displayAlias = (formData.get("display_alias") as string | null)?.trim() ?? "";
  const notes = (formData.get("notes") as string | null)?.trim() ?? "";

  if (!externalId) {
    return { error: "El código de paciente es obligatorio." };
  }
  if (externalId.length > 100) {
    return { error: "El código de paciente no puede superar 100 caracteres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { data, error } = await supabase
    .from("patients")
    .insert({
      user_id: user.id,
      external_id: externalId,
      display_alias: displayAlias || null,
      notes: notes || null,
    })
    .select("id, external_id, display_alias")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `Ya tienes un paciente con el código "${externalId}".` };
    }
    return { error: "No se pudo registrar el paciente. Intenta de nuevo." };
  }

  return { patient: data };
}
```

- [ ] **Step 2: Verificar que TypeScript no reporta errores**

```bash
npx tsc --noEmit
```
Expected: sin errores en `actions.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/platform/pacientes/actions.ts
git commit -m "feat: agregar action createPatientInline para registro desde modal"
```

---

## Task 3: Integrar modal en `upload/page.tsx`

**Files:**
- Modify: `apps/web/src/app/platform/upload/page.tsx`

- [ ] **Step 1: Actualizar imports**

Reemplazar la línea de imports de React:
```tsx
import { useState, useEffect } from "react";
```
por:
```tsx
import { useState, useEffect, useRef, useActionState } from "react";
```

Agregar estas líneas de import después de los imports existentes (antes de la primera declaración `type`):
```tsx
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { createPatientInline, type PatientInlineState } from "../pacientes/actions";
```

- [ ] **Step 2: Añadir estado del modal dentro de `UploadDicomPage`**

Localizar el bloque de `useState` al inicio de la función. Justo después de la última línea de estado existente (`const [analysisResult, setAnalysisResult] = useState...`), añadir:

```tsx
const [modalOpen, setModalOpen]       = useState(false);
const processedPatientId              = useRef<string | null>(null);
const [modalState, modalAction, modalPending] = useActionState<PatientInlineState, FormData>(
    createPatientInline,
    {},
);
```

- [ ] **Step 3: Añadir useEffect que maneja el éxito del registro**

Justo después del `useEffect` existente que carga la lista de pacientes (el que llama `supabase.from("patients")...`), añadir:

```tsx
useEffect(() => {
    if (!modalState.patient) return;
    if (processedPatientId.current === modalState.patient.id) return;
    processedPatientId.current = modalState.patient.id;
    const p = modalState.patient;
    setPatients((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
    setPatientId(p.id);
    setModalOpen(false);
    toast.success("Paciente registrado y seleccionado.");
}, [modalState.patient]);
```

- [ ] **Step 4: Refactorizar el selector de paciente**

Localizar el bloque:
```tsx
{/* Paciente asociado */}
{patients.length > 0 && (
    <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
            Paciente <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
        >
            <option value="">Sin paciente asociado</option>
            {patients.map((p) => (
                <option key={p.id} value={p.id}>
                    {p.display_alias ? `${p.display_alias} (${p.external_id})` : p.external_id}
                </option>
            ))}
        </select>
        <p className="text-xs text-slate-400 mt-1">
            Asociar el estudio a un paciente para agrupar sus análisis.
        </p>
    </div>
)}
```

Reemplazarlo por:
```tsx
{/* Paciente asociado */}
<div>
    <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">
            Paciente <span className="text-slate-400 font-normal">(opcional)</span>
        </label>
        <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-sm font-medium text-brand-primary hover:text-brand-primary-hover hover:underline transition-colors"
        >
            + Registrar paciente
        </button>
    </div>
    <select
        value={patientId}
        onChange={(e) => setPatientId(e.target.value)}
        className="block w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all"
    >
        <option value="">Sin paciente asociado</option>
        {patients.map((p) => (
            <option key={p.id} value={p.id}>
                {p.display_alias ? `${p.display_alias} (${p.external_id})` : p.external_id}
            </option>
        ))}
    </select>
    <p className="text-xs text-slate-400 mt-1">
        Asociar el estudio a un paciente para agrupar sus análisis.
    </p>
</div>
```

- [ ] **Step 5: Añadir el Modal antes del cierre del `return`**

Justo antes del `</PageContainer>` de cierre, añadir:

```tsx
{/* Modal: registrar paciente */}
<Modal
    open={modalOpen}
    onClose={() => setModalOpen(false)}
    title="Registrar paciente"
    description="Crea un nuevo paciente para asociarlo a este estudio."
>
    <form action={modalAction} className="space-y-4">
        <div>
            <label htmlFor="modal-external-id" className="mb-1.5 block text-sm font-medium text-slate-700">
                Código de paciente <span className="text-brand-danger">*</span>
            </label>
            <input
                id="modal-external-id"
                name="external_id"
                type="text"
                required
                maxLength={100}
                placeholder="Ej: CT-001, PAC-2026-001"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
            />
            <p className="mt-1 text-xs text-slate-400">
                Código interno único para identificar a este paciente.
            </p>
        </div>
        <div>
            <label htmlFor="modal-display-alias" className="mb-1.5 block text-sm font-medium text-slate-700">
                Alias o descripción <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
                id="modal-display-alias"
                name="display_alias"
                type="text"
                maxLength={200}
                placeholder="Ej: Paciente Tórax Estudio 2026"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
            />
        </div>
        <div>
            <label htmlFor="modal-notes" className="mb-1.5 block text-sm font-medium text-slate-700">
                Notas clínicas <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
                id="modal-notes"
                name="notes"
                rows={3}
                maxLength={1000}
                placeholder="Notas adicionales sobre el caso..."
                className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
            />
        </div>

        {modalState.error && (
            <AlertBanner
                variant="error"
                title="No se pudo registrar el paciente"
                description={modalState.error}
            />
        )}

        <div className="flex justify-end gap-3 pt-2">
            <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setModalOpen(false)}
            >
                Cancelar
            </Button>
            <Button
                type="submit"
                variant="primary"
                size="md"
                loading={modalPending}
            >
                {modalPending ? "Registrando..." : "Registrar"}
            </Button>
        </div>
    </form>
</Modal>
```

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores.

- [ ] **Step 7: Probar flujo manualmente**

1. Abrir `/platform/upload` en el navegador.
2. Confirmar que el selector de paciente aparece siempre (también si hay 0 pacientes).
3. Hacer clic en `+ Registrar paciente` → el modal se abre, el foco va al primer campo.
4. Presionar `Esc` → el modal se cierra.
5. Volver a abrir el modal, llenar solo el alias → hacer submit → verificar error "El código de paciente es obligatorio."
6. Llenar el código y hacer submit → el modal se cierra, el nuevo paciente queda seleccionado en el selector, aparece toast "Paciente registrado y seleccionado."
7. Intentar registrar el mismo código de nuevo → verificar error "Ya tienes un paciente con el código X."
8. Seleccionar un archivo DICOM y subir → confirmar que el `patient_id` se envía al backend (verificar en historial DICOM que el estudio queda asociado al paciente).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/platform/upload/page.tsx
git commit -m "feat: integrar modal de registro de paciente en página Subir DICOM"
```
