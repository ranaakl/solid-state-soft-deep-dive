import { useCallback, useEffect, useRef, useState } from "react";
import { BookingModal } from "./components/BookingModal";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { InputPanel } from "./components/InputPanel";
import { MethodologyModal } from "./components/MethodologyModal";
import { OutputPanel, type OutputTab } from "./components/OutputPanel";
import { Toast } from "./components/Toast";
import { INITIAL_SAMPLE_SPEC, PRESET_SCENARIOS } from "./data/presets";
import type {
  DeepDiveApiResponse,
  DeepDiveSpec,
  DomainOption,
  PresetScenario,
} from "./types/spec";

const REQUEST_TIMEOUT_MS = 45_000;

function deriveSpecTitle(
  activePresetId: string | null,
  domain: DomainOption,
  brief: string
): string {
  if (activePresetId) {
    const preset = PRESET_SCENARIOS.find((p) => p.id === activePresetId);
    if (preset) return preset.label;
  }
  const firstSentence = brief
    .split(/[\n.!?]/)[0]
    ?.trim()
    .replace(/\s+/g, " ");
  if (firstSentence && firstSentence.length <= 72) {
    return firstSentence;
  }
  return `${domain} Technical Deep Dive`;
}

export default function App() {
  const defaultPreset = PRESET_SCENARIOS[0];

  const [brief, setBrief] = useState<string>(defaultPreset.brief);
  const [domain, setDomain] = useState<DomainOption>(defaultPreset.domain);
  const [activePresetId, setActivePresetId] = useState<string | null>(defaultPreset.id);

  const [spec, setSpec] = useState<DeepDiveSpec | null>(INITIAL_SAMPLE_SPEC);
  const [lastAnalyzedKey, setLastAnalyzedKey] = useState<string>(
    `${defaultPreset.domain}::${defaultPreset.brief.trim()}`
  );

  const [activeTab, setActiveTab] = useState<OutputTab>("stories");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isTimeoutError, setIsTimeoutError] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3200);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToastMessage(null);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  const currentInputKey = `${domain}::${brief.trim()}`;
  const hasUnsyncedChanges = Boolean(spec) && currentInputKey !== lastAnalyzedKey;

  const handleSelectPreset = (preset: PresetScenario) => {
    setBrief(preset.brief);
    setDomain(preset.domain);
    setActivePresetId(preset.id);
    setError(null);
    setIsTimeoutError(false);
    setValidationError(null);
  };

  const handleBriefChange = (value: string) => {
    setBrief(value);
    if (validationError && value.trim().length >= 15) {
      setValidationError(null);
    }
    const matchingPreset = PRESET_SCENARIOS.find(
      (p) => p.brief.trim() === value.trim() && p.domain === domain
    );
    setActivePresetId(matchingPreset ? matchingPreset.id : null);
  };

  const handleDomainChange = (value: DomainOption) => {
    setDomain(value);
    const matchingPreset = PRESET_SCENARIOS.find(
      (p) => p.brief.trim() === brief.trim() && p.domain === value
    );
    setActivePresetId(matchingPreset ? matchingPreset.id : null);
  };

  const handleClearBrief = () => {
    setBrief("");
    setActivePresetId(null);
    setError(null);
    setIsTimeoutError(false);
    setValidationError(null);
    textareaRef.current?.focus();
  };

  const handleRunDeepDive = async () => {
    if (isLoading) return;

    const trimmedBrief = brief.trim();
    if (trimmedBrief.length < 15) {
      setValidationError(
        trimmedBrief.length === 0
          ? "Please enter a business process or feature brief (at least 15 characters), or pick one of the three preset scenarios above."
          : `Your brief is currently ${trimmedBrief.length} characters. Please provide at least 15 characters so Solid State Soft can generate a meaningful technical specification.`
      );
      textareaRef.current?.focus();
      return;
    }

    setValidationError(null);
    setIsLoading(true);
    setError(null);
    setIsTimeoutError(false);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/deep-dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: trimmedBrief, domain }),
        signal: controller.signal,
      });

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const errPayload = payload as { error?: string } | null;
        if (response.status === 504) {
          setIsTimeoutError(true);
        }
        setError(
          errPayload?.error ||
            "Unable to complete the Technical Deep Dive. Please review your brief and retry."
        );
        return;
      }

      const apiData = payload as DeepDiveApiResponse;
      setSpec({
        ...apiData,
        specTitle: deriveSpecTitle(activePresetId, domain, trimmedBrief),
        domain,
        generatedAt: new Date().toISOString(),
        isSample: false,
      });
      setLastAnalyzedKey(`${domain}::${trimmedBrief}`);
      setActiveTab("stories");
    } catch (err: unknown) {
      const isAbort =
        err instanceof DOMException
          ? err.name === "AbortError"
          : (err as { name?: string })?.name === "AbortError";

      if (isAbort) {
        setIsTimeoutError(true);
        setError(
          "The Technical Deep Dive request timed out after 45 seconds. Please retry—or trim the brief slightly if it is very long."
        );
      } else {
        setError(
          "Network error while contacting the Deep Dive engine. Please check your connection and retry."
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const scrollToElement = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 overflow-x-clip">
      <Header
        onOpenBooking={() => setIsBookingOpen(true)}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        onFocusGenerator={() => {
          scrollToElement("workspace");
          textareaRef.current?.focus();
        }}
        onFocusDeliverables={() => scrollToElement("workspace-output")}
      />

      <main
        id="workspace"
        className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Panel (Input) */}
          <div className="lg:col-span-5 min-w-0 lg:sticky lg:top-6">
            <InputPanel
              brief={brief}
              domain={domain}
              activePresetId={activePresetId}
              isLoading={isLoading}
              hasUnsyncedChanges={hasUnsyncedChanges}
              validationError={validationError}
              textareaRef={textareaRef}
              onBriefChange={handleBriefChange}
              onDomainChange={handleDomainChange}
              onSelectPreset={handleSelectPreset}
              onRunDeepDive={handleRunDeepDive}
              onClearBrief={handleClearBrief}
            />
          </div>

          {/* Right Panel (Structured Output) */}
          <div className="lg:col-span-7 min-w-0">
            <OutputPanel
              spec={spec}
              brief={brief}
              isLoading={isLoading}
              error={error}
              isTimeoutError={isTimeoutError}
              activeTab={activeTab}
              hasUnsyncedChanges={hasUnsyncedChanges}
              onTabChange={setActiveTab}
              onRetry={handleRunDeepDive}
              onRunDeepDive={handleRunDeepDive}
              onNotify={showToast}
            />
          </div>
        </div>
      </main>

      <Footer onOpenBooking={() => setIsBookingOpen(true)} />

      <Toast message={toastMessage} onDismiss={dismissToast} />

      <BookingModal
        isOpen={isBookingOpen}
        domain={domain}
        specTitle={spec?.specTitle ?? null}
        onClose={() => setIsBookingOpen(false)}
      />

      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
        onOpenBooking={() => setIsBookingOpen(true)}
      />
    </div>
  );
}
