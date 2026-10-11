import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { z } from 'zod';

// Defaults mirror .env.example, so a fresh clone runs without copying it first.
const envSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  WEB_ORIGIN: z
    .url({ protocol: /^https?$/ })
    // The browser's Origin header has no path or trailing slash; CORS compares exact strings.
    .transform((webOrigin) => new URL(webOrigin).origin)
    .default('http://localhost:5173'),
  DB_PATH: z.string().min(1).default('./data/ax.db'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(variables: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(variables);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration: ${problems.join('; ')}`);
  }
  return parsed.data;
}

/** Loads `.env` from the api's working directory (if present) on top of the process env, then validates. */
export function loadEnv(envFilePath = '.env'): Env {
  if (existsSync(envFilePath)) loadEnvFile(envFilePath);
  return parseEnv(process.env);
}
