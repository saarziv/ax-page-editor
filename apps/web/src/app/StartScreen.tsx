import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <main className="mx-auto max-w-xl p-8">
      <Card>
        <CardHeader>
          <CardTitle>AX Editor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              aria-label="Page URL"
              placeholder="https://example.com/page"
              value={typedUrl}
              onChange={(event) => setTypedUrl(event.target.value)}
            />
            <Button type="submit">Open</Button>
          </form>
          <Button variant="link" className="px-0" onClick={() => setUrl(DEMO_URL)}>
            Try a sample
          </Button>
          <SavedPages />
        </CardContent>
      </Card>
    </main>
  );
}
