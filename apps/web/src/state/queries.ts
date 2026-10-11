import { useQuery } from '@tanstack/react-query';
import { pageTreeSchema, type PageTree } from '@ax/core';

const API_URL = 'http://localhost:3001/api';

async function fetchHealth(): Promise<unknown> {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) throw new Error(`GET ${API_URL}/health failed with ${response.status}`);
  return response.json() as Promise<unknown>;
}

async function fetchSnapshot(url: string): Promise<PageTree> {
  const response = await fetch(`${API_URL}/snapshot`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) throw new Error(`POST ${API_URL}/snapshot for ${url} failed with ${response.status}`);
  return pageTreeSchema.parse(await response.json());
}

export function useHealthQuery() {
  return useQuery({ queryKey: ['health'], queryFn: fetchHealth });
}

export function useSnapshot(url: string) {
  return useQuery({
    queryKey: ['snapshot', url],
    queryFn: () => fetchSnapshot(url),
    // A refetch could swap the tree under the user's draft, so only refetch on explicit request.
    staleTime: Infinity,
    retry: 3,
  });
}
