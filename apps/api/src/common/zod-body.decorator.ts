import { Body } from '@nestjs/common';
import type { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

/**
 * Use instead of a raw `@Body()` for any request body that needs validating.
 * Type the argument with `z.infer<typeof schema>` so the type and the check come from one schema.
 *  Ex:
 *   const pageTreeRequestSchema = z.object({ url: z.string().min(1) });
 *   type PageTreeRequest = z.infer<typeof pageTreeRequestSchema>;
 * 
 *   getPageTree(@ZodBody(pageTreeRequestSchema) request: PageTreeRequest) { ... }
 */
export const ZodBody = (schema: z.ZodType) => Body(new ZodValidationPipe(schema));
