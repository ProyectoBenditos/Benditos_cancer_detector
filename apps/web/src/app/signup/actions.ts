"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CONSENT_VERSION } from "@/lib/consent";

export type SignupState = {
  error?: string;
};

export async function signupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const confirmPassword = (formData.get("confirm_password") as string | null) ?? "";
  const fullName = (formData.get("full_name") as string | null)?.trim() ?? "";
  const cedulaProfesional = (formData.get("cedula_profesional") as string | null)?.trim() ?? "";
  const especialidad = (formData.get("especialidad") as string | null)?.trim() ?? "";
  const institucion = (formData.get("institucion") as string | null)?.trim() ?? "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Ingresa un correo electrónico válido." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }
  if (fullName.length < 3) {
    return { error: "Ingresa tu nombre completo." };
  }
  if (cedulaProfesional.length < 3) {
    return { error: "Ingresa tu cédula profesional." };
  }
  if (especialidad.length < 3) {
    return { error: "Ingresa tu especialidad." };
  }
  if (institucion.length < 3) {
    return { error: "Ingresa tu institución." };
  }

  const consent = formData.get("consent");
  if (consent !== "on") {
    return { error: "Debes aceptar el consentimiento informado para continuar." };
  }

  const supabase = await createClient();

  // Los datos del perfil se pasan como metadata — el trigger on_auth_user_created
  // los lee de raw_user_meta_data e inserta en public.profiles automáticamente.
  // Esto evita problemas de RLS al insertar desde el server action.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        cedula_profesional: cedulaProfesional,
        especialidad,
        institucion,
        consent_version: CONSENT_VERSION,
        consent_at: new Date().toISOString(),
      },
    },
  });

  if (authError) {
    return { error: authError.message ?? "No se pudo crear la cuenta. Intenta de nuevo." };
  }

  if (!authData.user) {
    return { error: "No se pudo crear la cuenta. Intenta de nuevo." };
  }

  // Si el email ya estaba registrado, Supabase no devuelve error pero sí user sin session.
  // Identificamos este caso por la ausencia de identidades en el response.
  if (authData.user.identities && authData.user.identities.length === 0) {
    return { error: "Este correo ya tiene una cuenta registrada. Intenta iniciar sesión." };
  }

  redirect("/signup?ok=true");
}
