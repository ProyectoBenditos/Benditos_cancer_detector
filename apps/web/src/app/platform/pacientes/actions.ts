"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type PatientState = {
  error?: string;
};

export async function createPatientAction(
  _prev: PatientState,
  formData: FormData
): Promise<PatientState> {
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { error } = await supabase.from("patients").insert({
    user_id: user.id,
    external_id: externalId,
    display_alias: displayAlias || null,
    notes: notes || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `Ya tienes un paciente con el código "${externalId}".` };
    }
    return { error: "No se pudo registrar el paciente. Intenta de nuevo." };
  }

  redirect("/platform/pacientes");
}

export async function deletePatientAction(patientId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await supabase
    .from("patients")
    .delete()
    .eq("id", patientId)
    .eq("user_id", user.id);

  revalidatePath("/platform/pacientes");
  redirect("/platform/pacientes");
}

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
