import { useMutation, useQuery } from '@tanstack/react-query';
import { configSchema, pageTreeSchema, type Config, type PageTree, type SaveConfigRequest } from '@ax/core';

const API_URL = 'http://localhost:3001/api';

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

async function saveConfig(request: SaveConfigRequest): Promise<Config> {
  const response = await fetch(`${API_URL}/configs`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(`PUT ${API_URL}/configs for ${request.url} failed with ${response.status}`);
  return configSchema.parse(await response.json());
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
