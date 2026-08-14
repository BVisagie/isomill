"use client";

import { useEffect, useId, useRef } from "react";

export function ProvenanceDialog({
  open,
  title,
  note,
  readme,
  json,
  onClose,
}: {
  open: boolean;
  title: string;
  note: string;
  readme: string;
  json: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button
            ref={closeRef}
            className="linkish"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p className="note">{note}</p>
        <h3 className="modal-sub">README.txt</h3>
        <pre className="readme">{readme}</pre>
        <h3 className="modal-sub">provenance.json</h3>
        <pre className="readme">{json}</pre>
      </div>
    </div>
  );
}
