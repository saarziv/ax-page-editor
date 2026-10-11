import { useEffect, useState } from 'react';

const HEALTH_URL = 'http://localhost:3001/api/health';

// Plain fetch for now; moves to TanStack Query in T01/S3.
export function App() {
  const [healthJson, setHealthJson] = useState<unknown>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    fetch(HEALTH_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`GET ${HEALTH_URL} failed with ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then(setHealthJson)
      .catch((error: unknown) => {
        setHealthError(error instanceof Error ? error.message : `GET ${HEALTH_URL} failed`);
      });
  }, []);

  return (
    <main>
      <h1>AX Editor</h1>
      {healthError && <p role="alert">{healthError}</p>}
      {!healthError && <pre>{healthJson ? JSON.stringify(healthJson, null, 2) : 'Loading…'}</pre>}
    </main>
  );
}
