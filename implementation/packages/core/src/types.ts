export interface ContextSource {
  type: 'individual' | 'organization' | 'standard-body' | 'ai-system' | 'community' | 'automated' | 'regulatory' | 'documentation' | 'meeting' | 'incident' | 'unknown';
  uri?: string;
  document_id?: string;
  location?: string;
  extraction_method?: 'manual' | 'llm' | 'regex' | 'api' | 'unknown';
  confidence?: number;
}

export interface AuthoritySource {
  type: 'individual' | 'organization' | 'standard-body' | 'ai-system' | 'community' | 'automated';
  id: string;
  name: string;
  uri?: string;
}

export interface Delegation {
  from: string;
  to: string;
  scope: string;
  effective_date: string;
  expiration?: string | null;
}

export type AuthorityLevel = 0 | 1 | 2 | 3 | 4;

export interface Authority {
  source: AuthoritySource;
  level: AuthorityLevel;
  delegation?: Delegation[];
  trust_model?: 'direct' | 'delegated' | 'community-consensus' | 'ai-inferred';
  trust_score?: number;
  challenge_policy?: {
    process: string;
    uri?: string;
    sla_hours?: number;
  };
}

export type LifecycleStage = 'draft' | 'candidate' | 'approved' | 'active' | 'deprecated' | 'archived';

export type GovernanceClassification =
  | 'hardened-mandate'
  | 'hardened-standard'
  | 'hardened-local'
  | 'local-standard'
  | 'local-guideline'
  | 'local-experimental';

export interface Governance {
  classification: GovernanceClassification;
  approval_required: boolean;
  approvers?: string[];
  min_review_period_hours?: number;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type EnforcementMode = 'block' | 'warn' | 'comment' | 'silent';

export interface EnforcementSpec {
  type: string;
  config?: Record<string, unknown>;
  violation_message_template?: string;
}

export interface Enforcement {
  mode: EnforcementMode;
  specification?: EnforcementSpec;
}

export type ReviewStatus = 'pending' | 'in-review' | 'approved' | 'rejected' | 'needs-revision';

export interface Evidence {
  type: string;
  uri?: string;
  description?: string;
}

export interface LifecycleEvent {
  context_id: string;
  from_stage: LifecycleStage;
  to_stage: LifecycleStage;
  timestamp: string;
  actor: string;
  actor_role?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface Context {
  id: string;
  version: number;
  created_at?: string;
  updated_at?: string;
  title: string;
  description: string;
  source: ContextSource;
  authority: Authority;
  category?: string;
  severity?: Severity;
  applies_to?: string[];
  lifecycle: LifecycleStage;
  governance: Governance;
  effective_date?: string | null;
  deprecated_date?: string | null;
  owner?: string;
  review_status?: ReviewStatus;
  enforcement?: Enforcement;
  evidence?: Evidence[];
  tags?: string[];
  supersedes?: string[];
  superseded_by?: string[];
  metadata?: Record<string, unknown>;
}

export type ChangeStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked';

export interface ChangedFile {
  path: string;
  previous_path?: string;
  status: ChangeStatus;
  binary: boolean;
}

export interface ChangeSet {
  mode: 'working-tree' | 'staged' | 'range';
  base?: string;
  head?: string;
  merge_base?: string;
  files: ChangedFile[];
  warnings: string[];
}

export interface FileGovernanceResult {
  file: ChangedFile;
  relevant_context_ids: string[];
  results: VerificationResult[];
  decision: 'pass' | 'warn' | 'block' | 'not-applicable' | 'not-verifiable';
}

export interface ChangeValidationReport {
  schema_version: '1';
  generated_at: string;
  change_set: ChangeSet;
  files: FileGovernanceResult[];
  totals: { changed: number; checked: number; skipped: number; violations: number; warnings: number };
  merge_decision: 'pass' | 'warn' | 'block';
}

export interface ContextBundleRequest {
  task: string;
  paths?: string[];
  tags?: string[];
  categories?: string[];
  max_contexts?: number;
  max_characters?: number;
}

export interface ContextBundleEntry {
  context: Context;
  rank: number;
  reasons: string[];
  mandatory: boolean;
  estimated_tokens: number;
}

export interface ContextBundle {
  schema_version: '1'; task: string; generated_at: string; entries: ContextBundleEntry[];
  excluded: Array<{ context_id: string; reason: string }>;
  conflicts: Array<{ context_ids: string[]; reason: string }>;
  budget: { max_contexts: number; max_characters: number; used_characters: number; estimated_tokens: number; exceeded_for_mandatory_contexts: boolean };
}

export interface ScannedDocument {
  path: string;
  kind: 'readme' | 'documentation' | 'adr' | 'agent-instruction' | 'ci' | 'manifest' | 'config';
  sha256: string; size_bytes: number; confidential: boolean; changed: boolean;
}

export interface SourceInventory {
  schema_version: '1'; root: string; generated_at: string; documents: ScannedDocument[];
  skipped: Array<{ path: string; reason: string }>;
  totals: { scanned: number; changed: number; skipped: number; bytes: number };
}

export interface DriftSignal {
  probe_id: string; context_id: string; detector: string;
  status: 'aligned' | 'drift' | 'uncertain' | 'error'; confidence: number;
  evidence: Array<{ path: string; description: string; line?: number }>;
}

export interface DriftReport {
  schema_version: '1'; generated_at: string;
  scope: { paths?: string[]; change_set?: ChangeSet };
  signals: DriftSignal[];
  totals: { aligned: number; drift: number; uncertain: number; errors: number };
  recommendation_ids: string[];
}

export interface ContextPackManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  repository?: string;
  dependencies?: { name: string; version: string }[];
  contexts: { id: string; version: number }[];
  effective_date?: string;
}

export interface VerificationViolation {
  location?: {
    line: number;
    column: number;
    end_line?: number;
    end_column?: number;
  };
  description: string;
  severity?: Severity;
  suggestion?: string;
  rule_id?: string;
}

export interface VerificationResult {
  context_id: string;
  artifact_path: string;
  status: 'compliant' | 'violation' | 'not_applicable' | 'error' | 'uncertain';
  violations?: VerificationViolation[];
  confidence?: number;
  metadata?: {
    verifier: string;
    duration_ms: number;
    timestamp: string;
  };
}

export interface EnforcementEvent {
  event_id: string;
  timestamp: string;
  context_id: string;
  context_version: number;
  artifact_path: string;
  artifact_hash?: string;
  status: 'compliant' | 'violation' | 'not_applicable';
  violations?: VerificationViolation[];
  enforcement_action: string;
  actor: {
    type: 'human' | 'ai-agent';
    id: string;
  };
  repository?: string;
  branch?: string;
  commit_sha?: string;
  pull_request_id?: string;
  verifier: {
    type: string;
    version: string;
    duration_ms: number;
  };
}

/**
 * Records that a human or agent dismissed a reported violation as not applicable.
 * Required to compute a true false positive rate (dismissals / violations) per
 * specification 0009. Without these events the rate is uncomputable and the
 * HIGH_FALSE_POSITIVE trigger stays dormant rather than reporting a substitute.
 */
export interface DismissalEvent {
  event_id: string;
  timestamp: string;
  context_id: string;
  artifact_path: string;
  actor: {
    type: 'human' | 'ai-agent';
    id: string;
  };
  reason?: string;
}

export type HealAction =
  | 'deprecate'
  | 'refine-scope'
  | 'review-clarity'
  | 'adjust-threshold'
  | 'register-source'
  | 'archive';

export interface HealEvent {
  heal_id: string;
  timestamp: string;
  recommendation_id: string;
  trigger: string;
  context_id?: string;
  action: HealAction;
  operation: 'apply' | 'rollback';
  actor: string;
  snapshot_id?: string;
  health_before?: number;
  health_after?: number;
  approval_reason?: string;
  reason?: string;
}

export interface RegistryQuery {
  select?: string[];
  conditions: QueryCondition[];
  order_by?: { field: string; desc?: boolean }[];
  limit?: number;
  offset?: number;
}

export interface QueryCondition {
  field: string;
  op: '=' | '!=' | '<' | '<=' | '>' | '>=' | 'IN' | 'NOT IN' | 'BETWEEN' | 'LIKE' | 'GLOB' | 'CONTAINS' | 'CONTAINS_ANY' | 'CONTAINS_ALL' | 'IS NULL' | 'IS NOT NULL';
  value: unknown;
  value2?: unknown;
}

export interface Snapshot {
  snapshot_id: string;
  timestamp: string;
  contexts: Context[];
  count: number;
}

export type TransitionResult =
  | { success: true; context: Context }
  | { success: false; error: string };
