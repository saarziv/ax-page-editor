import type { Modification } from '@ax/core';

// A Record over every type, so adding a modification type to core fails typecheck until it has a label.
export const MODIFICATION_LABELS: Record<Modification['type'], string> = {
  hide: 'Hidden from AI',
  context: 'Context',
  forward: 'Forwarded',
};

/** One modification in plain words, with its detail: "Hidden from AI", "Context: <note>", "Forwarded: <href>". */
export function describeModification(modification: Modification): string {
  const label = MODIFICATION_LABELS[modification.type];
  switch (modification.type) {
    case 'hide':
      return label;
    case 'context':
      return `${label}: ${modification.note}`;
    case 'forward':
      return `${label}: ${modification.href}`;
  }
}
