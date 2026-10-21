"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

const DESKTOP_QUERY = "(min-width: 1024px)"; // breakpoint lg de Tailwind

/**
 * Estructura de la plataforma: menú lateral fijo en escritorio (lg) y menú
 * desplegable sobre el contenido en pantallas angostas.
 */
export function PlatformShell({
  userRole,
  userEmail,
  children,
}: {
  userRole?: string;
  userEmail?: string;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  // Con el menú abierto: Esc lo cierra, el fondo no hace scroll y, si la
  // ventana pasa a escritorio, se cierra para no dejar el scroll bloqueado.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKeyDown);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const desktop = typeof window.matchMedia === "function" ? window.matchMedia(DESKTOP_QUERY) : null;
    const onDesktop = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuOpen(false);
    };
    desktop?.addEventListener("change", onDesktop);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
      desktop?.removeEventListener("change", onDesktop);
    };
  }, [menuOpen, closeMenu]);

  return (
    <div className="min-h-dvh bg-brand-bg flex print:bg-white print:block">
      <div className="print:hidden">
        <Sidebar
          id={menuId}
          userRole={userRole}
          open={menuOpen}
          onClose={closeMenu}
          onNavigate={() => setMenuOpen(false)}
        />
        {menuOpen && (
          <div
            data-testid="menu-backdrop"
            aria-hidden="true"
            onClick={closeMenu}
            className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          />
        )}
      </div>
      {/* min-w-0: sin él, el contenido ancho estira la columna y el móvil aleja el zoom de toda la página. */}
      <div className="relative flex min-h-dvh min-w-0 flex-1 flex-col lg:ml-64 print:ml-0 print:block print:min-h-0">
        <div className="sticky top-0 z-20 print:hidden">
          <Header
            userEmail={userEmail}
            menuId={menuId}
            menuOpen={menuOpen}
            onMenuClick={() => setMenuOpen(true)}
            menuButtonRef={menuButtonRef}
          />
        </div>
        <main className="w-full min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 print:p-0 print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  );
}
