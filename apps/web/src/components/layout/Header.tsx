import { User } from "lucide-react";

export function Header({ userEmail = "Usuario" }: { userEmail?: string }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <span className="text-lg font-bold text-brand-primary tracking-tight">OncoScan</span>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
          <User className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-slate-700 truncate max-w-[160px]">{userEmail}</p>
          <p className="text-xs text-slate-500">Médico</p>
        </div>
      </div>
    </header>
  );
}
