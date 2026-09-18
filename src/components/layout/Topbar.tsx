import { ChevronRight, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { NotificationsMenu } from '@/components/layout/NotificationsMenu';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { findNavMeta } from '@/lib/navigation';
import { useUIStore } from '@/store/uiStore';

export function Topbar() {
  const { pathname } = useLocation();
  const { title, section } = findNavMeta(pathname);
  const setMobileSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen);

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileSidebarOpen(true)} aria-label="Open navigation">
        <Menu className="size-5" aria-hidden />
      </Button>

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {section && (
          <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <span>{section}</span>
            <ChevronRight className="size-3" aria-hidden />
            <span className="text-foreground">{title}</span>
          </nav>
        )}
        <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">{title}</h1>
      </div>

      <div className="w-auto max-w-xs shrink-0 sm:max-w-sm md:w-64 lg:w-80">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1">
        <NotificationsMenu />
        <ThemeToggle />
        <ProfileMenu />
      </div>
    </header>
  );
}
