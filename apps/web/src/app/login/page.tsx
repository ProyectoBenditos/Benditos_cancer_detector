"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            setErrorMsg(error.message);
            return;
        }

        router.push("/platform");
        router.refresh();
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
            <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
                <h1 className="text-2xl font-bold">Ingresar a OncaScan</h1>
                <p className="mt-2 text-sm text-slate-400">
                    Acceso para usuarios autorizados
                </p>

                <form onSubmit={handleLogin} className="mt-6 space-y-4">
                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Correo</label>
                        <input
                            type="email"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-slate-300">Contraseña</label>
                        <input
                            type="password"
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {errorMsg ? <p className="text-sm text-red-400">{errorMsg}</p> : null}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-sky-600 px-4 py-3 font-medium hover:bg-sky-500 disabled:opacity-60"
                    >
                        {loading ? "Ingresando..." : "Ingresar"}
                    </button>
                </form>
            </div>
        </main>
    );
}