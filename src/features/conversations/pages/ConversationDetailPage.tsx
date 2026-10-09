import { useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Pagination } from '@/components/shared/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/apiError';
import { ROUTES } from '@/lib/constants';
import { MessageThread } from '../components/MessageThread';
import { useConversation, useMessages } from '../hooks';

const PAGE_SIZE = 50;

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** One conversation, read end to end. */
export default function ConversationDetailPage() {
  const { organizationId, conversationId } = useParams();
  const [page, setPage] = useState(1);

  const conversationQuery = useConversation(organizationId, conversationId);
  const messagesQuery = useMessages(organizationId, conversationId, page);

  const conversation = conversationQuery.data;
  const messages = messagesQuery.data?.items ?? [];

  if (conversationQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load this conversation"
        description={apiErrorMessage(conversationQuery.error, 'The OrmiTech API refused the request.')}
        onRetry={() => conversationQuery.refetch()}
      />
    );
  }

  if (conversationQuery.isLoading || !conversation) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link to={ROUTES.conversations}>
            <ArrowLeft className="size-4" aria-hidden />
            All conversations
          </Link>
        </Button>
        <PageHeader
          title={conversation.customerName ?? 'Unnamed customer'}
          description={`${conversation.channelName ?? conversation.channel} · opened ${formatDateTime(conversation.createdAt)}`}
          showMockNotice={false}
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="outline">{conversation.mode}</Badge>
              <Badge variant="secondary">{conversation.status}</Badge>
            </div>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="overflow-hidden p-0">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-base">
              Thread
              <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <Lock className="size-3" aria-hidden />
                read-only
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {messagesQuery.isError ? (
              <ErrorState
                title="Couldn't load the messages"
                description={apiErrorMessage(messagesQuery.error, 'The OrmiTech API refused the request.')}
                onRetry={() => messagesQuery.refetch()}
              />
            ) : messagesQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : messages.length === 0 ? (
              <EmptyState title="No messages yet" description="This conversation has no messages." />
            ) : (
              <MessageThread messages={messages} />
            )}
          </CardContent>
          {(messagesQuery.data?.meta.totalPages ?? 1) > 1 && (
            <Pagination
              page={messagesQuery.data?.meta.page ?? page}
              pageSize={messagesQuery.data?.meta.limit ?? PAGE_SIZE}
              total={messagesQuery.data?.meta.total ?? 0}
              onPageChange={setPage}
            />
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {[
                ['Customer', conversation.customerName],
                ['Email', conversation.customerEmail],
                ['Channel', conversation.channelName ?? conversation.channel],
                ['Status', conversation.status],
                ['Mode', conversation.mode],
                ['Priority', conversation.priority],
                ['Assigned to', conversation.assignedAgentName ?? 'Unassigned'],
                ['Unread', String(conversation.unreadCount)],
                ['Last message', formatDateTime(conversation.lastMessageAt)],
                ['Opened', formatDateTime(conversation.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 truncate text-sm text-foreground">{value ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
