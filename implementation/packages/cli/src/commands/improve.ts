import { FileRegistry, ContextDoctor, ImproveEngine, type HealPlan } from '@lcdd/core';
import { createInterface } from 'readline';
import chalk from 'chalk';
import { severityTag, rule } from '../format.js';

function engine(): ImproveEngine {
  const root = process.cwd();
  const registry = new FileRegistry(root);
  return new ImproveEngine(registry, new ContextDoctor(root));
}

function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${question} ${chalk.dim('(y/N)')} `, answer => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

function printPlan(plan: HealPlan, index: number): void {
  const rec = plan.recommendation;
  const marker = plan.executable
    ? plan.requires_approval
      ? chalk.yellow('needs approval')
      : chalk.green('ready')
    : chalk.dim('advisory');

  console.log(`  ${chalk.cyan(`${index}.`)} ${severityTag(rec.severity)} ${chalk.bold(rec.title)} ${chalk.dim(`(${marker})`)}`);
  console.log(`     ${chalk.dim('id:')} ${rec.recommendation_id}`);
  if (rec.context_id) console.log(`     ${chalk.dim('context:')} ${rec.context_id}`);
  console.log(`     ${rec.description}`);
  console.log(`     ${chalk.dim('why:')} ${rec.reason}`);
  console.log(`     ${chalk.dim('confidence:')} ${rec.confidence.toFixed(2)}  ${chalk.dim('action:')} ${rec.action}`);
  if (plan.blocked_reason) {
    console.log(`     ${chalk.yellow('⚠')} ${plan.blocked_reason}`);
  }
  if (plan.executable) {
    console.log(`     ${chalk.dim('→')} ${chalk.cyan(`lcd improve apply ${rec.recommendation_id}`)}`);
  } else if (rec.suggested_command) {
    console.log(`     ${chalk.dim('→')} ${chalk.cyan(rec.suggested_command)}`);
  }
  console.log('');
}

export async function improveCheckCommand(options: {
  json?: boolean;
  priority?: string;
}): Promise<void> {
  let plans = engine().plan();

  if (options.priority) {
    plans = plans.filter(p => p.recommendation.priority === options.priority);
  }

  if (options.json) {
    console.log(JSON.stringify(plans, null, 2));
    return;
  }

  console.log('');
  console.log(chalk.bold('LCDD Improvement Recommendations'));
  console.log(rule());

  if (plans.length === 0) {
    console.log(chalk.green('  No recommendations. Nothing needs healing.'));
    console.log(chalk.dim('  Run lcd doctor to review overall health.'));
    console.log('');
    return;
  }

  const ready = plans.filter(p => p.executable && !p.requires_approval).length;
  const approval = plans.filter(p => p.executable && p.requires_approval).length;
  const advisory = plans.filter(p => !p.executable).length;

  console.log(
    `  ${chalk.green(`${ready} ready`)}  ${chalk.yellow(`${approval} need approval`)}  ${chalk.dim(`${advisory} advisory`)}`
  );
  console.log('');

  plans.forEach((plan, i) => printPlan(plan, i + 1));

  console.log(chalk.dim(`  Preview a change with ${chalk.cyan('lcd improve apply <id> --dry-run')}`));
  console.log('');
}

export async function improveApplyCommand(
  recommendationId: string,
  options: { dryRun?: boolean; yes?: boolean; reason?: string }
): Promise<void> {
  const eng = engine();

  if (!options.dryRun && !options.yes) {
    const plan = eng.plan().find(p => p.recommendation.recommendation_id === recommendationId);
    if (!plan) {
      console.log(chalk.red(`✗ No current recommendation with id "${recommendationId}".`));
      console.log(chalk.dim('  Run lcd improve check to see current recommendations.'));
      process.exit(1);
    }

    console.log('');
    printPlan(plan, 1);

    const preview = eng.apply(recommendationId, {
      dryRun: true,
      approvalReason: options.reason,
    });
    if (preview.diff && preview.diff.length > 0) {
      console.log(chalk.bold('  Changes'));
      for (const line of preview.diff) {
        console.log(`    ${chalk.dim('•')} ${line}`);
      }
      console.log('');
    }

    const ok = await confirm('  Apply this change?');
    if (!ok) {
      console.log(chalk.dim('  Aborted. No changes written.'));
      console.log('');
      return;
    }
  }

  const result = eng.apply(recommendationId, {
    dryRun: options.dryRun,
    force: options.yes,
    approvalReason: options.reason,
    actor: process.env.USER || 'cli',
  });

  console.log('');
  switch (result.status) {
    case 'dry-run':
      console.log(chalk.bold('Dry run — no changes written'));
      console.log(rule());
      if (result.diff && result.diff.length > 0) {
        for (const line of result.diff) {
          console.log(`  ${chalk.dim('•')} ${line}`);
        }
      } else {
        console.log(chalk.dim('  No field changes would be made.'));
      }
      console.log('');
      break;

    case 'applied':
      console.log(`${chalk.green('✓')} ${result.message}`);
      console.log(chalk.dim(`  heal id: ${result.heal_id}`));
      console.log(chalk.dim(`  Undo with: ${chalk.cyan(`lcd improve rollback ${result.heal_id}`)}`));
      console.log('');
      break;

    case 'rolled-back':
      console.log(`${chalk.yellow('⚠')} ${result.message}`);
      console.log(chalk.dim('  The registry is unchanged.'));
      console.log('');
      process.exit(1);
      break;

    case 'blocked':
      console.log(`${chalk.red('✗')} ${result.message}`);
      console.log('');
      process.exit(1);
      break;
  }
}

export async function improveRollbackCommand(healId: string): Promise<void> {
  const result = engine().rollback(healId);

  console.log('');
  if (result.status === 'rolled-back') {
    console.log(`${chalk.green('✓')} ${result.message}`);
    console.log('');
    return;
  }

  console.log(`${chalk.red('✗')} ${result.message}`);
  console.log('');
  process.exit(1);
}
