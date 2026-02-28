// src/components/portals/overlayPortal.tsx
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  children: ReactNode;
};

export default function OverlayPortal({ children }: Props) {
  return createPortal(children, document.body);
}
