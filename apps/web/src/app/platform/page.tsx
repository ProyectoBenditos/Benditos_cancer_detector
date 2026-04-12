import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LogoutButton from "./logout-button";

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

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                        <h2 className="text-xl font-semibold text-sky-300">Carga DICOM</h2>
                        <p className="mt-3 text-slate-300">
                            Sube un archivo DICOM y registra sus metadatos básicos en la plataforma.
                        </p>

                        <Link
                            href="/platform/upload"
                            className="mt-5 inline-block rounded-xl bg-sky-600 px-5 py-3 font-medium hover:bg-sky-500"
                        >
                            Ir a subir archivo
                        </Link>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                        <h2 className="text-xl font-semibold text-sky-300">Historial de cargas</h2>
                        <p className="mt-3 text-slate-300">
                            Consulta los archivos DICOM ya cargados y revisa sus metadatos básicos.
                        </p>

                        <Link
                            href="/platform/uploads"
                            className="mt-5 inline-block rounded-xl border border-slate-700 px-5 py-3 font-medium hover:bg-slate-800"
                        >
                            Ver historial
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}