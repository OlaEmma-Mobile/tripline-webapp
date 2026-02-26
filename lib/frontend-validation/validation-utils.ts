import { z, ZodError, type ZodTypeAny } from 'zod';

export interface ValidationResult<T> {
  isValid: boolean;
  data: T | null;
  fieldErrors: Record<string, string[]>;
  formMessage: string | null;
}

/**
 * Converts zod issues into field-level error map.
 */
export function zodToFieldErrors(error: ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form';
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(issue.message);
  }

  return result;
}

/**
 * Validates payload and returns normalized error output for UI handling.
 */
export function validateOrReject<TSchema extends ZodTypeAny>(
  schema: TSchema,
  payload: unknown,
  fallbackMessage = 'Please correct the highlighted fields.'
): ValidationResult<z.infer<TSchema>> {
  const parsed = schema.safeParse(payload);

  if (parsed.success) {
    return {
      isValid: true,
      data: parsed.data,
      fieldErrors: {},
      formMessage: null,
    };
  }

  const fieldErrors = zodToFieldErrors(parsed.error);
  return {
    isValid: false,
    data: null,
    fieldErrors,
    formMessage: fieldErrors._form?.[0] ?? fallbackMessage,
  };
}
