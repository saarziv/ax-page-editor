import { API_ORIGIN } from '@/state/queries';

/** Agent View's address for a page. It lives at the api's root, outside `/api`, because it's the public address agents call. */
export function agentViewUrl(pageUrl: string): string {
  return `${API_ORIGIN}/agentView?url=${encodeURIComponent(pageUrl)}`;
}
