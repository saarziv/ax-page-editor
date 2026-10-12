import { Inspector } from './Inspector';
import { Preview } from './Preview';
import { TopBar } from './TopBar';

export function Editor({ url }: { url: string }) {
  return (
    <div className="flex h-screen flex-col">
      <TopBar url={url} />
      <div className="flex min-h-0 flex-1">
        <Preview url={url} />
        <Inspector />
      </div>
    </div>
  );
}
