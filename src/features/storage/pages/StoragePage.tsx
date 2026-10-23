import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, HardDrive } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useStorageFailedProcessing,
  useStorageOrganizations,
  useStorageOverview,
  useStoragePolicy,
  useStorageRecentFiles,
} from '@/features/storage/hooks';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { StorageLimit } from '@/types/storage';

const PAGE_SIZE = 25;

const CATEGORY_LABELS: Record<string, string> = {
  knowledge_base: 'Knowledge base',
  product_image: 'Product images',
  product_document: 'Product documents',
  message_attachment: 'Message attachments',
  business_asset: 'Business assets',
  other: 'Other documents',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

function describeLimit(limit: StorageLimit): string {
  if (limit.kind === 'unlimited') return 'Unlimited';
  if (limit.kind === 'disabled') return 'Storage disabled';
  return formatBytes(limit.value ?? 0);
}

const SOURCE_LABELS: Record<StorageLimit['source'], string> = { override: 'Organization override', plan: 'Plan', default: 'Platform default' };

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'warn' }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-2xl font-semibold tracking-tight text-foreground', tone === 'warn' && 'text-destructive')}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function OverviewTab() {
  const overview = useStorageOverview();
  const recent = useStorageRecentFiles();
  const failed = useStorageFailedProcessing();

  if (overview.isError) return <ErrorState title="Couldn't load storage overview" onRetry={() => void overview.refetch()} />;
  if (overview.isLoading || !overview.data) return <LoadingState label="Loading storage…" />;
  const data = overview.data;

  return (
    <div className="space-y-6">
      {!data.r2Configured && (
        <Card className="border-warning/40">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 text-warning" aria-hidden />
            <p className="text-muted-foreground">
              Cloudflare R2 is not configured on this API. New files are written to local disk. Set the <code>R2_*</code> variables in the API
              environment to store them in the private bucket.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total stored" value={formatBytes(data.totalBytes)} hint={`${data.totalFiles.toLocaleString()} files`} />
        <Stat label="Organizations with files" value={data.organizationsWithFiles.toLocaleString()} />
        <Stat label="Near limit (80%+)" value={data.organizationsNearLimit.toLocaleString()} tone={data.organizationsNearLimit > 0 ? 'warn' : undefined} />
        <Stat label="Over limit" value={data.organizationsOverLimit.toLocaleString()} tone={data.organizationsOverLimit > 0 ? 'warn' : undefined} />
        <Stat label="Failed documents" value={data.failedKnowledgeSources.toLocaleString()} tone={data.failedKnowledgeSources > 0 ? 'warn' : undefined} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">By category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files stored yet.</p>
          ) : (
            data.byCategory.map((row) => (
              <div key={row.category} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-foreground">{CATEGORY_LABELS[row.category] ?? row.category}</span>
                  <span className="text-muted-foreground">
                    {formatBytes(row.bytes)} · {row.count.toLocaleString()} files
                  </span>
                </div>
                <Progress value={data.totalBytes > 0 ? (row.bytes / data.totalBytes) * 100 : 0} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Recent uploads</CardTitle>
            <CardDescription>File names and sizes only; contents are never shown here.</CardDescription>
          </CardHeader>
          {recent.isError ? (
            <ErrorState className="m-4" title="Couldn't load recent uploads" onRetry={() => void recent.refetch()} />
          ) : recent.isLoading ? (
            <LoadingState label="Loading…" />
          ) : (recent.data ?? []).length === 0 ? (
            <EmptyState className="m-4 border-0" icon={HardDrive} title="No uploads yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.data!.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="max-w-[14rem] truncate font-medium text-foreground" title={file.originalName}>
                      {file.originalName}
                      <span className="block text-xs font-normal text-muted-foreground">{CATEGORY_LABELS[file.category] ?? file.category}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{file.organizationName}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm">{formatBytes(file.sizeBytes)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{new Date(file.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Failed document processing</CardTitle>
            <CardDescription>Knowledge-base documents the AI could not read. The organization can retry from its own dashboard.</CardDescription>
          </CardHeader>
          {failed.isError ? (
            <ErrorState className="m-4" title="Couldn't load failed documents" onRetry={() => void failed.refetch()} />
          ) : failed.isLoading ? (
            <LoadingState label="Loading…" />
          ) : (failed.data ?? []).length === 0 ? (
            <EmptyState className="m-4 border-0" icon={HardDrive} title="No failed documents" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failed.data!.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="max-w-[12rem] truncate font-medium text-foreground">{source.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{source.organizationName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{source.failureReason ?? 'Unknown'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

function OrganizationsTab() {
  const [search, setSearch] = useState('');
  const [nearLimit, setNearLimit] = useState(false);
  const [page, setPage] = useState(1);
  const query = useStorageOrganizations({ search: search.trim() || undefined, nearLimit, page, limit: PAGE_SIZE });

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search organization…"
          className="w-full sm:max-w-xs"
          aria-label="Search organizations"
        />
        <Button
          variant={nearLimit ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setNearLimit((value) => !value);
            setPage(1);
          }}
        >
          Near or over limit
        </Button>
      </div>

      {query.isError ? (
        <ErrorState className="m-4" title="Couldn't load organizations" onRetry={() => void query.refetch()} />
      ) : query.isLoading || !query.data ? (
        <LoadingState label="Loading organizations…" />
      ) : query.data.items.length === 0 ? (
        <EmptyState className="m-4 border-0" icon={HardDrive} title="No organizations match" />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Files</TableHead>
                <TableHead>Quota</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((row) => (
                <TableRow key={row.organizationId}>
                  <TableCell className="font-medium text-foreground">{row.organizationName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.plan}</TableCell>
                  <TableCell className="min-w-44">
                    <div className="space-y-1">
                      <p className="text-sm text-foreground">
                        {formatBytes(row.usedBytes)} <span className="text-muted-foreground">/ {describeLimit(row.limit)}</span>
                      </p>
                      {row.percentUsed !== null && (
                        <Progress value={Math.min(row.percentUsed, 100)} indicatorClassName={cn(row.nearLimit && 'bg-warning', row.overLimit && 'bg-destructive')} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{row.fileCount.toLocaleString()}</TableCell>
                  <TableCell className="space-y-1">
                    {row.overLimit ? (
                      <Badge variant="destructive">Over limit</Badge>
                    ) : row.nearLimit ? (
                      <Badge variant="warning">{row.percentUsed}% used</Badge>
                    ) : (
                      <Badge variant="secondary" className="font-normal">
                        {row.percentUsed === null ? '—' : `${row.percentUsed}%`}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">{SOURCE_LABELS[row.limit.source]}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`${ROUTES.organizations}/${row.organizationId}`}>Open</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.meta.total} onPageChange={setPage} />
        </>
      )}
    </Card>
  );
}

function PolicyTab() {
  const policy = useStoragePolicy();
  if (policy.isError) return <ErrorState title="Couldn't load storage policy" onRetry={() => void policy.refetch()} />;
  if (policy.isLoading || !policy.data) return <LoadingState label="Loading policy…" />;
  const data = policy.data;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">Plan storage quotas</CardTitle>
          <CardDescription>
            Edit a plan&apos;s <code>storage_bytes</code> limit on the <Link className="underline" to={ROUTES.plans}>Plans</Link> page, or set a single
            organization&apos;s override on its detail page. Lowering a quota never deletes files — the organization is only blocked from
            uploading more until it is under the limit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(data.planQuotas).map(([slug, limit]) => (
            <div key={slug} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span className="font-medium capitalize text-foreground">{slug}</span>
              <span className="text-muted-foreground">
                {describeLimit(limit)} · {SOURCE_LABELS[limit.source]}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">Upload rules</CardTitle>
          <CardDescription>Fixed in the API. Types are detected from the file&apos;s bytes, never from its name.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-1">
            {Object.entries(data.maxBytesByKind).map(([kind, bytes]) => (
              <div key={kind} className="flex justify-between">
                <span className="capitalize text-foreground">Max {kind}</span>
                <span className="text-muted-foreground">{formatBytes(bytes)}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span className="text-foreground">Max knowledge-base document</span>
              <span className="text-muted-foreground">{formatBytes(data.knowledgeMaxBytes)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Knowledge-base file types</p>
            <div className="flex flex-wrap gap-1">
              {data.knowledgeMimeTypes.map((mime) => (
                <Badge key={mime} variant="secondary" className="font-mono text-[10px] font-normal">
                  {mime}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">All allowed types ({data.allowedMimeTypes.length})</p>
            <div className="flex flex-wrap gap-1">
              {data.allowedMimeTypes.map((mime) => (
                <Badge key={mime} variant="outline" className="font-mono text-[10px] font-normal">
                  {mime}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StoragePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Storage"
        description="Files stored by every organization, quotas and document processing. Metadata only."
        showMockNotice={false}
      />
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="policy">Policy</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="organizations">
          <OrganizationsTab />
        </TabsContent>
        <TabsContent value="policy">
          <PolicyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
