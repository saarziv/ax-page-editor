import { useId } from 'react';
import { forwardBlockReason, targetFor, type PageNode } from '@ax/core';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNodeModifications } from '@/state/derived';
import { useEditorStore } from '@/state/store';

const ENABLED_TOOLTIP = "AI agents get the main content of the linked page, right after this link. Useful because most agents don't follow links.";

/** Rendered for links only (K1). Its state is read from the draft, so a forwarded link shows on when selected again. */
export function ForwardSwitch({ link, pageUrl }: { link: PageNode; pageUrl: string }) {
  const switchId = useId();
  const toggleForward = useEditorStore((state) => state.toggleForward);
  const isForwarded = useNodeModifications(link).some((modification) => modification.type === 'forward');
  const href = link.attrs?.href ?? '';
  const blockReason = forwardBlockReason(href, pageUrl);
  const isDisabled = blockReason !== null;

  return (
    <div className="flex items-center justify-between py-1">
      <label htmlFor={switchId} className={`text-sm font-medium ${isDisabled ? 'text-muted-foreground' : 'cursor-pointer'}`}>
        Forward to AI
      </label>
      <Tooltip>
        {/* A wrapper trigger, as on View as agent: a disabled switch gets no hover, so it could never show its reason. */}
        <TooltipTrigger asChild>
          <span className="inline-flex" tabIndex={isDisabled ? 0 : undefined}>
            <Switch
              id={switchId}
              checked={isForwarded}
              disabled={isDisabled}
              onCheckedChange={() => toggleForward(targetFor(link), href)}
              className="data-[state=checked]:bg-green-600"
            />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{blockReason ?? ENABLED_TOOLTIP}</TooltipContent>
      </Tooltip>
    </div>
  );
}
