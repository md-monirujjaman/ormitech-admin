import { ArrowLeft, MessagesSquare } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/apiError';
import { ROUTES } from '@/lib/constants';
import { useLead } from '../hooks';

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-foreground">{value ?? '—'}</dd>
    </div>
  );
}

/**
 * One lead: who they are, where they came from, and the conversation they came out of.
 *
 * The lead's own `name`, `phone` and `email` are shown beside the linked customer's, because they can differ
 * — a lead exists from the moment a conversation produces one, which can be before anybody has corrected the
 * spelling of a name on the customer record.
 */
export default function LeadDetailPage() {
  const { organizationId, leadId } = useParams();
  const leadQuery = useLead(organizationId, leadId);
  const lead = leadQuery.data;

  if (leadQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load this lead"
        description={apiErrorMessage(leadQuery.error, 'The OrmiTech API refused the request.')}
        onRetry={() => leadQuery.refetch()}
      />
    );
  }

  if (leadQuery.isLoading || !lead) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link to={ROUTES.leads}>
            <ArrowLeft className="size-4" aria-hidden />
            All leads
          </Link>
        </Button>
        <PageHeader
          title={lead.name}
          description={`${lead.source} · captured ${formatDateTime(lead.createdAt)}`}
          showMockNotice={false}
          actions={<Badge variant="secondary">{lead.status}</Badge>}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead</CardTitle>
            <CardDescription>As the lead was captured.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Name" value={lead.name} />
              <Field label="Status" value={lead.status} />
              <Field label="Email" value={lead.email} />
              <Field label="Phone" value={lead.phone} />
              <Field label="Source" value={lead.source} />
              <Field label="Assigned to" value={lead.assignedAgentName ?? 'Unassigned'} />
              <Field label="Last updated" value={formatDateTime(lead.updatedAt)} />
              <Field label="Organization" value={lead.organizationName} />
            </dl>

            {lead.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1">
                {lead.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {lead.notes && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{lead.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
              <CardDescription>
                {lead.customer ? 'The customer record this lead is linked to.' : 'This lead is not linked to a customer record.'}
              </CardDescription>
            </CardHeader>
            {lead.customer && (
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <Field label="Name" value={lead.customer.name} />
                  <Field label="Email" value={lead.customer.email} />
                  <Field label="Phone" value={lead.customer.phone} />
                </dl>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversation</CardTitle>
              <CardDescription>
                {lead.conversation
                  ? 'The conversation this lead came out of.'
                  : 'This lead did not come from a conversation.'}
              </CardDescription>
            </CardHeader>
            {lead.conversation && (
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-2 gap-4">
                  <Field label="Channel" value={lead.conversation.channel} />
                  <Field label="Status" value={lead.conversation.status} />
                  <Field label="Mode" value={lead.conversation.mode} />
                  <Field label="Last message" value={formatDateTime(lead.conversation.lastMessageAt)} />
                </dl>

                {lead.conversation.lastMessagePreview && (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                    “{lead.conversation.lastMessagePreview}”
                  </p>
                )}

                <Button variant="secondary" size="sm" asChild>
                  <Link to={`${ROUTES.conversations}/${lead.organizationId}/${lead.conversation.id}`}>
                    <MessagesSquare className="size-4" aria-hidden />
                    Read the thread
                  </Link>
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
