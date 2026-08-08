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
