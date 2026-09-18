import { Bell, Bot, Building2, CreditCard, FileText, Radio, Settings } from 'lucide-react';
import { RECENT_ACTIVITY } from '@/lib/mockDashboardData';
import type { ActivityEvent } from '@/types/admin';

const TYPE_ICON: Record<ActivityEvent['type'], typeof Bell> = {
  organization: Building2,
  subscription: CreditCard,
  channel: Radio,
  ai: Bot,
  docs: FileText,
  settings: Settings,
};

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function ActivityFeed() {
  return (
    <ul className="space-y-4">
      {RECENT_ACTIVITY.map((event) => {
        const Icon = TYPE_ICON[event.type];
        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium text-foreground">{event.title}</p>
              <p className="text-sm text-muted-foreground">{event.description}</p>
              <p className="text-xs text-muted-foreground/70">{formatRelativeTime(event.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
