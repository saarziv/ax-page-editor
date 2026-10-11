import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useEditorStore } from '@/state/store';

const SAMPLES = [
  { label: 'Article', url: 'sample:article' },
  { label: 'Product', url: 'sample:product' },
  { label: 'Pricing', url: 'sample:pricing' },
];

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
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Or try a sample:</span>
            {SAMPLES.map((sample) => (
              <Button key={sample.url} variant="outline" size="sm" onClick={() => setUrl(sample.url)}>
                {sample.label}
              </Button>
            ))}
          </div>
          {/* Recent row stays hidden: GET /api/configs returns [] until 05. */}
        </CardContent>
      </Card>
    </main>
  );
}
