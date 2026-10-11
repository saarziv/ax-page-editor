import { useQuery } from '@tanstack/react-query';

const HEALTH_URL = 'http://localhost:3001/api/health';

async function fetchHealth(): Promise<unknown> {
  const response = await fetch(HEALTH_URL);
  if (!response.ok) throw new Error(`GET ${HEALTH_URL} failed with ${response.status}`);
  return response.json() as Promise<unknown>;
}

export function useHealthQuery() {
  return useQuery({ queryKey: ['health'], queryFn: fetchHealth });
}
