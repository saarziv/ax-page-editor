import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { usePageTree, useSaveConfig } from '@/state/queries';
import { useEditorStore } from '@/state/store';

const SAVED_MESSAGE_MS = 3000;

export function SaveButton({ url }: { url: string }) {
  // The tree's url is the normalized one the page was loaded under, not what the publisher typed.
  const pageUrl = usePageTree(url).data?.url;
  const modificationsDraft = useEditorStore((state) => state.modificationsDraft);
  const saveConfig = useSaveConfig();
  const { isSuccess, reset } = saveConfig;

  useEffect(() => {
    if (!isSuccess) return;
    const hideSavedMessage = setTimeout(reset, SAVED_MESSAGE_MS);
    return () => clearTimeout(hideSavedMessage);
  }, [isSuccess, reset]);

  return (
    <div className="flex items-center gap-2">
      {isSuccess && (
        <span role="status" className="text-sm text-muted-foreground">
          Saved
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        // Disabled while a save runs, so a double click can't send two.
        disabled={!pageUrl || saveConfig.isPending}
        onClick={() => pageUrl && saveConfig.mutate({ url: pageUrl, modifications: modificationsDraft })}
      >
        Save
      </Button>
    </div>
  );
}
