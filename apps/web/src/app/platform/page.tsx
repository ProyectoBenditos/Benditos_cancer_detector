import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LogoutButton from "@/app/platform/logout-button";

export default async function PlatformPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-sky-300">Plataforma privada</p>
                        <h1 className="text-3xl font-bold">OncaScan Platform</h1>
                        <p className="mt-2 text-slate-400">Bienvenido, {user.email}</p>
                    </div>

                    <LogoutButton />
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <h2 className="text-xl font-semibold text-sky-300">Estado actual</h2>
                    <p className="mt-3 text-slate-300">
                        Autenticación funcionando correctamente. El siguiente paso es habilitar
                        la carga de archivos DICOM.
                    </p>
                </div>
            </div>
        </main>
    );
}