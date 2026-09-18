import { useEffect, useMemo, useState } from 'react';
import { Building2, FileText, MessageSquare, Receipt, Search, User, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { SearchResultItem } from '@/types/admin';

/**
 * Local mock index — Phase 1 only, per spec: UI foundation for a future search across organizations, users,
 * conversations, leads, invoices and documentation. No Elasticsearch, no external index; this is not connected
 * to a real dataset.
 */
const MOCK_RESULTS: SearchResultItem[] = [
  { id: 'org-1', type: 'organization', title: 'Acme Retail', subtitle: 'Organization · Growth plan', href: ROUTES.organizations },
  { id: 'org-2', type: 'organization', title: 'Northwind Logistics', subtitle: 'Organization · Scale plan', href: ROUTES.organizations },
  { id: 'user-1', type: 'user', title: 'Sara Ahmed', subtitle: 'User · Acme Retail', href: ROUTES.users },
  { id: 'conv-1', type: 'conversation', title: 'WhatsApp — Order #4821', subtitle: 'Conversation · Bright Dental', href: ROUTES.conversations },
  { id: 'lead-1', type: 'lead', title: 'Mahin Rahman', subtitle: 'Lead · Facebook', href: ROUTES.leads },
  { id: 'inv-1', type: 'invoice', title: 'Invoice #10432', subtitle: 'Invoice · Acme Retail', href: ROUTES.invoices },
  { id: 'doc-1', type: 'documentation', title: 'WhatsApp Setup', subtitle: 'Documentation · Channels', href: ROUTES.docs },
];

const TYPE_ICON: Record<SearchResultItem['type'], typeof Building2> = {
  organization: Building2,
  user: User,
  conversation: MessageSquare,
  lead: UserPlus,
  invoice: Receipt,
  documentation: FileText,
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return MOCK_RESULTS;
    const q = query.toLowerCase();
    return MOCK_RESULTS.filter((item) => item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent sm:max-w-sm"
        aria-label="Open global search"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="hidden flex-1 text-left sm:inline">Search organizations, users, leads…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">⌘K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-24 max-w-xl translate-y-0 gap-0 p-0" hideClose>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search organizations, users, conversations, leads, invoices, docs…"
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No results for "{query}"</p>
            ) : (
              results.map((result) => {
                const Icon = TYPE_ICON[result.type];
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => {
                      navigate(result.href);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent',
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground">{result.title}</span>
                      {result.subtitle && <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
