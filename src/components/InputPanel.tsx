import React from "react";
import { AlertCircle, ArrowRight, ChevronDown, Loader2, RotateCcw } from "lucide-react";
import { DOMAIN_OPTIONS, PRESET_SCENARIOS } from "../data/presets";
import type { DomainOption, PresetScenario } from "../types/spec";

interface InputPanelProps {
  brief: string;
  domain: DomainOption;
  activePresetId: string | null;
  isLoading: boolean;
  hasUnsyncedChanges: boolean;
  validationError: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onBriefChange: (value: string) => void;
  onDomainChange: (value: DomainOption) => void;
  onSelectPreset: (preset: PresetScenario) => void;
  onRunDeepDive: () => void;
  onClearBrief: () => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  brief,
  domain,
  activePresetId,
  isLoading,
  hasUnsyncedChanges,
  validationError,
  textareaRef,
  onBriefChange,
  onDomainChange,
  onSelectPreset,
  onRunDeepDive,
  onClearBrief,
}) => {
  const trimmedLen = brief.trim().length;
  const isTooShort = trimmedLen > 0 && trimmedLen < 15;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading) {
      onRunDeepDive();
    }
  };

  return (
    <section
      id="workspace-input"
      aria-label="Business Process Brief Input"
      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 min-w-0"
    >
      <div className="pb-4 sm:pb-5 border-b border-slate-200">
        <h2 className="font-display text-lg font-semibold text-[#0A1628] tracking-tight">
          Business Process Brief
        </h2>
        <p className="mt-1 text-sm text-slate-600 leading-relaxed">
          Paste rough meeting notes, a feature brief, or select a realistic messy scenario below.
        </p>
      </div>

      {/* 3 One-Click Presets */}
      <div className="py-4 sm:py-5 border-b border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-medium text-slate-500">
            One-click example scenarios
          </span>
          <span className="text-xs text-slate-400 tabular-nums shrink-0">3 presets</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {PRESET_SCENARIOS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                disabled={isLoading}
                className={`group w-full min-w-0 text-left px-3.5 py-2.5 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D63FF] disabled:opacity-60 disabled:cursor-not-allowed ${
                  isSelected
                    ? "border-[#1D63FF] bg-[#1D63FF]/[0.04]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2 min-w-0">
                  <span
                    className={`text-sm font-medium leading-snug truncate ${
                      isSelected ? "text-[#1D63FF]" : "text-slate-900 group-hover:text-[#0A1628]"
                    }`}
                  >
                    <span className="font-mono text-xs tabular-nums mr-1.5 opacity-75">
                      {preset.number}.
                    </span>
                    {preset.label}
                  </span>
                  <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
                    {preset.domain.split(" ")[0]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 truncate">
                  {preset.shortTag}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} noValidate className="pt-4 sm:pt-5 space-y-5">
        {/* Domain Dropdown */}
        <div>
          <label
            htmlFor="domain-select"
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Domain
          </label>
          <div className="relative">
            <select
              id="domain-select"
              value={domain}
              disabled={isLoading}
              onChange={(e) => onDomainChange(e.target.value as DomainOption)}
              className="w-full appearance-none bg-white border border-slate-300 rounded-lg pl-3.5 pr-10 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:border-slate-400 focus:outline-none focus:border-[#1D63FF] focus:ring-2 focus:ring-[#1D63FF]/20 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer"
            >
              {DOMAIN_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-4 h-4 text-slate-500 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Business Process Textarea */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label
              htmlFor="business-brief-input"
              className="block text-sm font-medium text-slate-800"
            >
              Rough Business Process or Feature Brief
            </label>
            {brief.length > 0 && (
              <button
                type="button"
                onClick={onClearBrief}
                disabled={isLoading}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <textarea
            ref={textareaRef}
            id="business-brief-input"
            value={brief}
            disabled={isLoading}
            onChange={(e) => onBriefChange(e.target.value)}
            rows={10}
            maxLength={8000}
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? "brief-validation-error" : "brief-helper-text"}
            placeholder="Describe your messy business workflow, approval rules, external API dependencies, edge-case headaches, or launch constraints..."
            className={`w-full bg-[#F8FAFC] focus:bg-white border rounded-lg px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 leading-relaxed resize-y min-h-[200px] transition-colors focus:outline-none focus:ring-2 disabled:opacity-70 ${
              validationError
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                : "border-slate-300 hover:border-slate-400 focus:border-[#1D63FF] focus:ring-[#1D63FF]/20"
            }`}
          />

          {validationError && (
            <div
              id="brief-validation-error"
              role="alert"
              className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
            <span
              id="brief-helper-text"
              className={isTooShort ? "text-amber-700 font-medium" : "text-slate-500"}
            >
              {isTooShort
                ? `Add ${15 - trimmedLen} more character${15 - trimmedLen === 1 ? "" : "s"} (minimum 15 required).`
                : hasUnsyncedChanges
                ? "Brief modified — run Technical Deep Dive to refresh output."
                : "Include roles, thresholds, integrations, and known pain points."}
            </span>
            <span className="font-mono text-slate-400 tabular-nums shrink-0">
              {brief.length.toLocaleString()} / 8,000
            </span>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#1D63FF] hover:bg-[#1551D6] active:bg-[#1245B8] disabled:bg-slate-300 disabled:text-slate-500 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D63FF] focus-visible:ring-offset-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
                <span>Running Technical Deep Dive…</span>
              </>
            ) : (
              <>
                <span>Run Technical Deep Dive</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};
