import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { approveMedicoAction, rejectMedicoAction, revokeMedicoAction } from "../actions";

export default async function AdminMedicoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (myProfile?.role !== "admin") notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, cedula_profesional, especialidad, institucion, status, rejection_reason, created_at, approved_at")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const statusLabel: Record<string, string> = {
    pending: "Pendiente",
    approved: "Aprobado",
    rejected: "Rechazado",
  };

  const statusColor: Record<string, string> = {
    pending: "text-amber-700 bg-amber-50 border-amber-200",
    approved: "text-emerald-700 bg-emerald-50 border-emerald-200",
    rejected: "text-red-700 bg-red-50 border-red-200",
  };

  return (
    <PageContainer maxWidth="2xl">
      <SectionHeader
        title={profile.full_name}
        description="Detalle del perfil profesional y acciones de moderación."
      />

      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusColor[profile.status] ?? ""}`}>
              {statusLabel[profile.status] ?? profile.status}
            </span>
          </div>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
            <InfoField label="Cédula profesional" value={profile.cedula_profesional} />
            <InfoField label="Especialidad" value={profile.especialidad} />
            <InfoField label="Institución" value={profile.institucion} />
            <InfoField label="Fecha de solicitud" value={new Date(profile.created_at).toLocaleString("es-CO")} />
            {profile.approved_at && (
              <InfoField label="Aprobado el" value={new Date(profile.approved_at).toLocaleString("es-CO")} />
            )}
          </dl>

          {profile.status === "rejected" && profile.rejection_reason && (
            <AlertBanner
              variant="critical"
              title="Motivo de rechazo"
              description={profile.rejection_reason}
            />
          )}
        </CardContent>
      </Card>

      {profile.status === "pending" && (
        <div className="flex flex-col gap-4 sm:flex-row">
          <form
            action={async () => {
              "use server";
              await approveMedicoAction(id);
            }}
          >
            <Button type="submit" variant="primary" size="md">
              Aprobar
            </Button>
          </form>

          <RejectForm profileId={id} />
        </div>
      )}

      {profile.status === "approved" && (
        <form
          action={async () => {
            "use server";
            await revokeMedicoAction(id);
          }}
        >
          <Button type="submit" variant="danger" size="md">
            Revocar aprobación
          </Button>
        </form>
      )}

      {profile.status === "rejected" && (
        <form
          action={async () => {
            "use server";
            await revokeMedicoAction(id);
          }}
        >
          <Button type="submit" variant="secondary" size="md">
            Reconsiderar (volver a pendiente)
          </Button>
        </form>
      )}
    </PageContainer>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</dt>
      <dd className="mt-1 font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function RejectForm({ profileId }: { profileId: string }) {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";
        const reason = (formData.get("reason") as string | null)?.trim() ?? "";
        await rejectMedicoAction(profileId, reason);
      }}
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
    >
      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-1">
          Motivo de rechazo
        </label>
        <input
          id="reason"
          name="reason"
          type="text"
          className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all w-72"
          placeholder="Ej: Cédula no válida"
        />
      </div>
      <Button type="submit" variant="danger" size="md">
        Rechazar
      </Button>
    </form>
  );
}
