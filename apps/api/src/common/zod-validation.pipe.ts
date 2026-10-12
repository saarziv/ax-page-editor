import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

function describeProblems(error: z.ZodError): string {
  const problems = error.issues.map((issue) => `${issue.path.join('.') || '(body)'}: ${issue.message}`);
  return problems.join('; ');
}

/** Checks a value against a zod schema. Used through the `@ZodBody(schema)` decorator, not directly. */
export class ZodValidationPipe<Schema extends z.ZodType> implements PipeTransform<unknown, z.infer<Schema>> {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown): z.infer<Schema> {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      // Same { code, message } shape as every other API error, so the web can handle them uniformly.
      throw new BadRequestException({
        code: 'INVALID_REQUEST',
        message: `Invalid request: ${describeProblems(parsed.error)}`,
      });
    }
    // Return the parsed copy, not the input: zod drops keys the schema doesn't know about.
    return parsed.data;
  }
}
