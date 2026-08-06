import Ajv, { type ValidateFunction } from 'ajv';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Context } from './types.js';

const ajv = new Ajv({ allErrors: true, strict: false });

let _validate: ValidateFunction | null = null;

function loadValidator(): ValidateFunction {
  if (_validate) return _validate;
  const schemaPath = join(__dirname, '..', '..', '..', '..', 'reference', 'schema', 'context-schema.json');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  _validate = ajv.compile(schema);
  return _validate;
}

export function validateContext(context: unknown): { valid: boolean; errors: string[] } {
  const validate = loadValidator();

  if (!context || typeof context !== 'object') {
    return { valid: false, errors: ['Context must be a non-null object'] };
  }

  const valid = validate(context);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors || []).map(err => {
    const path = err.instancePath || '/';
    return `${path}: ${err.message}`;
  });

  return { valid: false, errors };
}

export function validateSemanticRules(context: Context): string[] {
  const errors: string[] = [];

  if (context.lifecycle === 'candidate' && !context.review_status) {
    errors.push('Candidate contexts must have a review_status');
  }

  if (context.lifecycle === 'active' && !context.effective_date) {
    errors.push('Active contexts must have an effective_date');
  }

  if (context.lifecycle === 'active' && !context.enforcement) {
    errors.push('Active contexts must have enforcement configured');
  }

  if ((context.lifecycle === 'deprecated' || context.lifecycle === 'archived') && !context.deprecated_date) {
    errors.push(`${context.lifecycle} contexts must have a deprecated_date`);
  }

  if (context.authority.level >= 3 && context.lifecycle === 'active' && context.enforcement) {
    if (context.enforcement.mode !== 'block') {
      errors.push('Active contexts with authority level >= 3 should use block enforcement mode');
    }
  }

  if (context.effective_date && context.deprecated_date) {
    if (new Date(context.effective_date) > new Date(context.deprecated_date)) {
      errors.push('effective_date must be before deprecated_date');
    }
  }

  return errors;
}

export function validateContextFull(context: Context): { valid: boolean; errors: string[] } {
  const schemaResult = validateContext(context);
  if (!schemaResult.valid) {
    return schemaResult;
  }

  const semanticErrors = validateSemanticRules(context);
  if (semanticErrors.length > 0) {
    return { valid: false, errors: semanticErrors };
  }

  return { valid: true, errors: [] };
}
