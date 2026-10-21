"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Users, Bell, Cpu, FileText, Settings, Upload, FileStack, ShieldCheck, Layers, X } from "lucide-react";
import { usePathname } from "next/navigation";

interface SidebarProps {
  id: string;
  userRole?: string;
  /** Solo aplica en pantallas angostas; en escritorio (lg) el menú está siempre visible. */
  open: boolean;
  onClose: () => void;
  onNavigate: () => void;
}

export function Sidebar({ id, userRole, open, onClose, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

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
    // Cerrado en móvil queda fuera de pantalla e `invisible`: así tampoco entra
    // en el orden de tabulación ni lo leen los lectores de pantalla.
    <aside
      id={id}
      aria-label="Menú lateral"
      data-open={open}
      className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-64 max-w-[85vw] flex-col border-r border-white/10 bg-brand-sidebar text-slate-300 transition-[transform,visibility] duration-200 ease-out motion-reduce:transition-none lg:visible lg:translate-x-0 lg:shadow-none ${
        open ? "visible translate-x-0 shadow-2xl" : "invisible -translate-x-full"
      }`}
    >
      <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
        <Image
          src="/images/brand/logo-osp-icon-dark.png"
          alt=""
          width={44}
          height={44}
          priority
          className="object-contain shrink-0"
        />
        <span className="text-2xl font-bold tracking-tight text-brand-wordmark">OncoScan</span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú"
          className="ml-auto -mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer lg:hidden"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {/* Elegir una sección cierra el menú en móvil. */}
      <nav
        aria-label="Navegación principal"
        className="flex-1 py-6 px-3 space-y-1 overflow-y-auto overscroll-contain"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) onNavigate();
        }}
      >
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
          href="/platform/alertas"
          className={`${linkBase} ${isActive("/platform/alertas") ? linkActive : linkInactive}`}
        >
          <Bell className="w-5 h-5 text-brand-danger" aria-hidden="true" />
          Centro de Alertas
        </Link>

        <Link
          href="/platform/modelo"
          className={`${linkBase} ${isActive("/platform/modelo") ? linkActive : linkInactive}`}
        >
          <Cpu className="w-5 h-5" aria-hidden="true" />
          Detalles del sistema
        </Link>

        <Link
          href="/platform/analyze/batch"
          className={`${linkBase} ${isActive("/platform/analyze/batch") ? linkActive : linkInactive}`}
        >
          <Layers className="w-5 h-5" aria-hidden="true" />
          Análisis por Lote
        </Link>

        <div className="my-6 border-t border-white/10"></div>

        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Expedientes
        </p>

        <Link
          href="/platform/pacientes"
          className={`${linkBase} ${isActive("/platform/pacientes") ? linkActive : linkInactive}`}
        >
          <Users className="w-5 h-5" aria-hidden="true" />
          Pacientes Registrados
        </Link>

        {userRole === "admin" && (
          <>
            <div className="my-6 border-t border-white/10"></div>
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Administración
            </p>
            <Link
              href="/platform/admin/medicos"
              className={`${linkBase} ${isActive("/platform/admin/medicos") ? linkActive : linkInactive}`}
            >
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              Médicos
            </Link>
          </>
        )}

        <div className="my-6 border-t border-white/10"></div>

        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Sistema
        </p>

        <Link
          href="/platform/reportes"
          className={`${linkBase} ${isActive("/platform/reportes") ? linkActive : linkInactive}`}
        >
          <FileText className="w-5 h-5" aria-hidden="true" />
          Exportar Reportes
        </Link>

        <Link
          href="/platform/ajustes"
          className={`${linkBase} ${isActive("/platform/ajustes") ? linkActive : linkInactive}`}
        >
          <Settings className="w-5 h-5" aria-hidden="true" />
          Ajustes
        </Link>
      </nav>

      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            OncoScan MVP v1.0
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse" aria-hidden="true"></span>
        </div>
      </div>
    </aside>
  );
}
