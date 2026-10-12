/** Tipos centrais do domínio RefactorPulse. */

export type MigrationTargetId =
  | "js-to-ts-strict"
  | "java8-to-java21-spring"
  | "py2-to-py312";

export interface MigrationTarget {
  id: MigrationTargetId;
  label: string;
  from: string;
  to: string;
  description: string;
}

export type SourceMode = "github" | "upload";

export interface RepoSource {
  mode: SourceMode;
  name: string;
  branch?: string;
  fileCount?: number;
}

export type AgentId = "mapper" | "tester" | "refactor" | "healer" | "done";

export type AgentStatus = "pending" | "running" | "success" | "error" | "retrying";

export interface AgentLogLine {
  id: string;
  agentId: AgentId;
  timestamp: string;
  level: "info" | "success" | "warning" | "error" | "command";
  message: string;
}

export interface AgentStepDefinition {
  id: AgentId;
  icon: "search" | "flask" | "zap" | "refresh" | "rocket";
  title: string;
  subtitle: string;
}

export interface DiffHunkLine {
  type: "context" | "added" | "removed";
  oldLine?: number;
  newLine?: number;
  content: string;
}

export interface DiffFile {
  path: string;
  language: string;
  linesAdded: number;
  linesRemoved: number;
  oldCode: string;
  newCode: string;
  hunks: DiffHunkLine[];
}

export interface AuditDecision {
  title: string;
  detail: string;
  kind: "architecture" | "dependency" | "test" | "safety";
}

export interface AuditReport {
  summaryMarkdown: string;
  decisions: AuditDecision[];
  testsAdded: number;
  coveragePercent: number;
  dependenciesRemoved: string[];
  dependenciesAdded: string[];
  pullRequestUrl: string;
  pullRequestNumber: number;
}
