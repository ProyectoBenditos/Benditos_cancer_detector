"use client";

import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Users, Bell, Brain, FileText, Settings, Upload, FileStack } from "lucide-react";
import { PhantomLink } from "../ui/PhantomButton";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/platform" && pathname === "/platform") return true;
    if (path !== "/platform" && pathname?.startsWith(path)) return true;
    return false;
  };

  const linkBase =
    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-sidebar";
  const linkActive = "bg-white/15 text-white shadow-sm";
  const linkInactive = "hover:bg-white/10 hover:text-white";

  return (
    <aside
      aria-label="Menú lateral"
      className="w-64 bg-brand-sidebar text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-white/10"
    >
      <div className="p-6 border-b border-white/10 flex items-center">
        <Image
          src="/images/brand/logo-oncascan.png"
          alt="OncaScan Logo"
          width={160}
          height={42}
          style={{ width: "auto", height: "1.75rem" }}
          priority
          className="object-contain"
        />
      </div>

      <nav aria-label="Navegación principal" className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Clínico Real (Activo)
        </p>

        <Link
          href="/platform"
          className={`${linkBase} ${isActive("/platform") && pathname === "/platform" ? linkActive : linkInactive}`}
        >
          <LayoutDashboard className="w-5 h-5" aria-hidden="true" />
          Dashboard General
        </Link>

        <Link
          href="/platform/upload"
          className={`${linkBase} ${isActive("/platform/upload") ? linkActive : linkInactive}`}
        >
          <Upload className="w-5 h-5" aria-hidden="true" />
          Subir DICOM
        </Link>

        <Link
          href="/platform/uploads"
          className={`${linkBase} ${isActive("/platform/uploads") ? linkActive : linkInactive}`}
        >
          <FileStack className="w-5 h-5" aria-hidden="true" />
          Historial DICOM
        </Link>

        <Link
          href="/platform/analyze"
          className={`${linkBase} ${isActive("/platform/analyze") ? linkActive : linkInactive}`}
        >
          <Brain className="w-5 h-5" aria-hidden="true" />
          Análisis IA
        </Link>

        <Link
          href="/platform/alertas"
          className={`${linkBase} ${isActive("/platform/alertas") ? linkActive : linkInactive}`}
        >
          <Bell className="w-5 h-5 text-brand-danger" aria-hidden="true" />
          Centro de Alertas
        </Link>

        <div className="my-6 border-t border-white/10"></div>

        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Expedientes (Próximamente)
        </p>

        <PhantomLink
          featureName="Módulo de Pacientes"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors opacity-60 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-sidebar"
        >
          <Users className="w-5 h-5" aria-hidden="true" />
          Pacientes Registrados
        </PhantomLink>

        <div className="my-6 border-t border-white/10"></div>

        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Sistema
        </p>

        <PhantomLink
          featureName="Exportación de Reportes"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors opacity-60 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-sidebar"
        >
          <FileText className="w-5 h-5" aria-hidden="true" />
          Exportar Reportes
        </PhantomLink>

        <PhantomLink
          featureName="Ajustes de Plataforma"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors opacity-60 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-sidebar"
        >
          <Settings className="w-5 h-5" aria-hidden="true" />
          Ajustes
        </PhantomLink>
      </nav>

      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            OncaScan MVP v1.0
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse" aria-hidden="true"></span>
        </div>
      </div>
    </aside>
  );
}
