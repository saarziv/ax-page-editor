import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { resolve, type Modification, type PageNode } from '@ax/core';
import { useEditorStore } from '@/state/store';
import { MODIFICATION_LABELS } from './modificationLabels';

interface MarkedElement {
  nodeId: string;
  labels: string[];
}

interface MarkerBox extends MarkedElement {
  top: number;
  left: number;
  width: number;
  height: number;
}

// An overlay for the same reason as the hover box: a badge can't go inside an <img> or a <tr>.
// It fills the content box exactly (absolute inset-0), so its own rect is the origin for every marker.
export function ModificationLayer({ root }: { root: PageNode }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const modificationsDraft = useEditorStore((state) => state.modificationsDraft);
  const [markerBoxes, setMarkerBoxes] = useState<MarkerBox[]>([]);

  // Only modifications that resolve get a marker: a marker on the wrong element would tell the publisher something false.
  // Interim until 03's transform: a resolved modification counts as active.
  const markedElements = useMemo(() => groupResolvedByNode(root, modificationsDraft), [root, modificationsDraft]);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    const contentBox = layer?.parentElement;
    if (!layer || !contentBox) return;

    function measure() {
      if (!layer || !contentBox) return;
      const layerRect = layer.getBoundingClientRect();
      setMarkerBoxes(
        markedElements.flatMap((marked) => {
          // Ids contain '>' and ':', which are CSS syntax, so they must be escaped inside the attribute selector.
          const element = contentBox.querySelector(`[data-node-id="${CSS.escape(marked.nodeId)}"]`);
          if (!element) return [];
          const elementRect = element.getBoundingClientRect();
          return [{ ...marked, top: elementRect.top - layerRect.top, left: elementRect.left - layerRect.left, width: elementRect.width, height: elementRect.height }];
        }),
      );
    }

    measure();
    // The content box resizes when an image finishes loading or the window changes width, which moves elements.
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(contentBox);
    return () => resizeObserver.disconnect();
  }, [markedElements]);

  return (
    <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      {markerBoxes.map((markerBox) => (
        <div
          key={markerBox.nodeId}
          data-testid="modification-marker"
          data-marker-for={markerBox.nodeId}
          className="absolute z-[5] bg-amber-400/10 outline-2 outline-amber-500 outline-dashed"
          style={{ top: markerBox.top, left: markerBox.left, width: markerBox.width, height: markerBox.height }}
        >
          {/* Top-right, so it never collides with the hover chip on the top-left. */}
          <div className="absolute right-0 bottom-full mb-1 flex gap-1">
            {markerBox.labels.map((label) => (
              <span key={label} className="rounded-sm bg-amber-500 px-1.5 py-0.5 text-[10px] leading-none font-medium whitespace-nowrap text-white">
                {label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// One entry per element, so an element with two modifications gets one box with two badges.
function groupResolvedByNode(root: PageNode, modificationsDraft: Modification[]): MarkedElement[] {
  const labelsByNodeId = new Map<string, string[]>();
  for (const modification of modificationsDraft) {
    const resolvedNode = resolve(root, modification.target);
    if (!resolvedNode) continue;
    const labels = labelsByNodeId.get(resolvedNode.id) ?? [];
    labelsByNodeId.set(resolvedNode.id, [...labels, MODIFICATION_LABELS[modification.type]]);
  }
  return [...labelsByNodeId].map(([nodeId, labels]) => ({ nodeId, labels }));
}
