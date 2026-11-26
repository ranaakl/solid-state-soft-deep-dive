import React from "react";
import { CheckCircle2, X } from "lucide-react";

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 pointer-events-none flex justify-end"
    >
      <div className="pointer-events-auto w-full sm:w-auto inline-flex items-center gap-2.5 bg-[#0A1628] text-white border border-white/15 rounded-lg px-4 py-3 shadow-lg text-sm">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
        <span className="leading-snug flex-1 min-w-0 break-words">{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="p-1 text-slate-400 hover:text-white rounded transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
