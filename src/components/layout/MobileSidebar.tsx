import { NavSection } from '@/components/navigation/NavSection';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { NAV_SECTIONS } from '@/lib/navigation';
import { useUIStore } from '@/store/uiStore';

export function MobileSidebar() {
  const open = useUIStore((state) => state.mobileSidebarOpen);
  const setOpen = useUIStore((state) => state.setMobileSidebarOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="flex w-72 flex-col p-0">
        <SheetHeader className="h-14 flex-row items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">OT</div>
          <SheetTitle className="flex flex-col items-start leading-none text-sidebar-foreground">
            <span className="text-sm font-semibold">OrmiTech</span>
            <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Admin</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2 pb-6">
          {NAV_SECTIONS.map((section) => (
            <NavSection key={section.label} section={section} onNavigate={() => setOpen(false)} />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
