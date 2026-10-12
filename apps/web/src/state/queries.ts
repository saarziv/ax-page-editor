import { useCallback, useMemo } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import {
  configSchema,
  fetchErrorCodeSchema,
  pageTreeSchema,
  savedPageSummarySchema,
  type Config,
  type FetchErrorCode,
  type Forwarded,
  type Modification,
  type PageTree,
  type SaveConfigRequest,
  type SavedPageSummary,
} from '@ax/core';

// Set VITE_API_URL when the api runs somewhere other than the default port (see apps/web/.env.example).
export const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
const API_URL = `${API_ORIGIN}/api`;

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

/** Why a forwarded page couldn't be fetched, as the api's FetchError code, so the preview can say why. */
export class ForwardFetchError extends Error {
  constructor(
    readonly code: FetchErrorCode,
    message: string,
  ) {
    super(message);
  }
}

// The api answers a FetchError as `{ code, message }`. Any other body (a proxy's HTML page, nothing at all) has no code.
async function fetchErrorCodeOf(response: Response): Promise<FetchErrorCode | null> {
  const responseBody: unknown = await response.json().catch(() => null);
  const code = typeof responseBody === 'object' && responseBody !== null && 'code' in responseBody ? responseBody.code : null;
  const parsedCode = fetchErrorCodeSchema.safeParse(code);
  return parsedCode.success ? parsedCode.data : null;
}

/** The linked page's main content, or a ForwardFetchError. Anything that isn't the api's own `{ code }` means our api is down or failing: UNREACHABLE. */
export async function fetchForwardedPage(href: string): Promise<PageTree> {
  const description = `POST ${API_URL}/forward for ${href}`;
  let response: Response;
  try {
    response = await fetch(`${API_URL}/forward`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: href }),
    });
  } catch (error) {
    throw new ForwardFetchError('UNREACHABLE', `${description} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!response.ok) {
    const code = (await fetchErrorCodeOf(response)) ?? 'UNREACHABLE';
    throw new ForwardFetchError(code, `${description} failed with ${response.status}`);
  }
  return pageTreeSchema.parse(await response.json());
}

async function fetchSavedPages(): Promise<SavedPageSummary[]> {
  const response = await fetch(`${API_URL}/configs`);
  if (!response.ok) throw new Error(`GET ${API_URL}/configs failed with ${response.status}`);
  return savedPageSummarySchema.array().parse(await response.json());
}

// Save and the config load share one limit: without it, a hanging server would leave Save disabled forever
// or keep the editor in its loading state.
export const REQUEST_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(requestUrl: string, init: RequestInit, description: string): Promise<Response> {
  // A setTimeout-driven abort rather than AbortSignal.timeout, which test fake timers can't advance.
  const timeoutController = new AbortController();
  const requestTimeout = setTimeout(() => timeoutController.abort(new Error(`${description} timed out`)), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(requestUrl, { ...init, signal: timeoutController.signal });
  } finally {
    clearTimeout(requestTimeout);
  }
}

export async function saveConfig(request: SaveConfigRequest): Promise<Config> {
  const description = `PUT ${API_URL}/configs for ${request.url}`;
  const response = await fetchWithTimeout(
    `${API_URL}/configs`,
    { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) },
    description,
  );
  if (!response.ok) throw new Error(`${description} failed with ${response.status}`);
  return configSchema.parse(await response.json());
}

/** The configuration saved for this page, or null when nothing is saved (a 404). */
export async function fetchConfig(pageUrl: string): Promise<Config | null> {
  const requestUrl = `${API_URL}/configs/${encodeURIComponent(pageUrl)}`;
  const description = `GET ${requestUrl}`;
  const response = await fetchWithTimeout(requestUrl, {}, description);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${description} failed with ${response.status}`);
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
    // The editor mounts the preview only once the tree has loaded or failed, and a failed query refetches
    // whenever a component mounts it, so the default would loop between the error and the loading state.
    retryOnMount: false,
  });
}

function forwardedFromQuery(href: string, forwardQuery: UseQueryResult<PageTree> | undefined): Forwarded {
  if (forwardQuery?.data) return { href, tree: forwardQuery.data };
  if (forwardQuery?.isError) return { href, error: forwardQuery.error instanceof ForwardFetchError ? forwardQuery.error.code : 'UNREACHABLE' };
  return { href };
}

/**
 * Every forwarded page in the draft, by `href`, fetched once per session (P11): a note edit or turning a forward
 * off and on again reuses what was fetched. Missing or without `tree` and `error` means still loading.
 */
export function useForwardedPages(modificationsDraft: Modification[]): ReadonlyMap<string, Forwarded> {
  // A string key, so the hrefs list (and so combine) keeps its identity while the set of forwards is unchanged.
  // Otherwise every keystroke in a note would build a new map and recompute the marked page twice.
  const forwardedHrefsKey = [...new Set(modificationsDraft.flatMap((modification) => (modification.type === 'forward' ? [modification.href] : [])))].join('\n');
  const forwardedHrefs = useMemo(() => (forwardedHrefsKey === '' ? [] : forwardedHrefsKey.split('\n')), [forwardedHrefsKey]);
  const combineForwardedPages = useCallback(
    (forwardQueries: UseQueryResult<PageTree>[]) => new Map(forwardedHrefs.map((href, index) => [href, forwardedFromQuery(href, forwardQueries[index])])),
    [forwardedHrefs],
  );
  return useQueries({
    queries: forwardedHrefs.map((href) => ({
      queryKey: ['forward', href],
      queryFn: () => fetchForwardedPage(href),
      staleTime: Infinity,
      // Kept for the whole session even while the forward is off, so turning it back on never refetches.
      gcTime: Infinity,
      // A blocked or non-HTML link won't change on a retry, so it fails fast.
      retry: false,
    })),
    combine: combineForwardedPages,
  });
}

const SAVED_PAGES_QUERY_KEY = ['saved-pages'];

export function useSavedPages() {
  return useQuery({ queryKey: SAVED_PAGES_QUERY_KEY, queryFn: fetchSavedPages });
}

const configQueryKey = (pageUrl: string) => ['config', pageUrl];

/** The page's saved configuration, asked for once the page tree (and so its normalized url) is known. */
export function useConfig(pageUrl: string | undefined) {
  return useQuery({
    queryKey: configQueryKey(pageUrl ?? ''),
    queryFn: () => fetchConfig(pageUrl ?? ''),
    enabled: pageUrl !== undefined,
    // A refetch could replace the draft under the publisher's edits; saves keep this cache current instead.
    staleTime: Infinity,
  });
}

export function useSaveConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveConfig,
    onSuccess: (savedConfig) => {
      // So reopening the page in this session restores what was just saved, not the configuration from before.
      queryClient.setQueryData(configQueryKey(savedConfig.url), savedConfig);
      // So the start screen's list is current when the publisher goes back to it.
      return queryClient.invalidateQueries({ queryKey: SAVED_PAGES_QUERY_KEY });
    },
  });
}
