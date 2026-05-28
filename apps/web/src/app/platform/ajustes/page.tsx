import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { AlertBanner } from "@/components/ui/AlertBanner";
import LogoutButton from "@/app/platform/logout-button";

export default async function AjustesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const rolLabel = profile?.role === "admin" ? "Administrador" : profile ? "Médico" : "—";

    return (
        <PageContainer maxWidth="3xl">
            <SectionHeader
                title="Ajustes"
                description="Información de tu cuenta y preferencias de la plataforma."
            />

            <Card className="mb-6">
                <CardContent className="p-6">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Perfil</h2>
                    <dl className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Mail className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Correo electrónico</dt>
                                <dd className="text-sm font-medium text-slate-800 mt-0.5 break-all">{user.email}</dd>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rol</dt>
                                <dd className="text-sm font-medium text-slate-800 mt-0.5">{rolLabel}</dd>
                            </div>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardContent className="p-6">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Sesión</h2>
                    <p className="text-sm text-slate-600 mb-4">
                        Cierra sesión para volver a la pantalla de login. Tu próxima visita requerirá autenticación.
                    </p>
                    <LogoutButton />
                </CardContent>
            </Card>

            <AlertBanner
                variant="info"
                title="Preferencias (próximamente)"
                description="Configuración de tema, idioma y notificaciones llegará en futuras versiones de la plataforma."
            />
        </PageContainer>
    );
}
