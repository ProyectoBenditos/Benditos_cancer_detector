import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button, buttonVariants } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { deletePatientAction } from "../actions";

export default async function PacienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, external_id, display_alias, notes, created_at")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!patient) notFound();

  const { data: uploads } = await supabase
    .from("dicom_uploads")
    .select("id, original_name, modality, study_date, ai_risk_level, upload_status, created_at")
    .eq("patient_id", patient.id)
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <PageContainer>
      <SectionHeader
        title={patient.display_alias ?? patient.external_id}
        description={`Código: ${patient.external_id}`}
        action={
          <Link
            href="/platform/pacientes"
            className={buttonVariants({ variant: "secondary", size: "md" })}
          >
            Volver a pacientes
          </Link>
        }
      />

      {patient.notes && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Notas clínicas</h2>
            <p className="text-sm text-slate-700">{patient.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Estudios DICOM asociados ({uploads?.length ?? 0})
          </h2>

          {!uploads || uploads.length === 0 ? (
            <p className="text-sm text-slate-400">
              Este paciente no tiene estudios asociados aún.{" "}
              <Link href="/platform/upload" className="text-brand-primary font-medium hover:underline">
                Subir estudio
              </Link>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-2 pr-4">Archivo</th>
                    <th className="pb-2 pr-4">Modalidad</th>
                    <th className="pb-2 pr-4">Fecha</th>
                    <th className="pb-2 pr-4">Riesgo</th>
                    <th className="pb-2 pr-4">Estado</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 pr-4 font-medium text-slate-800 max-w-xs truncate">{u.original_name}</td>
                      <td className="py-3 pr-4 text-slate-600">{u.modality ?? "—"}</td>
                      <td className="py-3 pr-4 text-slate-500">{u.study_date ?? "—"}</td>
                      <td className="py-3 pr-4">
                        {u.ai_risk_level ? (
                          <span className={`font-semibold text-xs ${
                            u.ai_risk_level === "ALTO" ? "text-brand-danger" :
                            u.ai_risk_level === "MEDIO" ? "text-amber-600" : "text-emerald-600"
                          }`}>{u.ai_risk_level}</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={u.upload_status} />
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/platform/uploads/${u.id}`}
                          className="text-brand-primary font-medium hover:underline text-xs"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-red-100">
        <CardContent className="p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Zona peligrosa</h2>
          <p className="text-sm text-slate-600 mb-4">
            Eliminar este paciente no borra los estudios DICOM, pero los desasocia del paciente.
          </p>
          <form
            action={async () => {
              "use server";
              await deletePatientAction(id);
            }}
          >
            <Button type="submit" variant="danger" size="md">
              Eliminar paciente
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
