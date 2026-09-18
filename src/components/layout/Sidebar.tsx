import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { NavSection } from '@/components/navigation/NavSection';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NAV_SECTIONS } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';

export function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleCollapsed = useUIStore((state) => state.toggleSidebarCollapsed);

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2 border-b border-sidebar-border px-4', collapsed && 'justify-center px-2')}>
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">OT</div>
        {!collapsed && (
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-sidebar-foreground">OrmiTech</span>
            <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Admin</span>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        <nav className="space-y-1 pb-4">
          {NAV_SECTIONS.map((section) => (
            <NavSection key={section.label} section={section} collapsed={collapsed} />
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronsRight className="size-4" aria-hidden /> : <ChevronsLeft className="size-4" aria-hidden />}
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  );
}
