import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';

export default function NotFound() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/30 px-6 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">The page you're looking for doesn't exist or may have moved.</p>
      <Button asChild>
        <Link to={isAuthenticated ? ROUTES.dashboard : ROUTES.login}>
          <ArrowLeft className="size-4" aria-hidden />
          {isAuthenticated ? 'Back to dashboard' : 'Back to sign in'}
        </Link>
      </Button>
    </div>
  );
}
