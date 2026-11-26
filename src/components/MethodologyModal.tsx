import React, { useEffect } from "react";
import { ArrowRight, X } from "lucide-react";

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBooking: () => void;
}

const STAGES = [
  {
    number: "01",
    title: "Logic Deconstruction",
    detail:
      "We strip ambiguous prose from stakeholder notes into discrete actor capabilities, state boundaries, and non-negotiable business invariants.",
  },
  {
    number: "02",
    title: "Executable Acceptance Contracts",
    detail:
      "Every critical workflow is translated into Given/When/Then Gherkin scenarios that directly seed automated integration and end-to-end test suites.",
  },
  {
    number: "03",
    title: "Failure-Mode & Edge-Case Modeling",
    detail:
      "Before writing application code, we audit race conditions, webhook replays, partial commits, third-party timeouts, and abuse vectors by severity.",
  },
  {
    number: "04",
    title: "Gap Closure & Architecture Sign-Off",
    detail:
      "Unspoken assumptions are surfaced as concrete trade-off decisions for product and finance leaders—eliminating mid-sprint rewrites.",
  },
];

export const MethodologyModal: React.FC<MethodologyModalProps> = ({
  isOpen,
  onClose,
  onOpenBooking,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1628]/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="methodology-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl overflow-hidden shadow-xl">
        <div className="bg-[#0A1628] text-white px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="methodology-modal-title" className="font-display text-lg font-bold tracking-tight">
              The Solid State Soft Deep Dive Methodology
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              How we convert messy operational requirements into fault-tolerant production software.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close methodology dialog"
            className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="divide-y divide-slate-200">
          {STAGES.map((stage) => (
            <div key={stage.number} className="px-6 py-4 flex items-start gap-4">
              <span className="font-mono text-xs font-semibold text-[#1D63FF] tabular-nums pt-0.5 shrink-0">
                {stage.number}.
              </span>
              <div>
                <h3 className="font-display text-sm font-semibold text-[#0A1628]">
                  {stage.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  {stage.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Ready to harden a critical system before sprint zero?
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenBooking();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D63FF] hover:bg-[#1551D6] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>Book a Deep Dive</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
