import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/AppLogo';
import { Input } from '@/components/ui/input';
import { DEMO_URL } from '@/editor/demo';
import { useEditorStore } from '@/state/store';
import { SavedPages } from './SavedPages';

export function StartScreen() {
  const setUrl = useEditorStore((state) => state.setUrl);
  const [typedUrl, setTypedUrl] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedUrl = typedUrl.trim();
    if (trimmedUrl) setUrl(trimmedUrl);
  }

  // Same full-height shell and top bar as the editor, so opening a page doesn't feel like a jump to another app.
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center border-b bg-background p-3">
        <AppLogo />
      </header>
      <main className="flex-1 bg-sidebar bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,var(--color-accent),transparent)]">
        <div className="mx-auto max-w-2xl space-y-10 px-6 pt-24 pb-12">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              See your page the way <span className="text-primary">AI agents</span> read it.
            </h1>
            <p className="text-muted-foreground">
              Open a page, then choose what agents skip, what context they get, and which links they follow.
            </p>
          </div>
          <div className="space-y-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                aria-label="Page URL"
                placeholder="Paste a page URL…"
                className="h-10 bg-background shadow-xs"
                value={typedUrl}
                onChange={(event) => setTypedUrl(event.target.value)}
              />
              <Button type="submit" size="lg" className="cursor-pointer">
                Open
              </Button>
            </form>
            <p className="text-sm text-muted-foreground">
              No page in mind?{' '}
              <Button variant="link" className="h-auto cursor-pointer p-0" onClick={() => setUrl(DEMO_URL)}>
                Try a sample
              </Button>
            </p>
          </div>
          <SavedPages />
        </div>
      </main>
    </div>
  );
}
