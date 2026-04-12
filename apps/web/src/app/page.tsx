export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="mb-6 inline-flex w-fit rounded-full border border-sky-800 bg-sky-950/40 px-4 py-1 text-sm text-sky-300">
          OncaScan Platform · Prototipo académico
        </div>

        <h1 className="max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">
          Sistema inteligente de apoyo a la detección temprana de cáncer de pulmón
        </h1>

        <p className="mt-6 max-w-3xl text-lg text-slate-300">
          Plataforma web orientada al análisis de información clínica e imágenes médicas
          para apoyar la priorización de riesgo oncológico en contextos con recursos limitados.
        </p>

        <p className="mt-4 max-w-3xl text-sm text-slate-400">
          Esta solución es una herramienta de apoyo y no reemplaza el juicio clínico del especialista.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="/login"
            className="rounded-xl bg-sky-600 px-6 py-3 font-medium text-white transition hover:bg-sky-500"
          >
            Ingresar a la plataforma
          </a>

          <a
            href="#sobre"
            className="rounded-xl border border-slate-700 px-6 py-3 font-medium text-slate-200 transition hover:bg-slate-900"
          >
            Conocer más
          </a>
        </div>

        <section
          id="sobre"
          className="mt-16 grid gap-6 md:grid-cols-3"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-sky-300">Objetivo</h2>
            <p className="mt-3 text-sm text-slate-300">
              Apoyar al personal de salud en la identificación oportuna de riesgos oncológicos.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-sky-300">MVP inicial</h2>
            <p className="mt-3 text-sm text-slate-300">
              Homepage pública, autenticación, plataforma privada y carga de archivos DICOM.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-sky-300">Stack</h2>
            <p className="mt-3 text-sm text-slate-300">
              Next.js, FastAPI, Supabase, Railway y Vercel.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}