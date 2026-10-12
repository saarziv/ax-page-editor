import type { Modification } from '@ax/core';

// A Record over every type, so adding a modification type to core fails typecheck until it has a label.
export const MODIFICATION_LABELS: Record<Modification['type'], string> = {
  hide: 'Hidden from AI',
  context: 'Context',
  forward: 'Forwarded',
};
