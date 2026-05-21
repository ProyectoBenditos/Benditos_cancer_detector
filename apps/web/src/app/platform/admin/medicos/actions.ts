"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (data?.role !== "admin") {
    throw new Error("No autorizado");
  }
}

export async function approveMedicoAction(profileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await assertAdmin(supabase, user.id);

  await supabase
    .from("profiles")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      rejection_reason: null,
    })
    .eq("id", profileId);

  revalidatePath("/platform/admin/medicos");
}

export async function rejectMedicoAction(profileId: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await assertAdmin(supabase, user.id);

  await supabase
    .from("profiles")
    .update({
      status: "rejected",
      rejection_reason: reason || "Sin motivo especificado",
    })
    .eq("id", profileId);

  revalidatePath("/platform/admin/medicos");
}

export async function revokeMedicoAction(profileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  await assertAdmin(supabase, user.id);

  await supabase
    .from("profiles")
    .update({
      status: "pending",
      approved_at: null,
      approved_by: null,
      rejection_reason: null,
    })
    .eq("id", profileId);

  revalidatePath("/platform/admin/medicos");
}
