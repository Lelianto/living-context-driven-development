import type { Context, AuthorityLevel, Severity, GovernanceClassification, ContextSource, Authority } from './types.js';

export interface ClassificationSuggestion {
  authority_level: AuthorityLevel;
  authority_source_type: ContextSource['type'];
  governance: GovernanceClassification;
  severity: Severity;
  tags: string[];
  confidence: number;
  reasoning: string[];
}

const SEVERITY_KEYWORDS: Record<string, Severity> = {
  critical: 'critical',
  must: 'critical',
  mandatory: 'critical',
  required: 'high',
  shall: 'high',
  should: 'medium',
  important: 'medium',
  recommended: 'low',
  may: 'low',
  optional: 'low',
  consider: 'low',
  nice: 'low',
  could: 'low',
};

const SOURCE_AUTHORITY_MAP: Record<ContextSource['type'], AuthorityLevel> = {
  'standard-body': 4,
  'regulatory': 4,
  'organization': 3,
  'community': 2,
  'automated': 2,
  'individual': 1,
  'ai-system': 1,
  'documentation': 1,
  'meeting': 1,
  'incident': 2,
  'unknown': 1,
};

const LEVEL_GOVERNANCE_MAP: Record<number, GovernanceClassification> = {
  4: 'hardened-mandate',
  3: 'hardened-standard',
  2: 'local-standard',
  1: 'local-guideline',
  0: 'local-experimental',
};

export class RuleEngine {
  classify(partial: {
    title: string;
    description: string;
    category?: string;
    source_type?: ContextSource['type'];
  }): ClassificationSuggestion {
    const reasoning: string[] = [];
    const sourceType = partial.source_type || 'individual';

    const authorityLevel = SOURCE_AUTHORITY_MAP[sourceType];
    reasoning.push(`Source type "${sourceType}" → authority level ${authorityLevel}`);

    const governance = LEVEL_GOVERNANCE_MAP[authorityLevel];
    reasoning.push(`Authority level ${authorityLevel} → governance "${governance}"`);

    const severity = this.detectSeverity(partial.title, partial.description);
    reasoning.push(`Keyword analysis → severity "${severity}"`);

    const tags = this.generateTags(partial);
    if (tags.length > 0) {
      reasoning.push(`Generated ${tags.length} tag(s): ${tags.join(', ')}`);
    }

    return {
      authority_level: authorityLevel,
      authority_source_type: sourceType,
      governance,
      severity,
      tags,
      confidence: sourceType !== 'unknown' ? 0.85 : 0.5,
      reasoning,
    };
  }

  private detectSeverity(title: string, description: string): Severity {
    const combined = `${title} ${description}`.toLowerCase();
    const wordCounts: Record<string, number> = {};
    for (const [keyword, level] of Object.entries(SEVERITY_KEYWORDS)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = (combined.match(regex) || []).length;
      if (matches > 0) {
        wordCounts[level] = (wordCounts[level] || 0) + matches;
      }
    }

    const order: Severity[] = ['critical', 'high', 'medium', 'low'];
    for (const level of order) {
      if (wordCounts[level] && wordCounts[level] > 0) return level;
    }

    return 'medium';
  }

  private generateTags(partial: {
    title: string;
    description: string;
    category?: string;
  }): string[] {
    const tags = new Set<string>();

    if (partial.category) {
      tags.add(partial.category.toLowerCase());
    }

    const combined = `${partial.title} ${partial.description}`.toLowerCase();

    const domainKeywords: Record<string, string> = {
      security: 'security',
      authentication: 'security',
      authorization: 'security',
      encryption: 'security',
      vulnerability: 'security',
      compliance: 'compliance',
      regulatory: 'compliance',
      regulation: 'compliance',
      privacy: 'privacy',
      gdpr: 'privacy',
      hipaa: 'privacy',
      performance: 'performance',
      latency: 'performance',
      scalability: 'performance',
      testing: 'testing',
      coverage: 'testing',
      deployment: 'devops',
      ci: 'devops',
      cd: 'devops',
      pipeline: 'devops',
      api: 'api',
      endpoint: 'api',
      rest: 'api',
      architecture: 'architecture',
      design: 'architecture',
      pattern: 'architecture',
    };

    for (const [keyword, tag] of Object.entries(domainKeywords)) {
      if (combined.includes(keyword)) {
        tags.add(tag);
      }
    }

    return Array.from(tags);
  }
}
