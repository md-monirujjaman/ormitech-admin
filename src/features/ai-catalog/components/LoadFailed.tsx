import axios from 'axios';
import { ShieldAlert } from 'lucide-react';
import { ErrorState } from '@/components/ui/ErrorState';
import { apiErrorMessage } from '@/lib/apiError';

/**
 * A list that could not be loaded. A refusal for lack of permission is said plainly and does not offer a retry that
 * cannot work; a session that has expired never gets here, because the API client signs the administrator out first.
 */
export function LoadFailed({ error, what, onRetry }: { error: unknown; what: string; onRetry: () => void }) {
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <div className="flex size-10 items-center justify-center rounded-full bg-warning/15 text-warning">
          <ShieldAlert className="size-5" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">You don’t have permission to see {what}</p>
          <p className="max-w-sm text-sm text-muted-foreground">Only super admins can manage AI providers and models. Ask a super admin if you need access.</p>
        </div>
      </div>
    );
  }
  return <ErrorState title={`Couldn’t load ${what}`} description={apiErrorMessage(error, 'The OrmiTech API refused the request.')} onRetry={onRetry} />;
}
