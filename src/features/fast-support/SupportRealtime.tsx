import { Bell, X } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { ROUTES } from '@/lib/constants';
import { JoinContext } from './SupportJoinContext';
import { useSupportSocket, type SupportSocketEvent } from './useSupportSocket';

interface Toast {
  id: number;
  sessionId: string;
  text: string;
}

/**
 * Keeps one live connection for a signed-in moderator, wherever they are in the panel, and says when a new request arrives.
 * Nothing renders for administrators who have no part in Fast Support.
 */
export function SupportRealtime({ children }: { children: ReactNode }) {
  const { can } = usePermissions();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const onEvent = useCallback((event: SupportSocketEvent) => {
    if (event.type !== 'created') return;
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, sessionId: event.sessionId, text: event.subject ? `New support request: ${event.subject}` : 'New support request' }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 12_000);
  }, []);

  const { join } = useSupportSocket(can('fastsupport.use'), onEvent);

  return (
    <JoinContext.Provider value={join}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className="flex items-start gap-3 glass-strong rounded-lg border p-3">
              <Bell className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{toast.text}</p>
                <Link to={`${ROUTES.fastSupport}/${toast.sessionId}`} className="text-xs font-medium text-primary underline underline-offset-2" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>
                  Open it
                </Link>
              </div>
              <button type="button" aria-label="Dismiss" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </JoinContext.Provider>
  );
}
