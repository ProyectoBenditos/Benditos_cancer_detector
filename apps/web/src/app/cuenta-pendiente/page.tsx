import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";

export default async function CuentaPendientePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, rejection_reason, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.status === "approved") {
    redirect("/platform");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-sidebar px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-2xl text-center">
        <h1 className="text-xl font-bold text-slate-800 mb-2">
          {profile?.full_name ? `Hola, ${profile.full_name}` : "Tu cuenta"}
        </h1>

        {profile?.status === "pending" && (
          <div className="mt-4">
            <AlertBanner
              variant="warning"
              title="Cuenta pendiente de aprobación"
              description="Tu solicitud de acceso está siendo revisada por un administrador. Te notificaremos cuando tu cuenta sea activada."
            />
          </div>
        )}

        {profile?.status === "rejected" && (
          <div className="mt-4 space-y-4">
            <AlertBanner
              variant="critical"
              title="Cuenta rechazada"
              description={
                profile.rejection_reason
                  ? `Motivo: ${profile.rejection_reason}`
                  : "Tu solicitud de acceso no fue aprobada."
              }
            />
            <p className="text-sm text-slate-600">
              Si crees que hay un error, contacta al equipo de soporte.
            </p>
            <a
              href="mailto:soporte@oncoscan.edu.co"
              className="inline-block text-sm font-medium text-brand-primary hover:underline"
            >
              Contactar soporte
            </a>
          </div>
        )}

        {!profile && (
          <div className="mt-4">
            <AlertBanner
              variant="warning"
              title="Perfil incompleto"
              description="No encontramos un perfil asociado a tu cuenta. Regístrate de nuevo o contacta soporte."
            />
          </div>
        )}

        <div className="mt-8">
          <form
            action={async () => {
              "use server";
              const sb = await createClient();
              await sb.auth.signOut();
              redirect("/login");
            }}
          >
            <Button type="submit" variant="secondary" size="md" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
