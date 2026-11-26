import React from "react";
import { ArrowRight } from "lucide-react";

interface HeaderProps {
  onOpenBooking: () => void;
  onOpenMethodology: () => void;
  onFocusGenerator: () => void;
  onFocusDeliverables: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenBooking,
  onOpenMethodology,
  onFocusGenerator,
  onFocusDeliverables,
}) => {
  return (
    <header className="bg-[#0A1628] text-white border-b border-white/10">
      {/* Top Bar Contract: 3 zones separated by gap-8 on desktop */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-3 sm:gap-8 border-b border-white/10">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#workspace"
            onClick={(e) => {
              e.preventDefault();
              onFocusGenerator();
            }}
            className="inline-flex items-center gap-2 text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D63FF] rounded"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#1D63FF" />
              <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#FFFFFF" fillOpacity="0.9" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#FFFFFF" fillOpacity="0.35" />
              <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#1D63FF" fillOpacity="0.65" />
            </svg>
            <span className="font-display">Solid State Soft</span>
          </a>

          {/* Zone 2: Concise single-line text navigation links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
          >
            <button
              type="button"
              onClick={onFocusGenerator}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D63FF] rounded px-1 py-0.5"
            >
              Generator
            </button>
            <button
              type="button"
              onClick={onOpenMethodology}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D63FF] rounded px-1 py-0.5"
            >
              Methodology
            </button>
            <button
              type="button"
              onClick={onFocusDeliverables}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D63FF] rounded px-1 py-0.5"
            >
              Deliverables
            </button>
            <button
              type="button"
              onClick={onOpenBooking}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D63FF] rounded px-1 py-0.5"
            >
              Contact
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenBooking}
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium text-white bg-[#1D63FF] hover:bg-[#1551D6] active:bg-[#1245B8] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A1628]"
            >
              <span>Book a Deep Dive</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Architectural Title Band */}
        <div className="py-7 sm:py-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="font-display text-2xl sm:text-3xl lg:text-[34px] font-bold tracking-tight text-white leading-tight [text-wrap:balance]">
              &lsquo;Deep Dive&rsquo; Requirements &amp; QA Edge-Case Generator
            </h1>
            <p className="mt-2 text-base sm:text-[17px] text-slate-300 tracking-[0.01em] font-normal">
              Your Business Logic, Solidified.
            </p>
          </div>

          <p className="text-sm text-slate-400 max-w-sm leading-relaxed md:text-right">
            Turn rough product notes into sprint-ready user stories, Gherkin acceptance tests, failure-mode safeguards, and architectural gap briefs.
          </p>
        </div>
      </div>
    </header>
  );
};
