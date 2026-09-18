import { Database } from 'lucide-react';
import { isMockDataSource } from '@/api/dataSource';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Marks any screen whose data comes from the in-memory mock source. It disappears on its own once
 * `VITE_ADMIN_DATA_SOURCE=api` — the admin should never have to guess whether what they're looking at is real.
 */
export function MockDataNotice() {
  if (!isMockDataSource) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Database className="size-3" aria-hidden />
          Mock data
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        In-memory fixtures. ormitech-api&apos;s admin endpoints don&apos;t exist yet — changes persist only until this page reloads.
      </TooltipContent>
    </Tooltip>
  );
}
