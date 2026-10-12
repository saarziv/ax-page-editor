import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePageTree } from '@/state/queries';
import { hasUnsavedChanges, useEditorStore } from '@/state/store';
import { agentViewUrl } from './agentViewUrl';

const ENABLED_TOOLTIP = 'Opens what an AI agent gets for this page, in a new tab.';
const UNSAVED_TOOLTIP = 'Save to see your latest changes as an agent.';

export function ViewAsAgentButton({ url }: { url: string }) {
  // The normalized url the page was loaded and saved under, the same one Save sends.
  const pageUrl = usePageTree(url).data?.url;
  // The same derived flag that enables Save: Agent View only knows the saved configuration, so the two flip together.
  const isDirty = useEditorStore(hasUnsavedChanges);
  const isDisabled = !pageUrl || isDirty;

  function handleViewAsAgent() {
    if (!pageUrl) return;
    // noopener so the new tab can't reach back into the editor.
    window.open(agentViewUrl(pageUrl), '_blank', 'noopener');
  }

  return (
    <Tooltip>
      {/* The trigger is a wrapper because a disabled button gets no mouse or focus events, so it could never
          open the "Save to see…" tooltip itself. While disabled, the wrapper takes the focus for keyboard users. */}
      <TooltipTrigger asChild>
        <span className="inline-flex" tabIndex={isDisabled ? 0 : undefined}>
          <Button type="button" variant="outline" className="cursor-pointer" disabled={isDisabled} onClick={handleViewAsAgent}>
            View as agent ↗
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{isDirty ? UNSAVED_TOOLTIP : ENABLED_TOOLTIP}</TooltipContent>
    </Tooltip>
  );
}
