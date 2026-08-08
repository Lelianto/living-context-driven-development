import chalk from 'chalk';

export function formatScore(score: number, max: number): string {
  const pct = max > 0 ? ((score / max) * 100).toFixed(0) : '0';
  const filled = max > 0 ? Math.round((score / max) * 20) : 0;
  const bar = '█'.repeat(filled);
  const empty = '░'.repeat(20 - filled);
  return `${chalk.bold(bar + empty)} ${pct}% (${score}/${max})`;
}

export function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return chalk.green.bold(grade);
    case 'B': return chalk.blue.bold(grade);
    case 'C': return chalk.yellow.bold(grade);
    case 'D': return chalk.red.bold(grade);
    case 'F': return chalk.redBright.bold(grade);
    default: return grade;
  }
}

export function statusIcon(status: string): string {
  switch (status) {
    case 'ok': return chalk.green('✓');
    case 'warning': return chalk.yellow('⚠');
    case 'critical': return chalk.red('✗');
    default: return ' ';
  }
}

export function severityTag(severity: string): string {
  const label = `[${severity.toUpperCase()}]`;
  switch (severity) {
    case 'critical': return chalk.red(label);
    case 'high': return chalk.yellow(label);
    case 'medium': return chalk.blue(label);
    default: return chalk.dim(label);
  }
}

export function rule(width = 60): string {
  return chalk.dim('─'.repeat(width));
}
