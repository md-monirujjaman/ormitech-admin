import { usePermissions } from '@/hooks/usePermissions';
import { NavItem } from '@/components/navigation/NavItem';
import { cn } from '@/lib/utils';
import type { NavSection as NavSectionType } from '@/types/navigation';

export function NavSection({ section, collapsed, onNavigate }: { section: NavSectionType; collapsed?: boolean; onNavigate?: () => void }) {
  const { can } = usePermissions();
  const visibleItems = section.items.filter((item) => can(item.permission));

  if (visibleItems.length === 0) return null;

  return (
    <div className="space-y-1">
      {!collapsed && <p className="px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">{section.label}</p>}
      <div className={cn('space-y-0.5', collapsed && 'pt-3')}>
        {visibleItems.map((item) => (
          <NavItem key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}
