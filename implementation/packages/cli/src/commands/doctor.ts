import { FileRegistry, ContextDoctor } from '@lcdd/core';
import chalk from 'chalk';
import { formatScore, gradeColor, statusIcon, severityTag, rule } from '../format.js';

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
  console.log(rule());

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
    console.log(rule());
    for (const trigger of report.triggers) {
      console.log(`  ${severityTag(trigger.severity)} ${trigger.description}`);
      console.log(`    ${chalk.dim('→')} ${trigger.recommendation}`);
      console.log('');
    }
  }

  if (report.dormant_triggers && report.dormant_triggers.length > 0 && options.triggers) {
    console.log(chalk.bold('Dormant Triggers'));
    console.log(rule());
    for (const dormant of report.dormant_triggers) {
      console.log(`  ${chalk.dim('○')} ${chalk.bold(dormant.trigger)}`);
      console.log(`    ${chalk.dim(dormant.reason)}`);
      console.log('');
    }
  }

  if (report.recommendations.length > 0) {
    console.log(chalk.bold('Recommendations'));
    console.log(rule());
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
    console.log(chalk.dim(`  Run ${chalk.cyan('lcd improve check')} for actionable recommendations.`));
  }
  console.log('');
}
