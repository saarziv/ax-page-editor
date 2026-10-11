import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/** Validates a request value against a zod schema; failures become a 400 in the `{ code, message }` shape. */
export class ZodValidationPipe<Schema extends z.ZodType> implements PipeTransform<unknown, z.infer<Schema>> {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown): z.infer<Schema> {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      const problems = parsed.error.issues.map((issue) => `${issue.path.join('.') || '(body)'}: ${issue.message}`);
      throw new BadRequestException({ code: 'INVALID_REQUEST', message: `Invalid request: ${problems.join('; ')}` });
    }
    return parsed.data;
  }
}
