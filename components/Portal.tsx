"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Renderiza modais direto no body, fora das animações de página. */
export function Portal({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? createPortal(children, document.body) : null;
}
