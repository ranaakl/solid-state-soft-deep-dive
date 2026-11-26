export type DomainOption =
  | "E-Commerce & Drops"
  | "Fintech & Payments"
  | "B2B SaaS / Operations"
  | "Healthcare / Booking";

export type SeverityLevel = "Critical" | "High" | "Medium";

export interface UserStory {
  id: string;
  role: string;
  action: string;
  benefit: string;
}

export interface AcceptanceCriterion {
  storyId: string;
  given: string;
  when: string;
  then: string;
}

export interface EdgeCase {
  severity: SeverityLevel;
  scenario: string;
  failureMode: string;
  recommendedSafeguard: string;
}

export interface ArchitectureGap {
  title: string;
  risk: string;
  recommendation: string;
}

export interface DeepDiveApiResponse {
  userStories: UserStory[];
  acceptanceCriteria: AcceptanceCriterion[];
  edgeCases: EdgeCase[];
  architectureGaps: ArchitectureGap[];
}

export interface DeepDiveSpec extends DeepDiveApiResponse {
  specTitle: string;
  domain: DomainOption;
  generatedAt: string;
  isSample?: boolean;
}

export interface PresetScenario {
  id: string;
  number: string;
  label: string;
  shortTag: string;
  domain: DomainOption;
  brief: string;
}
