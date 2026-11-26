import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import type { AcceptanceCriterion, DeepDiveSpec, SeverityLevel } from "../types/spec";
import {
  buildSpecFilename,
  formatGherkinCriterion,
  specToMarkdown,
} from "../utils/markdown";

export type OutputTab = "stories" | "gherkin" | "qa" | "gaps";

interface OutputPanelProps {
  spec: DeepDiveSpec | null;
  brief: string;
  isLoading: boolean;
  error: string | null;
  isTimeoutError?: boolean;
  activeTab: OutputTab;
  hasUnsyncedChanges: boolean;
  onTabChange: (tab: OutputTab) => void;
  onRetry: () => void;
  onRunDeepDive: () => void;
  onNotify: (message: string) => void;
}

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
};

function SeverityBadge({ severity }: { severity: SeverityLevel }) {
  const styles: Record<SeverityLevel, string> = {
    Critical: "bg-red-50 text-red-700 border-red-200",
    High: "bg-amber-50 text-amber-800 border-amber-200",
    Medium: "bg-blue-50 text-[#1D63FF] border-blue-200",
  };

  const Icon =
    severity === "Critical"
      ? ShieldAlert
      : severity === "High"
      ? AlertTriangle
      : AlertCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-semibold whitespace-nowrap ${styles[severity]}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{severity}</span>
    </span>
  );
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
  spec,
  brief,
  isLoading,
  error,
  isTimeoutError = false,
  activeTab,
  hasUnsyncedChanges,
  onTabChange,
  onRetry,
  onRunDeepDive,
  onNotify,
}) => {
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [copiedCriterionKey, setCopiedCriterionKey] = useState<string | null>(null);
  const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>({});
  const [severityFilter, setSeverityFilter] = useState<"All" | SeverityLevel>("All");

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  };

  const handleCopyMarkdown = async () => {
    if (!spec) return;
    await copyText(specToMarkdown(spec, brief));
    setCopiedMarkdown(true);
    onNotify("GitHub-ready Markdown spec copied to clipboard.");
    window.setTimeout(() => setCopiedMarkdown(false), 2400);
  };

  const handleDownloadMarkdown = () => {
    if (!spec) return;
    const markdown = specToMarkdown(spec, brief);
    const filename = buildSpecFilename(spec.specTitle);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotify(`Downloaded ${filename}`);
  };

  const handleCopyGherkin = async (
    criterion: AcceptanceCriterion,
    idx: number,
    key: string
  ) => {
    await copyText(formatGherkinCriterion(criterion, idx));
    setCopiedCriterionKey(key);
    onNotify(`Copied Gherkin scenario AC-${String(idx + 1).padStart(2, "0")} (${criterion.storyId}).`);
    window.setTimeout(() => setCopiedCriterionKey(null), 2000);
  };

  const toggleCriterion = (key: string) => {
    setCollapsedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allCollapsed = useMemo(() => {
    if (!spec || spec.acceptanceCriteria.length === 0) return false;
    return spec.acceptanceCriteria.every((_, idx) => Boolean(collapsedKeys[`ac-${idx}`]));
  }, [spec, collapsedKeys]);

  const toggleAllCriteria = () => {
    if (!spec) return;
    if (allCollapsed) {
      setCollapsedKeys({});
    } else {
      const next: Record<string, boolean> = {};
      spec.acceptanceCriteria.forEach((_, idx) => {
        next[`ac-${idx}`] = true;
      });
      setCollapsedKeys(next);
    }
  };

  const storyLookup = useMemo(() => {
    const map = new Map<string, string>();
    if (!spec) return map;
    spec.userStories.forEach((story) => {
      map.set(story.id, story.role);
    });
    return map;
  }, [spec]);

  const sortedEdgeCases = useMemo(() => {
    if (!spec) return [];
    const indexed = spec.edgeCases.map((item, idx) => ({
      ...item,
      displayId: `QA-${String(idx + 1).padStart(2, "0")}`,
    }));
    const sorted = indexed.sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    );
    if (severityFilter === "All") return sorted;
    return sorted.filter((item) => item.severity === severityFilter);
  }, [spec, severityFilter]);

  const severityCounts = useMemo(() => {
    const counts: Record<"All" | SeverityLevel, number> = {
      All: 0,
      Critical: 0,
      High: 0,
      Medium: 0,
    };
    if (!spec) return counts;
    counts.All = spec.edgeCases.length;
    spec.edgeCases.forEach((item) => {
      counts[item.severity] = (counts[item.severity] || 0) + 1;
    });
    return counts;
  }, [spec]);

  if (isLoading) {
    return (
      <section
        id="workspace-output"
        aria-label="Generating Technical Specification"
        aria-busy="true"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden min-w-0"
      >
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2.5 flex-1 min-w-0">
              <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
              <div className="h-6 w-2/3 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-9 w-40 bg-slate-100 rounded-lg animate-pulse shrink-0" />
          </div>
          <p className="mt-4 text-xs font-medium text-[#1D63FF]">
            Analyzing business rules, modeling failure modes, and generating strict JSON acceptance criteria with Gemini…
          </p>
        </div>

        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex items-center gap-5 overflow-hidden bg-[#F8FAFC]">
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse shrink-0" />
          <div className="h-4 w-24 bg-slate-100 rounded animate-pulse shrink-0" />
          <div className="h-4 w-28 bg-slate-100 rounded animate-pulse shrink-0" />
        </div>

        <div className="divide-y divide-slate-200">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="p-4 sm:p-6 space-y-3">
              <div className="h-4 w-1/3 bg-slate-200 rounded animate-pulse" />
              <div className="h-3.5 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-3.5 w-11/12 bg-slate-100 rounded animate-pulse" />
              <div className="h-3.5 w-3/4 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        id="workspace-output"
        aria-label="Specification Generation Error"
        role="alert"
        className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 min-w-0"
      >
        <div className="max-w-lg">
          <div className="flex items-center gap-2.5 text-red-700 font-display font-semibold text-base">
            {isTimeoutError ? (
              <Clock className="w-5 h-5 shrink-0" aria-hidden="true" />
            ) : (
              <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
            )}
            <h3>
              {isTimeoutError
                ? "Technical Deep Dive Timed Out"
                : "Technical Deep Dive Interrupted"}
            </h3>
          </div>
          <p className="mt-2.5 text-sm text-slate-600 leading-relaxed break-words">
            {error}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1D63FF] hover:bg-[#1551D6] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>Retry Deep Dive</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!spec) {
    return (
      <section
        id="workspace-output"
        aria-label="Empty Technical Specification"
        className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 min-w-0"
      >
        <h2 className="font-display text-lg font-semibold text-[#0A1628]">
          Structured Engineering Output
        </h2>
        <p className="mt-2 text-sm text-slate-600 max-w-xl leading-relaxed">
          Enter a business process brief on the left or choose one of the three presets to generate four sprint-ready artifacts:
        </p>

        <ol className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm text-slate-700 border-t border-slate-200 pt-6">
          <li>
            <span className="font-mono text-xs text-slate-400 mr-2">01.</span>
            <span className="font-medium text-slate-900">Core User Stories</span>
            <p className="mt-0.5 text-xs text-slate-500 pl-7">
              Actor-scoped capabilities in As a / I want / So that structure.
            </p>
          </li>
          <li>
            <span className="font-mono text-xs text-slate-400 mr-2">02.</span>
            <span className="font-medium text-slate-900">Gherkin Acceptance Criteria</span>
            <p className="mt-0.5 text-xs text-slate-500 pl-7">
              Executable Given/When/Then scenarios linked to user stories.
            </p>
          </li>
          <li>
            <span className="font-mono text-xs text-slate-400 mr-2">03.</span>
            <span className="font-medium text-slate-900">QA Edge-Case &amp; Failure Matrix</span>
            <p className="mt-0.5 text-xs text-slate-500 pl-7">
              Severity-ranked scenarios, failure modes, and safeguards.
            </p>
          </li>
          <li>
            <span className="font-mono text-xs text-slate-400 mr-2">04.</span>
            <span className="font-medium text-slate-900">Logic &amp; Architecture Gaps</span>
            <p className="mt-0.5 text-xs text-slate-500 pl-7">
              Unspoken risks paired with concrete engineering recommendations.
            </p>
          </li>
        </ol>

        <div className="mt-7">
          <button
            type="button"
            onClick={onRunDeepDive}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1D63FF] hover:bg-[#1551D6] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>Run Technical Deep Dive</span>
          </button>
        </div>
      </section>
    );
  }

  const tabs: { id: OutputTab; label: string; count: number }[] = [
    { id: "stories", label: "Core User Stories", count: spec.userStories.length },
    { id: "gherkin", label: "Gherkin Criteria", count: spec.acceptanceCriteria.length },
    { id: "qa", label: "QA Failure Matrix", count: spec.edgeCases.length },
    { id: "gaps", label: "Logic & Architecture Gaps", count: spec.architectureGaps.length },
  ];

  return (
    <section
      id="workspace-output"
      aria-label="Structured Technical Specification Output"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden min-w-0"
    >
      {/* Output Header */}
      <div className="p-4 sm:p-6 border-b border-slate-200">
        <div className="flex flex-col gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mb-1.5">
              <span className="font-medium text-slate-700">{spec.domain}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{spec.userStories.length} stories</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{spec.acceptanceCriteria.length} criteria</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{spec.edgeCases.length} edge cases</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{spec.architectureGaps.length} gaps</span>
              {spec.isSample && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400">Reference sample</span>
                </>
              )}
            </div>

            <h2 className="font-display text-lg sm:text-xl font-bold text-[#0A1628] tracking-tight leading-snug break-words [text-wrap:balance]">
              {spec.specTitle}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D63FF]"
            >
              {copiedMarkdown ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span className="text-emerald-700">Copied Markdown</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                  <span>Copy Markdown Spec</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D63FF]"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
              <span>Download .md Spec</span>
            </button>
          </div>
        </div>

        {hasUnsyncedChanges && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Your input brief has changed since this specification was produced.
            </span>
            <button
              type="button"
              onClick={onRunDeepDive}
              className="font-semibold text-[#1D63FF] hover:text-[#1551D6] underline underline-offset-2 cursor-pointer whitespace-nowrap"
            >
              Regenerate for updated brief →
            </button>
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div
        role="tablist"
        aria-label="Specification Sections"
        className="flex items-center overflow-x-auto max-w-full border-b border-slate-200 bg-[#F8FAFC] px-3 sm:px-6 gap-1"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`relative px-3 sm:px-3.5 py-3.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1D63FF] ${
                isActive
                  ? "text-[#0A1628] font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`ml-1.5 font-mono text-xs tabular-nums ${
                  isActive ? "text-[#1D63FF]" : "text-slate-400"
                }`}
              >
                ({tab.count})
              </span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#1D63FF] rounded-t"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Panel 1: Core User Stories */}
      {activeTab === "stories" && (
        <div
          id="panel-stories"
          role="tabpanel"
          aria-labelledby="tab-stories"
          className="divide-y divide-slate-200"
        >
          {spec.userStories.map((story) => (
            <article key={story.id} className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-xs font-semibold text-[#1D63FF] tabular-nums">
                  {story.id}
                </span>
                <span className="text-xs text-slate-400">Core User Story</span>
              </div>

              <dl className="space-y-2.5 text-sm leading-relaxed">
                <div className="grid grid-cols-[58px_1fr] sm:grid-cols-[64px_1fr] gap-2.5 sm:gap-3">
                  <dt className="font-semibold text-slate-500">As a</dt>
                  <dd className="font-medium text-[#0A1628] min-w-0 break-words">
                    {story.role}
                  </dd>
                </div>
                <div className="grid grid-cols-[58px_1fr] sm:grid-cols-[64px_1fr] gap-2.5 sm:gap-3">
                  <dt className="font-semibold text-slate-500">I want</dt>
                  <dd className="text-slate-900 min-w-0 break-words">{story.action}</dd>
                </div>
                <div className="grid grid-cols-[58px_1fr] sm:grid-cols-[64px_1fr] gap-2.5 sm:gap-3">
                  <dt className="font-semibold text-slate-500">So that</dt>
                  <dd className="text-slate-700 min-w-0 break-words">{story.benefit}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}

      {/* Panel 2: Gherkin Acceptance Criteria */}
      {activeTab === "gherkin" && (
        <div id="panel-gherkin" role="tabpanel" aria-labelledby="tab-gherkin">
          <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 min-w-0">
              Executable Given / When / Then acceptance criteria
            </span>
            <button
              type="button"
              onClick={toggleAllCriteria}
              className="text-xs font-medium text-[#1D63FF] hover:text-[#1551D6] cursor-pointer whitespace-nowrap shrink-0"
            >
              {allCollapsed ? "Expand all" : "Collapse all"}
            </button>
          </div>

          <div className="divide-y divide-slate-200">
            {spec.acceptanceCriteria.map((criterion, idx) => {
              const key = `ac-${idx}`;
              const acId = `AC-${String(idx + 1).padStart(2, "0")}`;
              const isCollapsed = Boolean(collapsedKeys[key]);
              const linkedRole = storyLookup.get(criterion.storyId);

              return (
                <article key={key} className="px-4 sm:px-6 py-4 sm:py-5">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCriterion(key)}
                      aria-expanded={!isCollapsed}
                      className="flex items-start gap-2 text-left flex-1 min-w-0 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D63FF] rounded"
                    >
                      {isCollapsed ? (
                        <ChevronRight
                          className="w-4 h-4 text-slate-400 mt-0.5 shrink-0 group-hover:text-slate-700"
                          aria-hidden="true"
                        />
                      ) : (
                        <ChevronDown
                          className="w-4 h-4 text-slate-500 mt-0.5 shrink-0 group-hover:text-slate-900"
                          aria-hidden="true"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                          <span className="font-mono font-semibold text-[#1D63FF] tabular-nums">
                            {acId}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-medium text-slate-700 tabular-nums">
                            {criterion.storyId}
                          </span>
                          {linkedRole && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="break-words">{linkedRole}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyGherkin(criterion, idx, key)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors shrink-0 whitespace-nowrap cursor-pointer"
                    >
                      {copiedCriterionKey === key ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="mt-3 ml-0 sm:ml-6 bg-[#F8FAFC] border border-slate-200 rounded-lg p-3.5 sm:p-4 font-mono text-xs sm:text-[13px] leading-relaxed text-slate-800">
                      <div className="space-y-2.5">
                        <div className="flex items-start gap-2.5">
                          <span className="text-[#1D63FF] font-semibold w-11 shrink-0 select-none">
                            Given
                          </span>
                          <span className="min-w-0 break-words whitespace-pre-wrap">
                            {criterion.given}
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="text-amber-700 font-semibold w-11 shrink-0 select-none">
                            When
                          </span>
                          <span className="min-w-0 break-words whitespace-pre-wrap">
                            {criterion.when}
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <span className="text-emerald-700 font-semibold w-11 shrink-0 select-none">
                            Then
                          </span>
                          <span className="min-w-0 break-words whitespace-pre-wrap">
                            {criterion.then}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Panel 3: QA Edge-Case & Failure Matrix */}
      {activeTab === "qa" && (
        <div id="panel-qa" role="tabpanel" aria-labelledby="tab-qa">
          <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <span className="text-xs font-medium text-slate-500">
              Filter by severity
            </span>
            <div
              role="group"
              aria-label="Filter QA edge cases by severity"
              className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-full overflow-x-auto"
            >
              {(["All", "Critical", "High", "Medium"] as const).map((level) => {
                const count = severityCounts[level];
                const isSelected = severityFilter === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverityFilter(level)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-white text-[#0A1628] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>{level}</span>
                    <span className="ml-1 font-mono text-[11px] text-slate-400 tabular-nums">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {sortedEdgeCases.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No {severityFilter.toLowerCase()}-severity edge cases in this specification.
            </div>
          ) : (
            <>
              {/* Mobile stacked rows (< md): zero horizontal overflow on 390px */}
              <div className="md:hidden divide-y divide-slate-200">
                {sortedEdgeCases.map((item) => (
                  <article key={item.displayId} className="p-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <SeverityBadge severity={item.severity} />
                      <span className="font-mono text-xs text-slate-400 tabular-nums">
                        {item.displayId}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <p className="font-medium text-[#0A1628] leading-relaxed break-words">
                        {item.scenario}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed break-words">
                        <span className="font-semibold text-slate-700">Failure mode: </span>
                        {item.failureMode}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 mb-1">
                        Expected Safeguard
                      </div>
                      <p className="text-slate-700 leading-relaxed break-words">
                        {item.recommendedSafeguard}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop structured matrix (md+) */}
              <div className="hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-[#F8FAFC] text-xs font-semibold text-slate-500">
                      <th scope="col" className="py-3 pl-6 pr-4 w-32 whitespace-nowrap">
                        Severity
                      </th>
                      <th scope="col" className="py-3 px-4 w-[44%]">
                        Scenario &amp; Failure Mode
                      </th>
                      <th scope="col" className="py-3 pl-4 pr-6">
                        Expected Safeguard
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm align-top">
                    {sortedEdgeCases.map((item) => (
                      <tr
                        key={item.displayId}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-4 pl-6 pr-4 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1.5">
                            <SeverityBadge severity={item.severity} />
                            <span className="font-mono text-xs text-slate-400 tabular-nums">
                              {item.displayId}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 space-y-2">
                          <p className="font-medium text-[#0A1628] leading-relaxed break-words">
                            {item.scenario}
                          </p>
                          <p className="text-xs text-slate-600 leading-relaxed break-words">
                            <span className="font-semibold text-slate-700">Failure mode: </span>
                            {item.failureMode}
                          </p>
                        </td>
                        <td className="py-4 pl-4 pr-6">
                          <p className="text-slate-700 leading-relaxed break-words">
                            {item.recommendedSafeguard}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Panel 4: Logic & Architecture Gaps */}
      {activeTab === "gaps" && (
        <div
          id="panel-gaps"
          role="tabpanel"
          aria-labelledby="tab-gaps"
          className="divide-y divide-slate-200"
        >
          {spec.architectureGaps.map((gap, idx) => {
            const gapId = `GAP-${String(idx + 1).padStart(2, "0")}`;
            return (
              <article key={gapId} className="p-4 sm:p-6">
                <div className="flex items-baseline gap-2.5 mb-3 min-w-0">
                  <span className="font-mono text-xs font-semibold text-[#1D63FF] tabular-nums shrink-0">
                    {gapId}
                  </span>
                  <h3 className="font-display text-base font-semibold text-[#0A1628] leading-snug min-w-0 break-words">
                    {gap.title}
                  </h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 mb-1">
                      Risk &amp; Unresolved Ambiguity
                    </h4>
                    <p className="text-slate-700 leading-relaxed break-words">{gap.risk}</p>
                  </div>

                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg px-3.5 sm:px-4 py-3">
                    <h4 className="text-xs font-semibold text-[#0A1628] mb-1">
                      Recommended Architecture
                    </h4>
                    <p className="text-slate-700 leading-relaxed break-words">
                      {gap.recommendation}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
