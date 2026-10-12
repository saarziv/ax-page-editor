import { useMutation, useQuery } from '@tanstack/react-query';
import { configSchema, pageTreeSchema, type Config, type PageTree, type SaveConfigRequest } from '@ax/core';

const API_URL = 'http://localhost:3001/api';
// Without a limit, a hanging server would leave the Save button disabled forever.
export const SAVE_TIMEOUT_MS = 10_000;

async function fetchHealth(): Promise<unknown> {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) throw new Error(`GET ${API_URL}/health failed with ${response.status}`);
  return response.json() as Promise<unknown>;
}

async function fetchPageTree(url: string): Promise<PageTree> {
  const response = await fetch(`${API_URL}/page-tree`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) throw new Error(`POST ${API_URL}/page-tree for ${url} failed with ${response.status}`);
  return pageTreeSchema.parse(await response.json());
}

export async function saveConfig(request: SaveConfigRequest): Promise<Config> {
  // A setTimeout-driven abort rather than AbortSignal.timeout, which test fake timers can't advance.
  const timeoutController = new AbortController();
  const saveTimeout = setTimeout(() => timeoutController.abort(new Error(`PUT ${API_URL}/configs for ${request.url} timed out`)), SAVE_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}/configs`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: timeoutController.signal,
    });
    if (!response.ok) throw new Error(`PUT ${API_URL}/configs for ${request.url} failed with ${response.status}`);
    return configSchema.parse(await response.json());
  } finally {
    clearTimeout(saveTimeout);
  }
}

export function useHealthQuery() {
  return useQuery({ queryKey: ['health'], queryFn: fetchHealth });
}

export function usePageTree(url: string) {
  return useQuery({
    queryKey: ['page-tree', url],
    queryFn: () => fetchPageTree(url),
    // A refetch could swap the tree under the user's draft, so only refetch on explicit request.
    staleTime: Infinity,
    retry: 3,
  });
}

export function useSaveConfig() {
  return useMutation({ mutationFn: saveConfig });
}
