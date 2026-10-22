import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ScanLine } from "lucide-react";
import { ViewerDemo } from "./ViewerDemo";

export const metadata = { title: "Pulmones 3D · OncoScan", description: "TC torácica real con segmentación lobar MONAI y activación HiResCAM en 3D." };

export default function LungDemoPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-8 flex items-center justify-between text-sm">
          <Link href="/platform/upload" className="inline-flex items-center gap-2 font-medium text-slate-600 hover:text-slate-950"><ArrowLeft className="h-4 w-4" />Cargar un estudio</Link>
          <span className="inline-flex items-center gap-2 font-semibold text-[#012641]"><ScanLine className="h-5 w-5" />OncoScan</span>
        </nav>
        <div className="mb-6 max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Exploración volumétrica · Muestra pública</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Anatomía y activación, en el mismo espacio.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Una TC torácica real de 139 cortes. Los cinco lóbulos se segmentan con MONAI; el mapa HiResCAM del modelo local se calcula por corte y se registra sobre el volumen. Cambia de vista, gira los pulmones o abre un plano para explorar su interior.</p>
        </div>
        <ViewerDemo />
        <div className="mt-5 flex flex-col justify-between gap-3 text-xs leading-5 text-slate-500 sm:flex-row">
          <p className="max-w-2xl">Demostración con CTChest de 3D Slicer. La activación explica el componente neuronal del clasificador y no confirma la presencia de un tumor. La respiración del visor es ilustrativa.</p>
          <a href="https://slicer.readthedocs.io/en/latest/user_guide/modules/sampledata.html" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-slate-700 hover:underline">Fuente de la TC<ArrowUpRight className="h-3 w-3" /></a>
        </div>
      </div>
    </main>
  );
}
