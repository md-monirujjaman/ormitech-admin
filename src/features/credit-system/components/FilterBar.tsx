import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_LABEL, STATUS_ORDER } from '../format';
import { defaultPeriod, periodToFilters, type FilterDraft } from '../period';
import type { Filters, OperationStatus } from '../types';
import { Problem } from './shared';

const DAY = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Date range, workspace, AI feature, model and status. Nothing is asked of the API until Apply, and a draft that is wrong is said so before any request. */
export function FilterBar({ initial, onApply }: { initial: FilterDraft; onApply: (filters: Filters, draft: FilterDraft) => void }) {
  const [draft, setDraft] = useState<FilterDraft>(initial);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const set = <K extends keyof FilterDraft>(key: K, value: FilterDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const apply = () => {
    const found: Record<string, string> = {};
    if (!draft.from || !draft.to) found.from = 'Choose both dates';
    else if (draft.from > draft.to) found.from = 'The start must not be after the end';
    else if (new Date(`${draft.to}T00:00:00`).getTime() - new Date(`${draft.from}T00:00:00`).getTime() > 365 * DAY) found.from = 'The period can be at most one year';
    if (draft.organizationId.trim() && !UUID.test(draft.organizationId.trim())) found.organizationId = 'A workspace ID looks like 018f0000-0000-7000-8000-000000000001';
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    const filters: Filters = { ...periodToFilters(draft) };
    if (draft.organizationId.trim()) filters.organizationId = draft.organizationId.trim().toLowerCase();
    if (draft.kind.trim()) filters.kind = draft.kind.trim();
    if (draft.model.trim()) filters.model = draft.model.trim();
    if (draft.status) filters.status = draft.status;
    onApply(filters, draft);
  };

  return (
    <form className="space-y-3 rounded-md border border-border p-3" noValidate aria-label="Filters" onSubmit={(event) => { event.preventDefault(); apply(); }}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="filter-from">From</Label>
          <Input id="filter-from" type="date" value={draft.from} onChange={(event) => set('from', event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-to">To (including this day)</Label>
          <Input id="filter-to" type="date" value={draft.to} onChange={(event) => set('to', event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-workspace">Workspace ID</Label>
          <Input id="filter-workspace" value={draft.organizationId} placeholder="All workspaces" autoComplete="off" onChange={(event) => set('organizationId', event.target.value)} />
          <Problem>{problems.organizationId}</Problem>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-kind">AI feature</Label>
          <Input id="filter-kind" value={draft.kind} placeholder="All (reply, tagging, …)" autoComplete="off" onChange={(event) => set('kind', event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-model">Model</Label>
          <Input id="filter-model" value={draft.model} placeholder="All models" autoComplete="off" onChange={(event) => set('model', event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-status">Status</Label>
          <Select value={draft.status === '' ? 'all' : draft.status} onValueChange={(value) => set('status', value === 'all' ? '' : (value as OperationStatus))}>
            <SelectTrigger id="filter-status" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_ORDER.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Problem>{problems.from}</Problem>
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Apply filters
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { const period = defaultPeriod(); const blank = { ...period, organizationId: '', kind: '', model: '', status: '' as const }; setDraft(blank); setProblems({}); onApply({ ...periodToFilters(period) }, blank); }}>
          Reset
        </Button>
      </div>
    </form>
  );
}
