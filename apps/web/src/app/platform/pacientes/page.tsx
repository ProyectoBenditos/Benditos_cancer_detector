import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { Users, Search } from "lucide-react";

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  // Escape % and , to prevent accidental filter expansion in ilike patterns
  const q = rawQ?.trim().replace(/%/g, "\\%").replace(/,/g, "\\,") ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("patients")
    .select("id, external_id, display_alias, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`external_id.ilike.%${q}%,display_alias.ilike.%${q}%`);
  }

  const { data: patients } = await query;

  const displayQ = rawQ?.trim() ?? "";

  return (
    <PageContainer>
      <SectionHeader
        title="Pacientes registrados"
        description="Gestiona los pacientes asociados a tus estudios DICOM."
        action={
          <Link
            href="/platform/pacientes/nuevo"
            className={buttonVariants({ variant: "primary", size: "md" })}
          >
            Registrar paciente
          </Link>
        }
      />

      <form method="get" className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            defaultValue={displayQ}
            placeholder="Buscar por código o alias…"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-4 py-2.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 focus:border-brand-primary"
          />
        </div>
        <button
          type="submit"
          className={buttonVariants({ variant: "secondary", size: "md" })}
        >
          Buscar
        </button>
        {displayQ && (
          <a
            href="/platform/pacientes"
            className={buttonVariants({ variant: "ghost", size: "md" })}
          >
            Limpiar
          </a>
        )}
      </form>

      {!patients || patients.length === 0 ? (
        displayQ ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center text-center">
              <Search
                className="w-12 h-12 text-slate-300 mb-4"
                aria-hidden="true"
              />
              <h2 className="text-lg font-semibold text-slate-700 mb-2">
                Sin resultados
              </h2>
              <p className="text-sm text-slate-500 mb-6 max-w-sm">
                No hay pacientes que coincidan con &ldquo;{displayQ}&rdquo;.
              </p>
              <a
                href="/platform/pacientes"
                className={buttonVariants({ variant: "secondary", size: "md" })}
              >
                Ver todos los pacientes
              </a>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 flex flex-col items-center text-center">
              <Users
                className="w-12 h-12 text-slate-300 mb-4"
                aria-hidden="true"
              />
              <h2 className="text-lg font-semibold text-slate-700 mb-2">
                Sin pacientes registrados
              </h2>
              <p className="text-sm text-slate-500 mb-6 max-w-sm">
                Registra tu primer paciente para asociarlo a los estudios DICOM
                que subas.
              </p>
              <Link
                href="/platform/pacientes/nuevo"
                className={buttonVariants({ variant: "primary", size: "md" })}
              >
                Registrar primer paciente
              </Link>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="px-6 py-3">Código</th>
                    <th className="px-6 py-3">Alias</th>
                    <th className="px-6 py-3">Registrado</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-50 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {p.external_id}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {p.display_alias ?? (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(p.created_at).toLocaleDateString("es-CO")}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/platform/pacientes/${p.id}`}
                          className="text-brand-primary font-medium hover:underline text-xs"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
