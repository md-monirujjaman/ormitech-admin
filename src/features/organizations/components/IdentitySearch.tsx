import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/lib/constants';
import { workspaceApi } from '@/api/workspaceApi';

/** Finds a person or business by name, email, phone, slug or id, and jumps to their workspace. */
export function IdentitySearch() {
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setTerm(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const enabled = term.length >= 2;
  const query = useQuery({ queryKey: ['identities', term], queryFn: () => workspaceApi.searchIdentities(term), enabled });
  const result = enabled ? query.data : undefined;

  return (
    <Card className="p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Find anyone: Gmail, phone, name, business, workspace id…"
          className="pl-9"
          aria-label="Find a user or workspace"
        />
      </div>

      {enabled && query.isLoading && <p className="mt-3 text-sm text-muted-foreground">Searching…</p>}
      {enabled && query.isError && <p className="mt-3 text-sm text-destructive">Search failed. Try again.</p>}
      {result && result.people.length === 0 && result.workspaces.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No one matches “{result.query}”.</p>}

      {result && result.people.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">People</p>
          <ul className="divide-y divide-border rounded-md border border-border">
            {result.people.map((person) => (
              <li key={person.id} className="p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{person.name}</span>
                  <span className="text-muted-foreground">{person.email}</span>
                  {person.status !== 'active' && <Badge variant="warning" className="capitalize">{person.status}</Badge>}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {person.memberships.length === 0 && <span className="text-xs text-muted-foreground">Not in any workspace</span>}
                  {person.memberships.map((m) => (
                    <Link key={m.organizationId} to={`${ROUTES.organizations}/${m.organizationId}`} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                      {m.organizationName} · {m.role}
                      {m.organizationStatus !== 'active' ? ` · ${m.organizationStatus}` : ''}
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result && result.workspaces.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Workspaces</p>
          <ul className="divide-y divide-border rounded-md border border-border">
            {result.workspaces.map((workspace) => (
              <li key={workspace.id}>
                <Link to={`${ROUTES.organizations}/${workspace.id}`} className="flex flex-wrap items-center gap-2 p-3 text-sm hover:bg-muted">
                  <span className="font-medium">{workspace.name}</span>
                  <span className="text-muted-foreground">{[workspace.email, workspace.phone].filter(Boolean).join(' · ')}</span>
                  <Badge variant="outline" className="ml-auto capitalize">{workspace.plan ?? 'no plan'} · {workspace.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
