import { describe, expect, it } from 'vitest';
import { escapeHtml, getWebHtml } from '../commands/dashboard.js';
import type { DashboardMetrics } from '@lcdd/core';

const metrics: DashboardMetrics = {
  timestamp: '2026-08-08T00:00:00.000Z',
  period_days: 90,
  total_enforcement_events: 1,
  total_lifecycle_events: 1,
  total_contexts: 1,
  violation_trend: [{ period: '7d', total_checks: 1, violations: 1, violation_rate: 1 }],
  actor_breakdown: [{ type: 'human', total_checks: 1, violations: 1, violation_rate: 1 }],
  top_violated: [{ context_id: '</script><script>alert(1)</script>', title: 'bad', severity: 'high', lifecycle: 'active', total_violations: 1, total_checks: 1, violation_rate: 1 }],
  mode_distribution: [{ mode: 'block', count: 1 }],
  lifecycle_velocity: [{ context_id: '<img src=x onerror=alert(1)>', title: '<script>alert(2)</script>', from_stage: 'draft', to_stage: 'active', days: 1 }],
  health_score: 90,
  health_grade: 'A',
};

describe('dashboard web security', () => {
  it('escapes HTML text values', () => {
    expect(escapeHtml('<script>"x"</script>')).toBe('&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
  });

  it('renders untrusted metrics inert and includes SRI', () => {
    const html = getWebHtml(metrics);
    expect(html).not.toContain('</script><script>alert(1)</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>alert(2)</script>');
    expect(html).toContain('integrity="sha384-');
    expect(html).toContain('\\u003c/script\\u003e');
  });
});
