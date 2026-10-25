import { Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export function AdminLayout() {
  // The documentation editor uses the full width: the markdown and its live preview sit side by side.
  const { pathname } = useLocation();
  const wide = pathname === ROUTES.docs || pathname.startsWith(`${ROUTES.docs}/`);
  return (
    <div className="flex min-h-svh bg-muted/30">
      <Sidebar />
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
          <div className={`mx-auto w-full ${wide ? 'max-w-[120rem]' : 'max-w-7xl'}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
