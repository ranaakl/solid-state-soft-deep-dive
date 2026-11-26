import type { AcceptanceCriterion, DeepDiveSpec } from "../types/spec";

function escapeGfmCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n+/g, " ").trim();
}

export function formatGherkinCriterion(
  criterion: AcceptanceCriterion,
  index: number
): string {
  const acId = `AC-${String(index + 1).padStart(2, "0")}`;
  return [
    `# ${acId} | Story: ${criterion.storyId}`,
    `Scenario: Verify ${criterion.storyId}`,
    `  Given ${criterion.given.trim()}`,
    `  When ${criterion.when.trim()}`,
    `  Then ${criterion.then.trim()}`,
  ].join("\n");
}

export function specToMarkdown(spec: DeepDiveSpec, brief: string): string {
  const generatedLabel = new Date(spec.generatedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const sections: string[] = [];

  sections.push(`# ${spec.specTitle}`);
  sections.push("");
  sections.push(
    `> **Solid State Soft — Technical Deep Dive Specification**  `
  );
  sections.push(
    `> **Domain:** ${spec.domain} · **Generated:** ${generatedLabel} · **Artifacts:** ${spec.userStories.length} User Stories, ${spec.acceptanceCriteria.length} Gherkin Criteria, ${spec.edgeCases.length} Edge Cases, ${spec.architectureGaps.length} Architecture Gaps`
  );
  sections.push("");

  if (brief.trim()) {
    const safeBrief = brief.trim().replace(/<\/details>/gi, "&lt;/details&gt;");
    sections.push("<details>");
    sections.push("<summary><strong>Source Business Brief</strong></summary>");
    sections.push("");
    sections.push(safeBrief);
    sections.push("");
    sections.push("</details>");
    sections.push("");
  }

  sections.push("## 1. Core User Stories");
  sections.push("");
  sections.push("| ID | As a (Role) | I want (Action) | So that (Benefit) |");
  sections.push("| :--- | :--- | :--- | :--- |");
  spec.userStories.forEach((story) => {
    sections.push(
      `| \`${escapeGfmCell(story.id)}\` | ${escapeGfmCell(story.role)} | ${escapeGfmCell(
        story.action
      )} | ${escapeGfmCell(story.benefit)} |`
    );
  });
  sections.push("");

  sections.push("## 2. Gherkin Acceptance Criteria");
  sections.push("");
  spec.acceptanceCriteria.forEach((criterion, idx) => {
    const acId = `AC-${String(idx + 1).padStart(2, "0")}`;
    sections.push(`### ${acId} — Linked to \`${criterion.storyId}\``);
    sections.push("");
    sections.push("```gherkin");
    sections.push(formatGherkinCriterion(criterion, idx));
    sections.push("```");
    sections.push("");
  });

  sections.push("## 3. QA Edge-Case & Failure Matrix");
  sections.push("");
  sections.push("| ID | Severity | Scenario | Failure Mode | Recommended Safeguard |");
  sections.push("| :--- | :--- | :--- | :--- | :--- |");
  spec.edgeCases.forEach((item, idx) => {
    const qaId = `QA-${String(idx + 1).padStart(2, "0")}`;
    sections.push(
      `| \`${qaId}\` | **${item.severity}** | ${escapeGfmCell(item.scenario)} | ${escapeGfmCell(
        item.failureMode
      )} | ${escapeGfmCell(item.recommendedSafeguard)} |`
    );
  });
  sections.push("");

  sections.push("## 4. Logic & Architecture Gaps");
  sections.push("");
  spec.architectureGaps.forEach((gap, idx) => {
    const gapId = `GAP-${String(idx + 1).padStart(2, "0")}`;
    sections.push(`### ${gapId}: ${gap.title}`);
    sections.push("");
    sections.push(`- **Risk & Ambiguity:** ${gap.risk.trim()}`);
    sections.push(`- **Recommended Architecture:** ${gap.recommendation.trim()}`);
    sections.push("");
  });

  sections.push("---");
  sections.push(
    "*Generated with Solid State Soft Deep Dive — Your Business Logic, Solidified.*"
  );

  return sections.join("\n");
}

export function buildSpecFilename(specTitle: string): string {
  const slug = specTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${slug || "deep-dive-spec"}.md`;
}
