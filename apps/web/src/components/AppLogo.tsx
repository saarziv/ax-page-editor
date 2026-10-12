import { ScanEye } from 'lucide-react';

export function AppLogo() {
  return (
    <span className="flex items-center gap-2 px-1">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <ScanEye className="size-4" aria-hidden />
      </span>
      <span className="text-sm font-semibold tracking-tight">AX Editor</span>
    </span>
  );
}
