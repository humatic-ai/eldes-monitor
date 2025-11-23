"use client";

import { useState, useCallback } from "react";
import Modal from "./Modal";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "default" | "danger";
}

let confirmDialogResolve: ((value: boolean) => void) | null = null;

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions>({
    message: "",
  });

  const confirm = useCallback(
    (opts: ConfirmDialogOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setOptions(opts);
        setIsOpen(true);
        confirmDialogResolve = resolve;
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (confirmDialogResolve) {
      confirmDialogResolve(true);
      confirmDialogResolve = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (confirmDialogResolve) {
      confirmDialogResolve(false);
      confirmDialogResolve = null;
    }
  }, []);

  const ConfirmDialogComponent = (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={options.title}
      size="sm"
      showCloseButton={false}
    >
      <div className="space-y-4">
        {/* Message */}
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
          <p className="text-text-primary flex-1">{options.message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-border rounded-md transition-colors"
          >
            {options.cancelText || "Cancel"}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              options.confirmVariant === "danger"
                ? "bg-danger hover:bg-danger/90 text-white"
                : "bg-accent hover:bg-accent-hover text-white"
            }`}
          >
            {options.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </Modal>
  );

  return { confirm, ConfirmDialogComponent };
}

