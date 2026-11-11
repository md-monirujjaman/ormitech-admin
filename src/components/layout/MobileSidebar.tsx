import logoLight from '@/assets/auth/ormitech-logo-light.webp';
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
        <SheetHeader className="h-14 flex-row items-center gap-2 border-b border-white/10 px-4">
          <SheetTitle className="flex items-center gap-2.5 leading-none text-sidebar-foreground">
            <img src={logoLight} alt="OrmiTech" width={750} height={225} className="h-auto w-[8.5rem] shrink-0 object-contain" />
            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/70">Admin</span>
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
