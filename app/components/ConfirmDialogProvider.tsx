"use client";

import { createContext, useContext, ReactNode } from "react";
import { useConfirmDialog } from "./ConfirmDialog";

interface ConfirmDialogContextType {
  confirm: (options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: "default" | "danger";
  }) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | null>(
  null
);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {ConfirmDialogComponent}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider");
  }
  return context.confirm;
}

