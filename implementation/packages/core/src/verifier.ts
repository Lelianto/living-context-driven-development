import type { Context, VerificationResult, EnforcementEvent } from './types.js';
import { LifecycleManager } from './lifecycle.js';
import { v4 as uuid } from 'uuid';
import { existsSync, readFileSync } from 'fs';
import { Worker } from 'worker_threads';
import { matchesAnyPath } from './path-matcher.js';

export interface VerifierConfig {
  type: string;
  config?: Record<string, unknown>;
  violation_message_template?: string;
}

export const VERIFIER_LIMITS = {
  MAX_ARTIFACT_BYTES: 1_000_000,
  MAX_REGEX_LENGTH: 1_000,
  REGEX_TIMEOUT_MS: 250,
} as const;

function hasUnsafeRegexStructure(pattern: string): boolean {
  if (pattern.length > VERIFIER_LIMITS.MAX_REGEX_LENGTH) return true;
  // Reject nested quantified groups such as (a+)+ and ambiguous repeated wildcards.
  return /\([^)]*[+*][^)]*\)[+*{]/.test(pattern) || /(\.\*){2,}/.test(pattern);
}

function testRegexWithTimeout(pattern: string, flags: string, content: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `const { parentPort, workerData } = require('node:worker_threads');
       try {
         parentPort.postMessage({ match: new RegExp(workerData.pattern, workerData.flags).test(workerData.content) });
       } catch (error) {
         parentPort.postMessage({ error: error instanceof Error ? error.message : String(error) });
       }`,
      { eval: true, workerData: { pattern, flags, content } },
    );

    const timeout = setTimeout(() => {
      void worker.terminate();
      reject(new Error(`Regex verification exceeded ${VERIFIER_LIMITS.REGEX_TIMEOUT_MS}ms timeout.`));
    }, VERIFIER_LIMITS.REGEX_TIMEOUT_MS);

    worker.once('message', (result: { match?: boolean; error?: string }) => {
      clearTimeout(timeout);
      void worker.terminate();
      if (result.error) reject(new Error(result.error));
      else resolve(Boolean(result.match));
    });
    worker.once('error', error => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

export class ContextVerifier {
  private verifiers: Map<string, VerifierFn> = new Map();

  constructor() {
    this.registerBuiltins();
  }

  register(type: string, fn: VerifierFn): void {
    this.verifiers.set(type, fn);
  }

  private registerBuiltins(): void {
    this.register('file-exists', this.fileExistsVerifier);
    this.register('regex-pattern', this.regexVerifier);
  }

  private fileExistsVerifier = async (
    spec: VerifierConfig,
    artifactPath: string,
    _artifactContent: string
  ): Promise<VerificationResult> => {
    const config = spec.config || {};
    const files = config.files as string[] || [];
    const atLeastOne = config.at_least_one as boolean ?? false;

    const found = files.filter(f => existsSync(f));
    const compliant = atLeastOne ? found.length > 0 : files.every(f => existsSync(f));

    if (compliant) {
      return {
        context_id: '',
        artifact_path: artifactPath,
        status: 'compliant',
        confidence: 1,
      };
    }

    const missing = files.filter(f => !existsSync(f));
    const msg = spec.violation_message_template || `Required files not found: ${missing.join(', ')}`;

    return {
      context_id: '',
      artifact_path: artifactPath,
      status: 'violation',
      violations: [{ description: msg }],
      confidence: 1,
    };
  };

  private regexVerifier = async (
    spec: VerifierConfig,
    artifactPath: string,
    artifactContent: string
  ): Promise<VerificationResult> => {
    const config = spec.config || {};
    const patterns = config.patterns as string[] || [];
    const shouldMatch = config.should_match as boolean | undefined;
    const shouldNotMatch = config.should_not_match as boolean | undefined;

    if (Buffer.byteLength(artifactContent, 'utf8') > VERIFIER_LIMITS.MAX_ARTIFACT_BYTES) {
      return {
        context_id: '',
        artifact_path: artifactPath,
        status: 'error',
        violations: [{ description: `Artifact exceeds regex verification limit of ${VERIFIER_LIMITS.MAX_ARTIFACT_BYTES} bytes.` }],
        confidence: 0,
      };
    }

    for (const rawPattern of patterns) {
      try {
        let flags = 'gm';
        let pattern = rawPattern;

        const inlineFlags = rawPattern.match(/^\(\?([gimsuy]+)\)/);
        if (inlineFlags) {
          flags = inlineFlags[1];
          pattern = rawPattern.slice(inlineFlags[0].length);
        }

        if (hasUnsafeRegexStructure(pattern)) {
          return {
            context_id: '',
            artifact_path: artifactPath,
            status: 'error',
            violations: [{ description: `Regex pattern rejected by safety limits: ${rawPattern}` }],
            confidence: 0,
          };
        }

        const match = await testRegexWithTimeout(pattern, flags, artifactContent);

        if (shouldNotMatch && match) {
          const msg = spec.violation_message_template || `Forbidden pattern matched: ${rawPattern}`;
          return {
            context_id: '',
            artifact_path: artifactPath,
            status: 'violation',
            violations: [{ description: msg }],
            confidence: 1,
          };
        }

        if (shouldMatch && !match) {
          const msg = spec.violation_message_template || `Required pattern not found: ${rawPattern}`;
          return {
            context_id: '',
            artifact_path: artifactPath,
            status: 'violation',
            violations: [{ description: msg }],
            confidence: 1,
          };
        }
      } catch (e) {
        return {
          context_id: '',
          artifact_path: artifactPath,
          status: 'error',
          violations: [{ description: `Regex verification failed for ${rawPattern}: ${(e as Error).message}` }],
          confidence: 0,
        };
      }
    }

    return {
      context_id: '',
      artifact_path: artifactPath,
      status: 'compliant',
      confidence: 1,
    };
  };

  async verify(
    context: Context,
    artifactPath: string,
    artifactContent?: string
  ): Promise<VerificationResult> {
    if (!LifecycleManager.isEnforceable(context.lifecycle)) {
      return {
        context_id: context.id,
        artifact_path: artifactPath,
        status: 'not_applicable',
        confidence: 1,
      };
    }

    const appliesTo = context.applies_to || ['**/*'];
    const isApplicable = matchesAnyPath(artifactPath, appliesTo);
    if (!isApplicable) {
      return {
        context_id: context.id,
        artifact_path: artifactPath,
        status: 'not_applicable',
        confidence: 1,
      };
    }

    const spec = context.enforcement?.specification;
    if (!spec) {
      return {
        context_id: context.id,
        artifact_path: artifactPath,
        status: 'compliant',
        confidence: 0,
      };
    }

    const verifier = this.verifiers.get(spec.type);
    if (!verifier) {
      return {
        context_id: context.id,
        artifact_path: artifactPath,
        status: 'error',
        violations: [{ description: `Unknown verifier type: ${spec.type}` }],
        confidence: 0,
      };
    }

    if (!artifactContent) {
      if (spec.type === 'file-exists') {
        artifactContent = '';
      } else {
        try {
          artifactContent = readFileSync(artifactPath, 'utf-8');
        } catch {
          return {
            context_id: context.id,
            artifact_path: artifactPath,
            status: 'error',
            violations: [{ description: `Cannot read artifact: ${artifactPath}` }],
            confidence: 0,
          };
        }
      }
    }

    const result = await verifier(spec, artifactPath, artifactContent);
    result.context_id = context.id;

    return result;
  }

  async verifyAll(
    contexts: Context[],
    artifactPath: string,
    artifactContent?: string
  ): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];
    for (const ctx of contexts) {
      const result = await this.verify(ctx, artifactPath, artifactContent);
      results.push(result);
    }
    return results;
  }

  async enforce(
    contexts: Context[],
    artifactPath: string,
    actor: { type: 'human' | 'ai-agent'; id: string },
    options?: { repository?: string; branch?: string; commit_sha?: string; pull_request_id?: string }
  ): Promise<{ results: VerificationResult[]; events: EnforcementEvent[]; blocked: boolean }> {
    const results = await this.verifyAll(contexts, artifactPath);
    const events: EnforcementEvent[] = [];
    let blocked = false;

    for (const result of results) {
      const context = contexts.find(c => c.id === result.context_id);
      if (!context) continue;

      const mode = LifecycleManager.getEnforcementMode(context);

      const event: EnforcementEvent = {
        event_id: uuid(),
        timestamp: new Date().toISOString(),
        context_id: result.context_id,
        context_version: context.version,
        artifact_path: artifactPath,
        status: result.status === 'violation' ? 'violation' : 'compliant',
        violations: result.violations,
        enforcement_action: result.status === 'violation' ? mode : 'none',
        actor,
        repository: options?.repository,
        branch: options?.branch,
        commit_sha: options?.commit_sha,
        pull_request_id: options?.pull_request_id,
        verifier: {
          type: 'lcdd-core',
          version: '0.2.0',
          duration_ms: 0,
        },
      };

      events.push(event);

      if (result.status === 'violation' && mode === 'block') {
        blocked = true;
      }
    }

    return { results, events, blocked };
  }

}

type VerifierFn = (
  spec: VerifierConfig,
  artifactPath: string,
  artifactContent: string
) => Promise<VerificationResult> | VerificationResult;
