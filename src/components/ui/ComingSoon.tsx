import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function ComingSoon({ title, description, icon: Icon = Construction }: { title: string; description?: string; icon?: LucideIcon }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border px-6 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="space-y-2">
        <Badge variant="outline" className="text-muted-foreground">
          Coming Soon
        </Badge>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {description ?? 'This module is part of the OrmiTech Admin roadmap and isn’t wired up to live data yet.'}
        </p>
      </div>
    </div>
  );
}
