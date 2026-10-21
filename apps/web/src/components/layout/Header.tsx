import { Menu, User } from "lucide-react";

type HeaderProps = {
  userEmail?: string;
  menuId: string;
  menuOpen: boolean;
  onMenuClick: () => void;
  menuButtonRef: React.Ref<HTMLButtonElement>;
};

export function Header({ userEmail = "Usuario", menuId, menuOpen, onMenuClick, menuButtonRef }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-3 px-4 sm:px-6 w-full">
      <div className="flex items-center gap-2">
        {/* Solo en pantallas angostas: en escritorio el menú está siempre visible. */}
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onMenuClick}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary cursor-pointer lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="text-lg font-bold text-brand-primary tracking-tight">OncoScan</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
          <User className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-slate-700 truncate max-w-[220px]">{userEmail}</p>
          <p className="text-xs text-slate-500">Médico</p>
        </div>
      </div>
    </header>
  );
}
