"use client";

import { useId, useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

/**
 * Consentimiento para exportar. Las notas de los marcadores son PHI: la casilla
 * arranca desmarcada y sin ella la imagen lleva solo los números de los pins.
 * Debe renderizarse dentro del visor (se ve también en pantalla completa).
 */
export function ViewerExportDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (includeNotes: boolean) => void;
}) {
  const id = useId();
  const [includeNotes, setIncludeNotes] = useState(false);

  const close = () => {
    setIncludeNotes(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Descargar imagen"
      description="La imagen incluye los números de los marcadores."
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <input
            id={id}
            type="checkbox"
            checked={includeNotes}
            onChange={(e) => setIncludeNotes(e.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-primary"
          />
          <label htmlFor={id} className="text-sm text-slate-700">
            Incluir el texto de las notas (contiene datos clínicos)
            <span className="mt-1 block text-xs text-slate-500">
              Se agrega una leyenda numerada al pie de la imagen. Compártela solo por canales autorizados.
            </span>
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={close}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onConfirm(includeNotes);
              setIncludeNotes(false);
            }}
          >
            Descargar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
