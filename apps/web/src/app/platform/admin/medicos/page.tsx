import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";

type Profile = {
  id: string;
  full_name: string;
  cedula_profesional: string;
  especialidad: string;
  institucion: string;
  status: string;
  created_at: string;
};

export default async function AdminMedicosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (myProfile?.role !== "admin") notFound();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, cedula_profesional, especialidad, institucion, status, created_at")
    .order("created_at", { ascending: false });

  const pending = profiles?.filter((p) => p.status === "pending") ?? [];
  const approved = profiles?.filter((p) => p.status === "approved") ?? [];
  const rejected = profiles?.filter((p) => p.status === "rejected") ?? [];

  return (
    <PageContainer>
      <SectionHeader
        title="Gestión de médicos"
        description="Revisa y aprueba o rechaza solicitudes de registro de médicos."
      />

      <MedicosSection title="Pendientes de aprobación" profiles={pending} emptyMsg="No hay solicitudes pendientes." />
      <MedicosSection title="Aprobados" profiles={approved} emptyMsg="No hay médicos aprobados aún." />
      <MedicosSection title="Rechazados" profiles={rejected} emptyMsg="No hay médicos rechazados." />
    </PageContainer>
  );
}

function MedicosSection({
  title,
  profiles,
  emptyMsg,
}: {
  title: string;
  profiles: Profile[];
  emptyMsg: string;
}) {
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">{title}</h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-slate-400">{emptyMsg}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-2 pr-4">Nombre</th>
                  <th className="pb-2 pr-4">Cédula</th>
                  <th className="pb-2 pr-4">Especialidad</th>
                  <th className="pb-2 pr-4">Institución</th>
                  <th className="pb-2 pr-4">Fecha solicitud</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-800">{p.full_name}</td>
                    <td className="py-3 pr-4 text-slate-600">{p.cedula_profesional}</td>
                    <td className="py-3 pr-4 text-slate-600">{p.especialidad}</td>
                    <td className="py-3 pr-4 text-slate-600">{p.institucion}</td>
                    <td className="py-3 pr-4 text-slate-500">
                      {new Date(p.created_at).toLocaleDateString("es-CO")}
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/platform/admin/medicos/${p.id}`}
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
  );
}
