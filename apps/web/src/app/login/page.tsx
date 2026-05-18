"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { AlertBanner } from "@/components/ui/AlertBanner";

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
        <main className="flex min-h-screen items-center justify-center bg-brand-sidebar px-6">
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
                        <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">Correo Electrónico</label>
                        <input
                            id="login-email"
                            type="email"
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="usuario@institucion.edu"
                        />
                    </div>

                    <div>
                        <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">Contraseña</label>
                        <input
                            id="login-password"
                            type="password"
                            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary transition-all text-slate-700"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    {errorMsg ? (
                        <AlertBanner
                            variant="error"
                            title="No pudimos iniciar sesión"
                            description={errorMsg}
                        />
                    ) : null}

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={loading}
                        className="w-full"
                    >
                        {loading ? "Ingresando..." : "Iniciar Sesión"}
                    </Button>

                    <p className="text-xs text-center text-slate-400 mt-6">Sistema exclusivo de uso académico controlado</p>
                </form>
            </div>
        </main>
    );
}
