import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { usePageTree, useSaveConfig } from '@/state/queries';
import { hasUnsavedChanges, useEditorStore } from '@/state/store';

const SAVED_TOAST_MS = 3000;
// One id for both outcomes, so a new save's result replaces the previous toast instead of stacking.
const SAVE_RESULT_TOAST_ID = 'save-result';

export function SaveButton({ url }: { url: string }) {
  // The tree's url is the normalized one the page was loaded under, not what the publisher typed.
  const pageUrl = usePageTree(url).data?.url;
  const modificationsDraft = useEditorStore((state) => state.modificationsDraft);
  const isDirty = useEditorStore(hasUnsavedChanges);
  const markSaved = useEditorStore((state) => state.markSaved);
  const saveConfig = useSaveConfig();

  function handleSave() {
    if (!pageUrl) return;
    saveConfig.mutate(
      { url: pageUrl, modifications: modificationsDraft },
      {
        onSuccess: (_savedConfig, sentRequest) => {
          markSaved(sentRequest.modifications);
          toast.success('Saved', { id: SAVE_RESULT_TOAST_ID, duration: SAVED_TOAST_MS });
        },
        // The draft is never touched, so every change stays on screen and still unsaved. The toast stays until the next save.
        onError: () => toast.error("Your changes couldn't be saved. Try again.", { id: SAVE_RESULT_TOAST_ID, duration: Infinity }),
      },
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="cursor-pointer"
      // Disabled while a save runs, so a double click can't send two.
      disabled={!pageUrl || !isDirty || saveConfig.isPending}
      onClick={handleSave}
    >
      Save
    </Button>
  );
}
