"use client";

import { Modal } from "./Modal";
import { VIEWER_SHORTCUTS } from "./viewerKeys";

/**
 * Lista de atajos del visor. Debe renderizarse dentro del contenedor del visor:
 * con la Fullscreen API nativa solo se ve lo que está dentro del elemento en
 * pantalla completa.
 */
export function ViewerHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Atajos del visor">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {VIEWER_SHORTCUTS.map(({ keys, description }) => (
          <div key={keys} className="contents">
            <dt>
              <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-700 border border-slate-200">
                {keys}
              </kbd>
            </dt>
            <dd className="text-slate-600">{description}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
