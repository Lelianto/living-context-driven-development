import { Ajv } from 'ajv';
import type { ValidateFunction } from 'ajv';
import type { Context } from './types.js';
import schema from './context-schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addFormat('date-time', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*/);
ajv.addFormat('date', /^\d{4}-\d{2}-\d{2}$/);
ajv.addFormat('uri', /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//);

let _validate: ValidateFunction | undefined;

function loadValidator(): ValidateFunction {
  if (_validate) return _validate;
  const localSchema = { ...schema };
  delete (localSchema as Record<string, unknown>).$schema;
  delete (localSchema as Record<string, unknown>).$id;
  _validate = ajv.compile(localSchema);
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
