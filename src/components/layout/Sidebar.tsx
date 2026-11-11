import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import logoLight from '@/assets/auth/ormitech-logo-light.webp';
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
        'sticky top-0 hidden h-svh shrink-0 flex-col glass-sidebar border-r text-sidebar-foreground transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[72px]' : 'w-64',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2 border-b border-white/10 px-4', collapsed && 'justify-center px-2')}>
        {collapsed ? (
          <img src="/icons/favicon.svg" alt="OrmiTech" width={32} height={32} className="size-8 shrink-0 rounded-lg" />
        ) : (
          <div className="flex min-w-0 items-center gap-2.5">
            <img src={logoLight} alt="OrmiTech" width={750} height={225} className="h-auto w-[8.5rem] shrink-0 object-contain" />
            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/70">Admin</span>
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

      <div className="border-t border-white/10 p-2">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-sidebar-foreground/60 transition-colors hover:bg-white/10 hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronsRight className="size-4" aria-hidden /> : <ChevronsLeft className="size-4" aria-hidden />}
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  );
}
