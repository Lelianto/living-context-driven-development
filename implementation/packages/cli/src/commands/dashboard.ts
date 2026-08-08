import { FileRegistry, DashboardService, type DashboardMetrics } from '@lcdd/core';
import chalk from 'chalk';
import { createServer, IncomingMessage, ServerResponse } from 'http';

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function bar(pct: number, width: number = 20): string {
  const filled = Math.round(pct * width);
  return chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(width - filled));
}

function printTerminal(metrics: DashboardMetrics): void {
  console.log('');
  console.log(chalk.bold('LCDD Dashboard'));
  console.log(chalk.dim(`Period: ${metrics.period_days} days | Contexts: ${metrics.total_contexts} | Enforcement events: ${metrics.total_enforcement_events} | Lifecycle events: ${metrics.total_lifecycle_events}`));
  console.log(chalk.dim(`Timestamp: ${metrics.timestamp}`));
  console.log('');

  const gradeColor = metrics.health_grade === 'A' ? chalk.green : metrics.health_grade === 'B' ? chalk.blue : metrics.health_grade === 'C' ? chalk.yellow : chalk.red;
  console.log(`  Health Score: ${bar(metrics.health_score / 100)} ${gradeColor.bold(metrics.health_grade)} (${metrics.health_score}%)`);
  console.log('');

  console.log(chalk.bold('Violation Trend'));
  console.log(chalk.dim('─'.repeat(55)));
  for (const t of metrics.violation_trend) {
    const rate = (t.violation_rate * 100).toFixed(1);
    const color = t.violation_rate > 0.2 ? chalk.red : t.violation_rate > 0.1 ? chalk.yellow : chalk.green;
    console.log(`  ${t.period.padEnd(4)} ${bar(1 - t.violation_rate, 15)}  ${color(rate + '%')}  ${t.total_checks} checks, ${t.violations} violations`);
  }
  console.log('');

  console.log(chalk.bold('Actor Breakdown'));
  console.log(chalk.dim('─'.repeat(55)));
  for (const a of metrics.actor_breakdown) {
    const type = a.type === 'human' ? chalk.cyan('human   ') : chalk.magenta('ai-agent');
    const rate = (a.violation_rate * 100).toFixed(1);
    if (a.total_checks === 0) {
      console.log(`  ${type}  ${chalk.dim('no data')}`);
    } else {
      console.log(`  ${type}  ${bar(1 - a.violation_rate, 15)}  ${chalk.yellow(rate + '%')}  ${a.total_checks} checks, ${a.violations} violations`);
    }
  }

  const drift = metrics.actor_breakdown.find(a => a.type === 'ai-agent')?.violation_rate || 0;
  const human = metrics.actor_breakdown.find(a => a.type === 'human')?.violation_rate || 0;
  if (human > 0 && drift / human > 2) {
    console.log(`  ${chalk.red('⚠ AI drift detected — agent violation rate >2x human')}`);
  }
  console.log('');

  if (metrics.top_violated.length > 0) {
    console.log(chalk.bold('Top Violated Contexts'));
    console.log(chalk.dim('─'.repeat(55)));
    for (const ctx of metrics.top_violated.slice(0, 5)) {
      const statusIcon = ctx.lifecycle === 'active' ? chalk.green('●') :
                          ctx.lifecycle === 'deprecated' ? chalk.yellow('●') : chalk.dim('●');
      const rateStr = (ctx.violation_rate * 100).toFixed(0);
      console.log(`  ${statusIcon} ${chalk.cyan(ctx.context_id)}  ${chalk.dim(ctx.severity)}  ${ctx.total_violations}v / ${ctx.total_checks}c (${rateStr}%)  ${chalk.dim(ctx.title.slice(0, 40))}`);
    }
    console.log('');
  }

  if (metrics.mode_distribution.length > 0) {
    console.log(chalk.bold('Enforcement Mode Distribution'));
    console.log(chalk.dim('─'.repeat(55)));
    const total = metrics.mode_distribution.reduce((s, m) => s + m.count, 0);
    for (const m of metrics.mode_distribution) {
      const pct = ((m.count / total) * 100).toFixed(0);
      const color = m.mode === 'block' ? chalk.red : m.mode === 'warn' ? chalk.yellow : m.mode === 'comment' ? chalk.blue : chalk.dim;
      console.log(`  ${color(m.mode.padEnd(8))} ${bar(m.count / total, 15)}  ${pct}%  (${m.count})`);
    }
    console.log('');
  }

  if (metrics.lifecycle_velocity.length > 0) {
    console.log(chalk.bold('Lifecycle Velocity (fastest transitions)'));
    console.log(chalk.dim('─'.repeat(55)));
    for (const v of metrics.lifecycle_velocity.slice(0, 5)) {
      const speed = v.days <= 3 ? chalk.green : v.days <= 7 ? chalk.yellow : chalk.red;
      console.log(`  ${chalk.cyan(v.context_id)}  ${v.from_stage} → ${v.to_stage}  ${speed(v.days + 'd')}  ${chalk.dim(v.title.slice(0, 30))}`);
    }
    console.log('');
  }
}

export function getWebHtml(metrics: DashboardMetrics): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LCDD Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" integrity="sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb" crossorigin="anonymous"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; padding: 24px; }
  h1 { font-size: 24px; margin-bottom: 8px; }
  .meta { color: #8b949e; font-size: 13px; margin-bottom: 24px; }
  .scorecard { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 24px; }
  .score { font-size: 64px; font-weight: 700; }
  .score-A { color: #3fb950; } .score-B { color: #58a6ff; } .score-C { color: #d29922; } .score-D { color: #f85149; } .score-F { color: #f85149; }
  .info { color: #8b949e; font-size: 14px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 20px; }
  .card h2 { font-size: 16px; margin-bottom: 16px; color: #58a6ff; }
  .chart-wrap { position: relative; height: 200px; }
  .chart-wrap-small { position: relative; height: 180px; }
  .stat { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #21262d; font-size: 13px; }
  .stat-name { color: #8b949e; }
  .full { grid-column: 1 / -1; }
  @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<h1>LCDD Dashboard</h1>
<div class="meta">Period: ${metrics.period_days} days | Contexts: ${metrics.total_contexts} | Enforcement events: ${metrics.total_enforcement_events} | Lifecycle events: ${metrics.total_lifecycle_events}</div>

<div class="scorecard">
  <div class="score score-${metrics.health_grade}">${metrics.health_grade}</div>
  <div>
    <div style="font-size: 20px; font-weight: 600;">Health Score: ${metrics.health_score}%</div>
    <div class="info">Based on violation rate across ${metrics.total_enforcement_events} enforcement checks</div>
  </div>
</div>

<div class="grid">
  <div class="card">
    <h2>Violation Trend</h2>
    <div class="chart-wrap"><canvas id="trendChart"></canvas></div>
  </div>
  <div class="card">
    <h2>Actor Breakdown</h2>
    <div class="chart-wrap"><canvas id="actorChart"></canvas></div>
  </div>
  <div class="card">
    <h2>Top Violated Contexts</h2>
    <div class="chart-wrap"><canvas id="violatedChart"></canvas></div>
  </div>
  <div class="card">
    <h2>Enforcement Mode Distribution</h2>
    <div class="chart-wrap"><canvas id="modeChart"></canvas></div>
  </div>
  ${metrics.lifecycle_velocity.length > 0 ? `<div class="card full">
    <h2>Lifecycle Velocity</h2>
    ${metrics.lifecycle_velocity.slice(0, 5).map(v => `<div class="stat"><span class="stat-name">${escapeHtml(v.context_id)}</span><span>${escapeHtml(v.from_stage)} → ${escapeHtml(v.to_stage)}</span><span>${escapeHtml(v.days)} days</span><span style="color: #8b949e;">${escapeHtml(v.title.slice(0, 40))}</span></div>`).join('')}
  </div>` : ''}
</div>

<script>
const dark = { color: '#8b949e', borderColor: '#30363d' };
const colors = ['#58a6ff','#3fb950','#d29922','#f85149','#bc8cff','#f778ba','#79c0ff'];
Chart.defaults.color = '#8b949e';
Chart.defaults.borderColor = '#30363d';

new Chart(document.getElementById('trendChart'), {
  type: 'line',
  data: {
    labels: ${safeJson(metrics.violation_trend.map(t => t.period))},
    datasets: [{
      label: 'Violation Rate %',
      data: ${safeJson(metrics.violation_trend.map(t => +(t.violation_rate * 100).toFixed(1)))},
      borderColor: '#f85149', backgroundColor: 'rgba(248,81,73,0.12)', fill: true, tension: 0.3
    },{
      label: 'Checks',
      data: ${safeJson(metrics.violation_trend.map(t => t.total_checks))},
      borderColor: '#58a6ff', backgroundColor: 'rgba(88,166,255,0.08)', fill: true, tension: 0.3, yAxisID: 'y1'
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' } }, y1: { position: 'right', beginAtZero: true, grid: { display: false } } },
    plugins: { legend: { labels: { boxWidth: 12, padding: 12 } } }
  }
});

new Chart(document.getElementById('actorChart'), {
  type: 'doughnut',
  data: {
    labels: ${safeJson(metrics.actor_breakdown.map(a => a.type))},
    datasets: [{ data: ${safeJson(metrics.actor_breakdown.map(a => a.violations))}, backgroundColor: ['#3fb950','#bc8cff'], borderWidth: 0 }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } }
  }
});

new Chart(document.getElementById('violatedChart'), {
  type: 'bar',
  data: {
    labels: ${safeJson(metrics.top_violated.slice(0, 8).map(c => c.context_id))},
    datasets: [{
      label: 'Violations',
      data: ${safeJson(metrics.top_violated.slice(0, 8).map(c => c.total_violations))},
      backgroundColor: colors.slice(0, 8), borderRadius: 4
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    plugins: { legend: { display: false } }
  }
});

new Chart(document.getElementById('modeChart'), {
  type: 'polarArea',
  data: {
    labels: ${safeJson(metrics.mode_distribution.map(m => m.mode))},
    datasets: [{ data: ${safeJson(metrics.mode_distribution.map(m => m.count))}, backgroundColor: ['#f85149','#d29922','#58a6ff','#8b949e'] }]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } }
  }
});
</script>
</body>
</html>`;
}

export async function dashboardCommand(options: { web?: boolean; port?: string }): Promise<void> {
  const registry = new FileRegistry(process.cwd());
  const contexts = registry.list();
  const service = new DashboardService(process.cwd());
  const metrics = service.compute(contexts);

  if (options.web) {
    const port = parseInt(options.port || '9321', 10);
    const server = createServer((_req: IncomingMessage, res: ServerResponse) => {
      const url = _req.url || '/';
      if (url === '/api/metrics') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(metrics));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(getWebHtml(metrics));
    });

    server.listen(port, '127.0.0.1', () => {
      console.log('');
      console.log(chalk.green(`LCDD Dashboard running at ${chalk.bold.cyan(`http://localhost:${port}`)}`));
      console.log(chalk.dim(`  API: http://localhost:${port}/api/metrics`));
      console.log(chalk.dim('  Press Ctrl+C to stop'));
      console.log('');
    });
    return;
  }

  printTerminal(metrics);
}
