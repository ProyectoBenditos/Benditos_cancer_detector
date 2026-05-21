"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

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

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "No se pudo crear la cuenta. Intenta de nuevo." };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    full_name: fullName,
    cedula_profesional: cedulaProfesional,
    especialidad,
    institucion,
    role: "medico",
    status: "pending",
  });

  if (profileError) {
    return { error: "No se pudo guardar el perfil profesional. Contacta soporte." };
  }

  redirect("/signup?ok=true");
}
