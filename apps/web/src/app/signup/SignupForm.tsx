"use client";

import { useActionState } from "react";
import { signupAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { CONSENT_VERSION, CONSENT_TEXT } from "@/lib/consent";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, {});

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800 font-medium">
          Tu cuenta será revisada por un administrador antes de ser activada.
          Recibirás acceso una vez aprobada.
        </p>
      </div>

      <div>
        <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-slate-700">
          Nombre completo
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          autoComplete="name"
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700"
          placeholder="Dr. Juan Pérez García"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          Correo electrónico institucional
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700"
          placeholder="medico@hospital.edu.co"
        />
      </div>

      <div>
        <label htmlFor="cedula_profesional" className="mb-1.5 block text-sm font-medium text-slate-700">
          Cédula profesional
        </label>
        <input
          id="cedula_profesional"
          name="cedula_profesional"
          type="text"
          required
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700"
          placeholder="12345678"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="especialidad" className="mb-1.5 block text-sm font-medium text-slate-700">
            Especialidad
          </label>
          <input
            id="especialidad"
            name="especialidad"
            type="text"
            required
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700"
            placeholder="Neumología"
          />
        </div>
        <div>
          <label htmlFor="institucion" className="mb-1.5 block text-sm font-medium text-slate-700">
            Institución
          </label>
          <input
            id="institucion"
            name="institucion"
            type="text"
            required
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700"
            placeholder="Hospital Universitario"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
          Contraseña <span className="font-normal text-slate-400">(mínimo 8 caracteres)</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label htmlFor="confirm_password" className="mb-1.5 block text-sm font-medium text-slate-700">
          Confirmar contraseña
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700"
          placeholder="••••••••"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-slate-700 select-none list-none flex items-center justify-between">
            <span>Consentimiento informado (versión {CONSENT_VERSION})</span>
            <span className="text-xs text-slate-400 group-open:hidden">Ver texto completo ▼</span>
            <span className="text-xs text-slate-400 hidden group-open:inline">Ocultar ▲</span>
          </summary>
          <p className="mt-3 text-xs text-slate-600 leading-relaxed">{CONSENT_TEXT}</p>
        </details>
        <label className="mt-3 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
          />
          <span className="text-sm text-slate-700">
            He leído y acepto el consentimiento informado (versión {CONSENT_VERSION})
          </span>
        </label>
      </div>

      {state?.error ? (
        <AlertBanner
          variant="critical"
          title="No pudimos completar el registro"
          description={state.error}
        />
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={pending}
        className="w-full"
      >
        {pending ? "Registrando..." : "Solicitar registro"}
      </Button>
    </form>
  );
}
