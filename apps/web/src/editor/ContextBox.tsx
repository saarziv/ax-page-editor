import { useId } from 'react';
import { CONTEXT_NOTE_MAX_LENGTH, isContainerKind, targetFor, type PageNode } from '@ax/core';
import { Textarea } from '@/components/ui/textarea';
import { useNodeModifications } from '@/state/derived';
import { useEditorStore } from '@/state/store';

// The counter only shows once the limit is close, so it doesn't distract from short notes.
const COUNTER_FROM_LENGTH = 250;

// Its value is read from the draft, never stored, so selecting another element shows that element's note.
export function ContextBox({ node }: { node: PageNode }) {
  const textareaId = useId();
  const setContext = useEditorStore((state) => state.setContext);
  const contextNote = useNodeModifications(node).find((modification) => modification.type === 'context')?.note ?? '';

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={textareaId} className="text-sm font-medium">
        Context for AI
      </label>
      {/* Grows with the text from 3 to 10 lines, then scrolls inside itself, so the controls below stay reachable (K11). */}
      <Textarea
        id={textareaId}
        value={contextNote}
        placeholder={contextPlaceholderFor(node)}
        maxLength={CONTEXT_NOTE_MAX_LENGTH}
        onChange={(event) => setContext(targetFor(node), event.target.value)}
        className="max-h-[calc(10lh+1rem+2px)] min-h-[calc(3lh+1rem+2px)] resize-none overflow-y-auto break-words"
      />
      {contextNote.length >= COUNTER_FROM_LENGTH && (
        <p className="self-end text-xs text-muted-foreground">
          {contextNote.length} / {CONTEXT_NOTE_MAX_LENGTH}
        </p>
      )}
    </div>
  );
}

/** A prompt suited to what the element is, so the publisher knows what kind of note helps an agent. */
function contextPlaceholderFor(node: PageNode): string {
  // Checked before containers, since a figure is both and almost always holds a chart or picture.
  if (node.kind === 'image' || node.kind === 'figure') return 'What does this chart show?';
  if (node.kind === 'link' || node.kind === 'button' || node.kind === 'field') return 'What happens when someone clicks this?';
  if (isContainerKind(node.kind)) return 'What is this section about?';
  return 'What should an AI know about this?';
}
