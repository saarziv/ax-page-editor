import { Button } from '@/components/ui/button';

const MODIFICATION_CONTROLS = ['Hide from AI', 'Context for AI', 'Forward this link'];

// Disabled until 02 connects the controls to the selected element.
export function Inspector() {
  return (
    <aside aria-label="Inspector" className="flex w-72 shrink-0 flex-col gap-2 border-l p-4">
      {MODIFICATION_CONTROLS.map((controlName) => (
        <Button key={controlName} variant="outline" disabled>
          {controlName}
        </Button>
      ))}
    </aside>
  );
}
