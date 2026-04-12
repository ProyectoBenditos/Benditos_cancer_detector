"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
        <main className="flex min-h-screen items-center justify-center bg-[#1a0000] px-6">
            <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-2xl">
                <div className="mb-8 text-center flex flex-col items-center">
                    <Image 
                        src="/images/brand/logo-oncascan.png" 
                        alt="OncaScan Logo" 
                        width={200} 
                        height={50} 
                        style={{ width: 'auto', height: '2.5rem' }}
                        priority
                        className="object-contain mb-2"
                    />
                    <p className="text-sm text-slate-500">
                        Acceso seguro a la plataforma médica
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Correo Electrónico</label>
                        <input
                            type="email"
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300 transition-all text-slate-700"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="usuario@institucion.edu"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
                        <input
                            type="password"
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300 transition-all text-slate-700"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    {errorMsg ? <p className="text-sm text-rose-500 bg-rose-50 p-3 rounded-lg border border-rose-100">{errorMsg}</p> : null}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-rose-600 px-4 py-3.5 font-medium text-white hover:bg-rose-500 disabled:opacity-60 transition-colors mt-2 shadow-sm shadow-rose-200"
                    >
                        {loading ? "Ingresando..." : "Iniciar Sesión"}
                    </button>
                    
                    <p className="text-xs text-center text-slate-400 mt-6">Sistema exclusivo de uso académico controlado</p>
                </form>
            </div>
        </main>
    );
}