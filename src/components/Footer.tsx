import React from "react";
import { ArrowRight } from "lucide-react";

interface FooterProps {
  onOpenBooking: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenBooking }) => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="font-display font-semibold text-[#0A1628]">Solid State Soft</span>
          <span aria-hidden="true">·</span>
          <span>B2B Technical Consultancy &amp; Systems Architecture</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
          <span>Want Solid State Soft to architect and build this?</span>
          <button
            type="button"
            onClick={onOpenBooking}
            className="inline-flex items-center gap-1 font-semibold text-[#1D63FF] hover:text-[#1551D6] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D63FF] rounded"
          >
            <span>Book a Deep Dive</span>
            <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
};
