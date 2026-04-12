"use client";

import Link from "next/link";
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

  return (
    <aside className="w-64 bg-brand-sidebar text-slate-400 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-900">
      <div className="p-6 border-b border-slate-900">
        <h1 className="text-2xl font-bold text-white tracking-wider flex items-center gap-1">
          <span className="text-brand-danger">O</span><span className="text-brand-primary">S</span>
          <span className="ml-1 text-lg">OncaScan</span>
        </h1>
      </div>
      
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Clínico Real (Activo)</p>
        
        <Link 
          href="/platform" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${isActive('/platform') && pathname === '/platform' ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-slate-200'}`}
        >
          <LayoutDashboard className="w-5 h-5 text-brand-primary" />
          Dashboard General
        </Link>
        <Link 
          href="/platform/upload" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${isActive('/platform/upload') ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-slate-200'}`}
        >
          <Upload className="w-5 h-5 text-brand-danger" />
          Subir DICOM
        </Link>
        <Link 
          href="/platform/uploads" 
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${isActive('/platform/uploads') ? 'bg-slate-800 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-slate-200'}`}
        >
          <FileStack className="w-5 h-5 text-slate-300" />
          Historial DICOM
        </Link>
        
        <div className="my-6 border-t border-slate-800/50"></div>

        <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Expedientes (Próximamente)</p>
        
        <PhantomLink featureName="Módulo de Pacientes" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors opacity-60 hover:opacity-100">
          <Users className="w-5 h-5" />
          Pacientes Registrados
        </PhantomLink>
        
        <PhantomLink featureName="Análisis Integrado de IA" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors opacity-60 hover:opacity-100">
          <Brain className="w-5 h-5" />
          Motor de Análisis IA
        </PhantomLink>

        <PhantomLink featureName="Centro de Alertas" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors opacity-60 hover:opacity-100 mt-2">
          <Bell className="w-5 h-5" />
          Centro de Alertas
        </PhantomLink>

        <div className="my-6 border-t border-slate-800/50"></div>

        <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Sistema</p>

        <PhantomLink featureName="Exportación de Reportes" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors opacity-60 hover:opacity-100">
          <FileText className="w-5 h-5" />
          Exportar Reportes
        </PhantomLink>
        
        <PhantomLink featureName="Ajustes de Plataforma" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors opacity-60 hover:opacity-100">
          <Settings className="w-5 h-5" />
          Ajustes
        </PhantomLink>
      </nav>
      
      <div className="p-4 border-t border-slate-900 bg-[#060606]">
        <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">OncaScan MVP v1.0</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
        </div>
      </div>
    </aside>
  );
}
