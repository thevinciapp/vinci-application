import { z } from 'zod';
import { ValidationError } from '@/shared/lib/errors';

export function validateData<T>(
  data: unknown,
  schema: z.ZodType<T>
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.reduce((acc: Record<string, string>, curr: z.ZodIssue) => {
        const key = curr.path.join('.');
        acc[key] = curr.message;
        return acc;
      }, {});

      throw new ValidationError('Validation failed', formattedErrors);
    }
    throw new ValidationError('Invalid data format');
  }
}

export async function validateRequest<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<T> {
  let data: unknown;

  try {
    data = await request.json();
  } catch {
    throw new ValidationError('Invalid JSON');
  }

  return validateData(data, schema);
}

export function validateQueryParams<T>(
  params: URLSearchParams,
  schema: z.ZodType<T>
): T {
  const queryObject = Object.fromEntries(params.entries());
  return validateData(queryObject, schema);
}