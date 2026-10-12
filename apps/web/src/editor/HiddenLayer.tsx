import { useLayoutEffect, useRef, useState } from 'react';
import type { PageNode } from '@ax/core';
import { MODIFICATION_LABELS } from './modificationLabels';

interface VeilBox {
  nodeId: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

// The faded look is a veil on top of each hidden element, not opacity on the element itself:
// opacity would fade the selection outline too, and a label can't go inside an <img> or a <tr>.
// It fills the content box exactly (absolute inset-0), so its own rect is the origin for every veil.
export function HiddenLayer({ markedRoot }: { markedRoot: PageNode }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [veilBoxes, setVeilBoxes] = useState<VeilBox[]>([]);

  // Re-measures when the marked page changes, which is when PreviewNode adds or drops data-hidden.
  useLayoutEffect(() => {
    const layer = layerRef.current;
    const contentBox = layer?.parentElement;
    if (!layer || !contentBox) return;

    function measure() {
      if (!layer || !contentBox) return;
      const layerRect = layer.getBoundingClientRect();
      const hiddenElements = [...contentBox.querySelectorAll<HTMLElement>('[data-hidden="true"]')];
      setVeilBoxes(
        hiddenElements
          // A hidden element inside another hidden element is already under its parent's veil.
          .filter((element) => !element.parentElement?.closest('[data-hidden="true"]'))
          .flatMap((element) => {
            const nodeId = element.dataset.nodeId;
            if (nodeId === undefined) return [];
            const elementRect = element.getBoundingClientRect();
            return [{ nodeId, top: elementRect.top - layerRect.top, left: elementRect.left - layerRect.left, width: elementRect.width, height: elementRect.height }];
          }),
      );
    }

    measure();
    // The content box resizes when an image finishes loading or the window changes width, which moves elements.
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(contentBox);
    return () => resizeObserver.disconnect();
  }, [markedRoot]);

  // pointer-events-none lets hovers and clicks through to the element, so a hidden element stays selectable (K3).
  return (
    <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      {veilBoxes.map((veilBox) => (
        <div
          key={veilBox.nodeId}
          data-testid="hidden-veil"
          data-veil-for={veilBox.nodeId}
          className="absolute z-[5] bg-background/50 backdrop-grayscale"
          style={{ top: veilBox.top, left: veilBox.left, width: veilBox.width, height: veilBox.height }}
        >
          <span className="absolute top-1 left-1 rounded-sm bg-muted-foreground px-1.5 py-0.5 text-[10px] leading-none font-medium whitespace-nowrap text-background">
            ⊘ {MODIFICATION_LABELS.hide}
          </span>
        </div>
      ))}
    </div>
  );
}
