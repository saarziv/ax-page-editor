import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { findNodePath, type PageNode } from '@ax/core';
import { NODE_LABELS } from './nodeLabels';

interface HoverBox {
  nodeId: string;
  label: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

// One overlay box instead of a style on each node: CSS :hover would outline a link and its paragraph
// together, and a label can't go inside an <img> or a <tr>. Local state, because nothing else reads it.
export function HoverLayer({ root, children }: { root: PageNode; children: ReactNode }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [hoverBox, setHoverBox] = useState<HoverBox | null>(null);

  function handleMouseOver(event: MouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element) || !layerRef.current) return;
    const hoveredElement = event.target.closest<HTMLElement>('[data-node-id]');
    const hoveredId = hoveredElement?.dataset.nodeId;
    if (!hoveredElement || !hoveredId) return setHoverBox(null);
    if (hoveredId === hoverBox?.nodeId) return;

    const hoveredNode = findNodePath(root, hoveredId)?.at(-1);
    if (!hoveredNode) return setHoverBox(null);
    // Relative to this layer, which scrolls with the page, so the box stays on its element while scrolling.
    const layerRect = layerRef.current.getBoundingClientRect();
    const elementRect = hoveredElement.getBoundingClientRect();
    setHoverBox({
      nodeId: hoveredId,
      label: NODE_LABELS[hoveredNode.kind],
      top: elementRect.top - layerRect.top,
      left: elementRect.left - layerRect.left,
      width: elementRect.width,
      height: elementRect.height,
    });
  }

  return (
    <div ref={layerRef} className="relative" onMouseOver={handleMouseOver} onMouseLeave={() => setHoverBox(null)}>
      {children}
      {hoverBox && (
        <div
          data-testid="hover-box"
          aria-hidden="true"
          className="pointer-events-none absolute z-10 outline outline-1 outline-primary/50"
          style={{ top: hoverBox.top, left: hoverBox.left, width: hoverBox.width, height: hoverBox.height }}
        >
          {/* Above the top-left corner, so the chip never covers the content. */}
          <span className="absolute bottom-full left-0 mb-0.5 rounded-sm bg-primary/80 px-1.5 py-0.5 text-[10px] leading-none font-medium whitespace-nowrap text-primary-foreground">
            {hoverBox.label}
          </span>
        </div>
      )}
    </div>
  );
}
