import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHealthQuery } from '@/state/queries';

export function App() {
  const healthQuery = useHealthQuery();

  return (
    <main className="mx-auto max-w-xl p-8">
      <Card>
        <CardHeader>
          <CardTitle>AX Editor</CardTitle>
        </CardHeader>
        <CardContent>
          {healthQuery.isPending && <p className="text-muted-foreground">Loading…</p>}
          {healthQuery.isError && (
            <p role="alert" className="text-destructive">
              {healthQuery.error.message}
            </p>
          )}
          {healthQuery.isSuccess && (
            <pre className="rounded-md bg-muted p-3 text-sm">
              {JSON.stringify(healthQuery.data, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
