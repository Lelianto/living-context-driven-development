import { FileRegistry, ContextDoctor } from '@lcdd/core';
import chalk from 'chalk';

function formatScore(score: number, max: number): string {
  const pct = max > 0 ? (score / max * 100).toFixed(0) : '0';
  const bar = max > 0 ? '█'.repeat(Math.round(score / max * 20)) : '';
  const empty = max > 0 ? '░'.repeat(20 - Math.round(score / max * 20)) : '░'.repeat(20);
  return `${chalk.bold(bar + empty)} ${pct}% (${score}/${max})`;
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return chalk.green.bold(grade);
    case 'B': return chalk.blue.bold(grade);
    case 'C': return chalk.yellow.bold(grade);
    case 'D': return chalk.red.bold(grade);
    case 'F': return chalk.redBright.bold(grade);
    default: return grade;
  }
}

function statusIcon(status: string): string {
  switch (status) {
    case 'ok': return chalk.green('✓');
    case 'warning': return chalk.yellow('⚠');
    case 'critical': return chalk.red('✗');
    default: return ' ';
  }
}

export async function doctorCommand(options: { json?: boolean; triggers?: boolean }): Promise<void> {
  const registry = new FileRegistry(process.cwd());
  const contexts = registry.list();
  const doctor = new ContextDoctor(process.cwd());

  const report = doctor.diagnose(contexts);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('');
  console.log(chalk.bold('LCDD Context Health Report'));
  console.log(chalk.dim(`Timestamp: ${report.timestamp}`));
  console.log(chalk.dim(`Contexts: ${report.total_contexts}`));
  console.log('');

  console.log(`  Overall Score: ${formatScore(report.overall_score, report.max_score)}  Grade: ${gradeColor(report.grade)}`);
  console.log('');

  console.log(chalk.bold('Health Metrics'));
  console.log(chalk.dim('─'.repeat(60)));

  for (const metric of report.metrics) {
    const icon = statusIcon(metric.status);
    const bar = formatScore(metric.score, metric.max_score);
    console.log(`  ${icon} ${chalk.bold(metric.name)}`);
    console.log(`    ${bar}`);
    for (const detail of metric.details) {
      const prefix = metric.status === 'critical' ? chalk.red('  └─') :
                     metric.status === 'warning' ? chalk.yellow('  └─') : chalk.dim('  └─');
      console.log(`${prefix} ${detail}`);
    }
    console.log('');
  }

  if (report.triggers && report.triggers.length > 0 && options.triggers) {
    console.log(chalk.bold('Triggers Fired'));
    console.log(chalk.dim('─'.repeat(60)));
    for (const trigger of report.triggers) {
      const sev = trigger.severity === 'critical' ? chalk.red(`[${trigger.severity.toUpperCase()}]`) :
                  trigger.severity === 'high' ? chalk.yellow(`[${trigger.severity.toUpperCase()}]`) :
                  chalk.dim(`[${trigger.severity.toUpperCase()}]`);
      console.log(`  ${sev} ${trigger.description}`);
      console.log(`    ${chalk.dim('→')} ${trigger.recommendation}`);
      console.log('');
    }
  }

  if (report.recommendations.length > 0) {
    console.log(chalk.bold('Recommendations'));
    console.log(chalk.dim('─'.repeat(60)));
    let i = 1;
    for (const rec of report.recommendations) {
      console.log(`  ${chalk.cyan(`${i}.`)} ${rec}`);
      i++;
    }
    console.log('');
  }

  if (report.grade === 'A') {
    console.log(chalk.green('  All contexts are healthy. No action required.'));
  } else {
    console.log(chalk.dim(`  Run ${chalk.cyan('lcd doctor --triggers')} for detailed trigger analysis.`));
  }
  console.log('');
}
