import { useState } from 'react';
import { Bell, MessageCircle, Server, Webhook } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AdminNotification } from '@/types/admin';

/**
 * Mock data — clearly separated from anything real. Ready to swap for a `useQuery` against a future
 * `GET /admin/notifications` once ormitech-api exposes one; nothing here fabricates a live feed.
 */
const MOCK_NOTIFICATIONS: AdminNotification[] = [
  { id: '1', title: 'New organization registered', description: 'Northwind Logistics signed up on the Growth plan.', severity: 'success', read: false, createdAt: '2026-09-16T08:12:00Z' },
  { id: '2', title: 'Payment event', description: 'Invoice #10432 for Acme Retail failed to charge.', severity: 'critical', read: false, createdAt: '2026-09-16T06:40:00Z' },
  { id: '3', title: 'System warning', description: 'Webhook processing latency above threshold for 4 minutes.', severity: 'warning', read: false, createdAt: '2026-09-15T22:05:00Z' },
  { id: '4', title: 'AI usage alert', description: 'Bright Dental reached 90% of its monthly AI message limit.', severity: 'warning', read: true, createdAt: '2026-09-15T18:30:00Z' },
  { id: '5', title: 'Webhook failure', description: 'Delivery to hooks.example.com failed 3 times in a row.', severity: 'critical', read: true, createdAt: '2026-09-15T14:02:00Z' },
];

const SEVERITY_ICON: Record<AdminNotification['severity'], typeof Bell> = {
  info: Bell,
  success: MessageCircle,
  warning: Server,
  critical: Webhook,
};

const SEVERITY_DOT: Record<AdminNotification['severity'], string> = {
  info: 'bg-muted-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-destructive',
};

export function NotificationsMenu() {
  const [notifications] = useState(MOCK_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}>
          <Bell className="size-4" aria-hidden />
          {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" aria-hidden />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between text-xs">
          Notifications
          {unreadCount > 0 && (
            <Badge variant="default" className="px-1.5 py-0 text-[10px]">
              {unreadCount} new
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 space-y-0.5 overflow-y-auto">
          {notifications.map((notification) => {
            const Icon = SEVERITY_ICON[notification.severity];
            return (
              <div key={notification.id} className={cn('flex gap-2.5 rounded-sm px-2 py-2 text-sm', !notification.read && 'bg-accent/50')}>
                <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', SEVERITY_DOT[notification.severity])} aria-hidden />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                    <p className="truncate font-medium text-foreground">{notification.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{notification.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
