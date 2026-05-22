import Image from "next/image";
import Link from "next/link";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { SignupForm } from "./SignupForm";

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-sidebar px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-2xl">
        <div className="mb-8 text-center flex flex-col items-center">
          <Image
            src="/images/brand/logo-oncascan.png"
            alt="OncaScan Logo"
            width={200}
            height={50}
            style={{ width: "auto", height: "2.5rem" }}
            priority
            className="object-contain mb-2"
          />
          <h1 className="text-xl font-bold text-slate-800 mt-3">Registro de médico</h1>
          <p className="text-sm text-slate-500 mt-1">
            Solicita acceso a la plataforma de detección temprana
          </p>
        </div>

        <SuccessOrForm searchParams={searchParams} />

        <p className="text-center text-sm text-slate-500 mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-brand-primary hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}

async function SuccessOrForm({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const params = await searchParams;

  if (params.ok === "true") {
    return (
      <AlertBanner
        variant="info"
        title="Registro recibido"
        description="Un administrador revisará tu información y aprobará tu cuenta. Te llegará confirmación al email."
      />
    );
  }

  return <SignupForm />;
}
