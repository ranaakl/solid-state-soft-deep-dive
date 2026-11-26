import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_DOMAINS = [
  "E-Commerce & Drops",
  "Fintech & Payments",
  "B2B SaaS / Operations",
  "Healthcare / Booking",
] as const;

type DomainOption = (typeof ALLOWED_DOMAINS)[number];

const DEEP_DIVE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    userStories: {
      type: Type.ARRAY,
      description: "5 to 6 core functional and operational user stories.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: "Sequential identifier such as US-01",
          },
          role: {
            type: Type.STRING,
            description: "The user persona or system actor (the 'As a' clause, without repeating 'As a')",
          },
          action: {
            type: Type.STRING,
            description: "The capability or action required (the 'I want' clause, without repeating 'I want')",
          },
          benefit: {
            type: Type.STRING,
            description: "The measurable business outcome (the 'So that' clause, without repeating 'So that')",
          },
        },
        required: ["id", "role", "action", "benefit"],
      },
    },
    acceptanceCriteria: {
      type: Type.ARRAY,
      description: "5 to 6 concrete Gherkin acceptance criteria scenarios linked to user stories.",
      items: {
        type: Type.OBJECT,
        properties: {
          storyId: {
            type: Type.STRING,
            description: "Referenced user story ID such as US-01",
          },
          given: {
            type: Type.STRING,
            description: "Initial system state and preconditions (without leading 'Given')",
          },
          when: {
            type: Type.STRING,
            description: "Triggering user or system event (without leading 'When')",
          },
          then: {
            type: Type.STRING,
            description: "Observable, testable outcome and system invariants (without leading 'Then')",
          },
        },
        required: ["storyId", "given", "when", "then"],
      },
    },
    edgeCases: {
      type: Type.ARRAY,
      description: "6 to 9 high-signal QA edge cases and failure modes tailored to the brief and domain.",
      items: {
        type: Type.OBJECT,
        properties: {
          severity: {
            type: Type.STRING,
            enum: ["Critical", "High", "Medium"],
            description: "Risk severity level: Critical, High, or Medium",
          },
          scenario: {
            type: Type.STRING,
            description: "Concrete edge-case scenario and triggering condition.",
          },
          failureMode: {
            type: Type.STRING,
            description: "What specifically fails or degrades in production without a safeguard.",
          },
          recommendedSafeguard: {
            type: Type.STRING,
            description: "Specific technical safeguard, recovery mechanism, and QA verification control.",
          },
        },
        required: ["severity", "scenario", "failureMode", "recommendedSafeguard"],
      },
    },
    architectureGaps: {
      type: Type.ARRAY,
      description: "4 to 6 unspoken business logic contradictions, missing state transitions, or architectural ambiguities.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "Concise title naming the architectural or business-logic gap.",
          },
          risk: {
            type: Type.STRING,
            description: "The ambiguity in the brief and its concrete production, financial, or compliance risk.",
          },
          recommendation: {
            type: Type.STRING,
            description: "Solid State Soft's concrete architectural recommendation and stakeholder decision to lock down.",
          },
        },
        required: ["title", "risk", "recommendation"],
      },
    },
  },
  required: ["userStories", "acceptanceCriteria", "edgeCases", "architectureGaps"],
};

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function generateWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      const errObj = error as { status?: number; code?: number; message?: string };
      const status = errObj?.status ?? errObj?.code;
      const isRetryable =
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        (typeof errObj?.message === "string" &&
          /ECONNRESET|ETIMEDOUT|UNAVAILABLE|fetch failed/i.test(errObj.message));

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      const delayMs = 600 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function normalizeSeverity(value: string): "Critical" | "High" | "Medium" {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "critical") return "Critical";
  if (normalized === "high") return "High";
  return "Medium";
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "256kb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.post("/api/deep-dive", async (req: Request, res: Response) => {
    const rawBrief = typeof req.body?.brief === "string" ? req.body.brief.trim() : "";
    const rawDomain = typeof req.body?.domain === "string" ? req.body.domain.trim() : "";

    if (rawBrief.length < 15) {
      res.status(400).json({
        error: "Please provide at least a short description (15+ characters) of the business process or feature.",
      });
      return;
    }

    if (rawBrief.length > 8000) {
      res.status(400).json({
        error: "The business brief exceeds the 8,000-character limit. Please trim it and try again.",
      });
      return;
    }

    const domain: DomainOption = ALLOWED_DOMAINS.includes(rawDomain as DomainOption)
      ? (rawDomain as DomainOption)
      : "B2B SaaS / Operations";

    try {
      const ai = createGeminiClient();

      const systemInstruction = [
        "You are a Principal Systems Architect and QA Lead at Solid State Soft, a high-rigor B2B technical consultancy.",
        "Your job is to dissect rough, messy business processes and feature briefs into unambiguous, sprint-ready technical specifications.",
        "Be relentlessly concrete: uncover real distributed-systems and QA failure modes (race conditions, partial commits, webhook replays, stale caches, idempotency collisions, timezone/DST bugs, rounding drift, permission/RBAC bypasses, and audit gaps) specific to the provided domain.",
        "Avoid generic filler like 'add proper error handling'—specify exact engineering safeguards (e.g., Redis Lua atomic decrement, transactional outbox, idempotency keys, optimistic locking, immutable double-entry ledger, row-level SELECT FOR UPDATE SKIP LOCKED).",
        "Return valid JSON strictly matching the response schema.",
      ].join(" ");

      const prompt = [
        `Domain: ${domain}`,
        "",
        "Rough Business Process / Feature Brief:",
        rawBrief,
        "",
        "Generate a Technical Deep Dive containing:",
        "1. userStories (5-6 core stories with id, role, action, benefit)",
        "2. acceptanceCriteria (5-6 Gherkin Given/When/Then scenarios tied to storyId)",
        "3. edgeCases (6-9 QA edge cases with severity Critical/High/Medium, scenario, failureMode, recommendedSafeguard)",
        "4. architectureGaps (4-6 logic & architecture gaps with title, risk, recommendation)",
      ].join("\n");

      const GEMINI_TIMEOUT_MS = 42_000;
      const runWithTimeout = async <T,>(promise: Promise<T>): Promise<T> => {
        let timerId: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
              timerId = setTimeout(() => reject(new Error("UPSTREAM_TIMEOUT")), GEMINI_TIMEOUT_MS);
            }),
          ]);
        } finally {
          if (timerId) clearTimeout(timerId);
        }
      };

      const response = await generateWithRetry(() =>
        runWithTimeout(
          ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: DEEP_DIVE_RESPONSE_SCHEMA,
            },
          })
        )
      );

      const rawText = response.text?.trim();
      if (!rawText) {
        res.status(502).json({
          error: "The model returned an empty specification. Please retry your Deep Dive.",
        });
        return;
      }

      const parsed = JSON.parse(rawText);

      const sanitized = {
        userStories: Array.isArray(parsed.userStories)
          ? parsed.userStories.map((story: Record<string, unknown>, idx: number) => ({
              id: String(story.id || `US-${String(idx + 1).padStart(2, "0")}`),
              role: String(story.role || ""),
              action: String(story.action || ""),
              benefit: String(story.benefit || ""),
            }))
          : [],
        acceptanceCriteria: Array.isArray(parsed.acceptanceCriteria)
          ? parsed.acceptanceCriteria.map((item: Record<string, unknown>, idx: number) => ({
              storyId: String(item.storyId || `US-${String(idx + 1).padStart(2, "0")}`),
              given: String(item.given || ""),
              when: String(item.when || ""),
              then: String(item.then || ""),
            }))
          : [],
        edgeCases: Array.isArray(parsed.edgeCases)
          ? parsed.edgeCases.map((item: Record<string, unknown>) => ({
              severity: normalizeSeverity(String(item.severity || "Medium")),
              scenario: String(item.scenario || ""),
              failureMode: String(item.failureMode || ""),
              recommendedSafeguard: String(item.recommendedSafeguard || ""),
            }))
          : [],
        architectureGaps: Array.isArray(parsed.architectureGaps)
          ? parsed.architectureGaps.map((gap: Record<string, unknown>) => ({
              title: String(gap.title || "Architectural Gap"),
              risk: String(gap.risk || ""),
              recommendation: String(gap.recommendation || ""),
            }))
          : [],
      };

      res.json(sanitized);
    } catch (error: unknown) {
      const errObj = error as { status?: number; code?: number; message?: string };
      const message = errObj?.message || "Unknown server error";
      const status = errObj?.status ?? errObj?.code;

      if (message === "MISSING_API_KEY") {
        res.status(503).json({
          error:
            "Gemini API key is not configured. Please verify your API key in Settings > Secrets.",
        });
        return;
      }

      if (message === "UPSTREAM_TIMEOUT") {
        res.status(504).json({
          error:
            "The Gemini API request timed out while generating your specification. Please retry your Technical Deep Dive.",
        });
        return;
      }

      if (status === 403 || status === 400 || /API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
        res.status(403).json({
          error:
            "Unable to authenticate with Gemini API. Please check or select an API key in Settings > Secrets.",
        });
        return;
      }

      if (status === 429 || /RESOURCE_EXHAUSTED/i.test(message)) {
        res.status(429).json({
          error:
            "Gemini API rate limit or quota reached. Please wait a moment and retry, or select a billing-enabled key in Settings > Secrets.",
        });
        return;
      }

      console.error("[/api/deep-dive] Generation error:", error);
      res.status(500).json({
        error: "Failed to generate the Technical Deep Dive specification. Please retry.",
      });
    }
  });

  app.post("/api/consultation", (req: Request, res: Response) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const company = typeof req.body?.company === "string" ? req.body.company.trim() : "";
    const timeline = typeof req.body?.timeline === "string" ? req.body.timeline.trim() : "";

    if (!name || name.length < 2) {
      res.status(400).json({ error: "Please enter your full name." });
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Please enter a valid work email address." });
      return;
    }

    if (!company || company.length < 2) {
      res.status(400).json({ error: "Please enter your company name." });
      return;
    }

    const referenceId = `SSS-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    res.status(201).json({
      referenceId,
      receivedAt: new Date().toISOString(),
      name,
      email,
      company,
      timeline: timeline || "Within 30 days",
    });
  });

  if (process.env.NODE_ENV === "production") {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.use("*", async (req: Request, res: Response, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, "0.0.0.0", () => {
    console.log(`Solid State Soft Deep Dive running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
