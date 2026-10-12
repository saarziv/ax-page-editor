import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

const pipe = new ZodValidationPipe(z.object({ url: z.string().min(1) }));

function captureError(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected the pipe to throw');
}

describe('ZodValidationPipe', () => {
  it('returns the parsed value, dropping unknown keys', () => {
    expect(pipe.transform({ url: 'https://example.com', extra: 1 })).toEqual({ url: 'https://example.com' });
  });

  it('rejects invalid input with a 400 in the { code, message } shape, naming the field', () => {
    const error = captureError(() => pipe.transform({}));

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toEqual({
      code: 'INVALID_REQUEST',
      message: expect.stringContaining('url'),
    });
  });
});
