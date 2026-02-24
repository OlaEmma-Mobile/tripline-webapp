import { ZodError } from 'zod';

/**
 * Convert ZodError to field error map.
 */
export function zodErrorToFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    fieldErrors[key] = fieldErrors[key] || [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}
