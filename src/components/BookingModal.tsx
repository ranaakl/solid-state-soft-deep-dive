import React, { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, X } from "lucide-react";
import type { DomainOption } from "../types/spec";

interface BookingModalProps {
  isOpen: boolean;
  domain: DomainOption;
  specTitle: string | null;
  onClose: () => void;
}

interface BookingConfirmation {
  referenceId: string;
  name: string;
  email: string;
  company: string;
  timeline: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  domain,
  specTitle,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [timeline, setTimeline] = useState("Within 30 days");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          timeline,
          domain,
          specTitle,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Unable to submit request. Please check your details.");
        return;
      }
      setConfirmation(data);
    } catch {
      setError("Network error while scheduling your Deep Dive. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setConfirmation(null);
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1628]/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleResetAndClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden shadow-xl">
        <div className="bg-[#0A1628] text-white px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="booking-modal-title" className="font-display text-lg font-bold tracking-tight">
              Book a Technical Deep Dive
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              45-minute architecture &amp; scoping session with a Solid State Soft principal engineer.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {confirmation ? (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <h3 className="font-display text-base font-semibold text-[#0A1628]">
                  Deep Dive Request Logged
                </h3>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                  Thank you, {confirmation.name}. A principal architect from Solid State Soft will reach out to{" "}
                  <span className="font-medium text-slate-900">{confirmation.email}</span> within one business day with calendar slots.
                </p>
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-4 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between gap-4">
                <span>Reference</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {confirmation.referenceId}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Organization</span>
                <span className="font-medium text-slate-900">{confirmation.company}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Target Window</span>
                <span className="font-medium text-slate-900">{confirmation.timeline}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#1D63FF] hover:bg-[#1551D6] rounded-lg transition-colors cursor-pointer"
              >
                Return to Workbench
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {specTitle && (
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-600">
                <span className="font-medium text-slate-500">Attached context: </span>
                <span className="font-semibold text-slate-900">{specTitle}</span>
                <span className="text-slate-400 mx-1.5">·</span>
                <span>{domain}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="booking-name" className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  id="booking-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Ellis"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#1D63FF] focus:ring-2 focus:ring-[#1D63FF]/20"
                />
              </div>

              <div>
                <label htmlFor="booking-company" className="block text-xs font-medium text-slate-700 mb-1">
                  Company
                </label>
                <input
                  id="booking-company"
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Logistics Inc."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#1D63FF] focus:ring-2 focus:ring-[#1D63FF]/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="booking-email" className="block text-xs font-medium text-slate-700 mb-1">
                  Work Email
                </label>
                <input
                  id="booking-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@acmelogistics.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#1D63FF] focus:ring-2 focus:ring-[#1D63FF]/20"
                />
              </div>

              <div>
                <label htmlFor="booking-timeline" className="block text-xs font-medium text-slate-700 mb-1">
                  Target Kickoff
                </label>
                <select
                  id="booking-timeline"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#1D63FF] focus:ring-2 focus:ring-[#1D63FF]/20"
                >
                  <option value="Immediate (Next 2 weeks)">Immediate (Next 2 weeks)</option>
                  <option value="Within 30 days">Within 30 days</option>
                  <option value="Next quarter">Next quarter</option>
                  <option value="Architecture review only">Architecture review only</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="booking-notes" className="block text-xs font-medium text-slate-700 mb-1">
                Additional Technical Context (Optional)
              </label>
              <textarea
                id="booking-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Existing stack, compliance requirements (SOC 2, HIPAA, PCI), or target launch date..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 resize-none focus:outline-none focus:border-[#1D63FF] focus:ring-2 focus:ring-[#1D63FF]/20"
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-red-700" role="alert">
                {error}
              </p>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#1D63FF] hover:bg-[#1551D6] disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    <span>Request Session</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
