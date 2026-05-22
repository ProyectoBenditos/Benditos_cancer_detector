"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createPatientAction } from "../actions";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button, buttonVariants } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";

export default function NuevoPacientePage() {
  const [state, formAction, pending] = useActionState(createPatientAction, {});

  return (
    <PageContainer maxWidth="2xl">
      <SectionHeader
        title="Registrar paciente"
        description="Crea un nuevo paciente para asociarlo a estudios DICOM."
        action={
          <Link
            href="/platform/pacientes"
            className={buttonVariants({ variant: "secondary", size: "md" })}
          >
            Cancelar
          </Link>
        }
      />

      <Card>
        <CardContent className="p-8">
          <form action={formAction} className="space-y-6">
            <div>
              <label htmlFor="external_id" className="mb-1.5 block text-sm font-medium text-slate-700">
                Código de paciente <span className="text-brand-danger">*</span>
              </label>
              <input
                id="external_id"
                name="external_id"
                type="text"
                required
                maxLength={100}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700"
                placeholder="Ej: CT-001, PAC-2026-001"
              />
              <p className="text-xs text-slate-400 mt-1">
                Código interno que uses en tu institución para identificar a este paciente. Debe ser único.
              </p>
            </div>

            <div>
              <label htmlFor="display_alias" className="mb-1.5 block text-sm font-medium text-slate-700">
                Alias o descripción <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                id="display_alias"
                name="display_alias"
                type="text"
                maxLength={200}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700"
                placeholder="Ej: Paciente Tórax Estudio 2026"
              />
            </div>

            <div>
              <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-slate-700">
                Notas clínicas <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                maxLength={1000}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700 resize-none"
                placeholder="Notas adicionales sobre el caso..."
              />
            </div>

            {state?.error ? (
              <AlertBanner
                variant="critical"
                title="No se pudo registrar el paciente"
                description={state.error}
              />
            ) : null}

            <Button type="submit" variant="primary" size="lg" loading={pending} className="w-full">
              {pending ? "Registrando..." : "Registrar paciente"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
