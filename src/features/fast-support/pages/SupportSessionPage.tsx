import { ArrowLeft, Bot, Download, Headset, Paperclip, Send, StickyNote, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { fastSupportApi } from '../api';
import { useAccept, useAddNote, useReopen, useReply, useResolve, useSetAi, useSetStatus, useSupportDetail, useSupportMe } from '../hooks';
import { useJoinSupportSession } from '../SupportJoinContext';
import { formatWhen, STATUS_INFO } from '../status';
import type { SupportMessage } from '../types';

function Attachment({ sessionId, attachment }: { sessionId: string; attachment: NonNullable<SupportMessage['attachment']> }) {
  const [failed, setFailed] = useState(false);
  const download = async () => {
    setFailed(false);
    try {
      const blob = await fastSupportApi.attachment(sessionId, attachment.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setFailed(true);
    }
  };
  return (
    <button type="button" onClick={download} className="mt-1.5 inline-flex max-w-full items-center gap-2 rounded-md border border-current/20 bg-black/5 px-2 py-1 text-xs font-medium hover:bg-black/10">
      <Download className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{failed ? 'Could not download. Try again' : attachment.fileName}</span>
    </button>
  );
}

function Bubble({ message, sessionId }: { message: SupportMessage; sessionId: string }) {
  if (message.senderType === 'system') {
    return (
      <li className="flex justify-center">
        <p className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{message.body}</p>
      </li>
    );
  }
  const client = message.senderType === 'client';
  const ai = message.senderType === 'ai';
  return (
    <li className={cn('flex', client ? 'justify-start' : 'justify-end')}>
      <div className="max-w-[85%] sm:max-w-[75%]">
        <p className={cn('mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground', !client && 'justify-end')}>
          {ai ? <Bot className="size-3.5 text-sky-600" aria-hidden /> : client ? null : <Headset className="size-3.5 text-emerald-600" aria-hidden />}
          {client ? message.senderName ?? 'Client' : ai ? 'AI' : message.senderName ?? 'Moderator'}
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {client ? 'Client' : ai ? 'AI' : 'Moderator'}
          </Badge>
        </p>
        <div className={cn('whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm', client ? 'rounded-bl-md bg-muted' : ai ? 'rounded-br-md border border-sky-200 bg-sky-50 text-neutral-900 dark:bg-sky-950/40 dark:text-foreground' : 'rounded-br-md bg-primary text-primary-foreground')}>
          {message.body}
          {message.attachment && <Attachment sessionId={sessionId} attachment={message.attachment} />}
        </div>
        <p className={cn('mt-1 text-[11px] text-muted-foreground', !client && 'text-right')}>{formatWhen(message.createdAt)}</p>
      </div>
    </li>
  );
}

/** One request: the client's details, the whole shared chat, and the controls the moderator holding it has. */
export default function SupportSessionPage() {
  const { id = '' } = useParams();
  const detail = useSupportDetail(id);
  const me = useSupportMe();
  const join = useJoinSupportSession();
  const accept = useAccept();
  const reply = useReply();
  const setAi = useSetAi();
  const addNote = useAddNote();
  const setStatus = useSetStatus();
  const resolve = useResolve();
  const reopen = useReopen();
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmResolve, setConfirmResolve] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLLIElement>(null);

  const data = detail.data;
  const sessionLoaded = Boolean(data);
  // Joined once the page knows the request is readable: the server decides, and the messages then arrive live.
  useEffect(() => {
    if (sessionLoaded) void join(id);
  }, [id, join, sessionLoaded]);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' });
  }, [data?.messages.length]);

  const perms = new Set(me.data?.permissions ?? []);
  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(apiErrorMessage(failure, 'That did not work.'));
    }
  };

  if (detail.isLoading) return <Skeleton className="h-96 w-full" />;
  if (detail.isError || !data) return <ErrorState title="Couldn't open this request" description={apiErrorMessage(detail.error, 'The OrmiTech API refused the request.')} onRetry={() => detail.refetch()} />;

  const { session } = data;
  const status = STATUS_INFO[session.status];
  const finished = session.status === 'resolved' || session.status === 'closed';
  const mine = session.assignedToMe || Boolean(me.data?.isSuperAdmin);
  const canWrite = mine && !finished;
  const send = () =>
    run(async () => {
      if (!text.trim() && !file) return;
      await reply.mutateAsync({ id, body: text.trim(), file });
      setText('');
      setFile(null);
    });

  return (
    <div className="space-y-4">
      <Link to={ROUTES.fastSupport} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Support Desk
      </Link>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="flex min-h-[34rem] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">{session.subject}</h2>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={status.variant}>{status.label}</Badge>
                <span>{session.categoryLabel}</span>
                <span>{session.assignedModeratorName ? (session.assignedToMe ? 'You are handling this' : `Handled by ${session.assignedModeratorName}`) : 'Not taken yet'}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {perms.has('support.ai.toggle') && mine && !finished && (
                <label className="flex items-center gap-2 text-xs font-medium">
                  <Bot className="size-4 text-sky-600" aria-hidden />
                  AI {session.aiEnabled ? 'on' : 'off'}
                  <Switch checked={session.aiEnabled} disabled={setAi.isPending} aria-label="AI replies" onCheckedChange={(enabled) => run(() => setAi.mutateAsync({ id, enabled }))} />
                </label>
              )}
              {session.canAccept && (
                <Button size="sm" disabled={accept.isPending} onClick={() => run(() => accept.mutateAsync(id))}>
                  Accept this request
                </Button>
              )}
              {mine && !finished && perms.has('support.resolve') && (
                <Button variant="outline" size="sm" onClick={() => setConfirmResolve(true)}>
                  Resolve
                </Button>
              )}
              {finished && perms.has('support.reopen') && mine && session.status === 'resolved' && (
                <Button variant="outline" size="sm" disabled={reopen.isPending} onClick={() => run(() => reopen.mutateAsync(id))}>
                  Reopen
                </Button>
              )}
            </div>
          </div>

          <ul aria-label="Conversation" className="min-h-64 flex-1 space-y-4 overflow-y-auto p-4">
            {data.messages.map((message) => (
              <Bubble key={message.id} message={message} sessionId={id} />
            ))}
            <li ref={end} aria-hidden />
          </ul>

          {error && (
            <p role="alert" className="border-t border-border px-4 py-2 text-xs font-medium text-destructive">
              {error}
            </p>
          )}
          {canWrite && perms.has('support.reply') ? (
            <form
              className="border-t border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              {file && (
                <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs">
                  <Paperclip className="size-3.5" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <button type="button" aria-label="Remove the attachment" onClick={() => setFile(null)}>
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input ref={picker} type="file" className="sr-only" tabIndex={-1} onChange={(event) => { setFile(event.target.files?.[0] ?? null); event.target.value = ''; }} />
                <Button type="button" variant="outline" size="icon" aria-label="Attach a file" onClick={() => picker.current?.click()}>
                  <Paperclip className="size-4" aria-hidden />
                </Button>
                <Textarea aria-label="Your reply" rows={2} maxLength={5000} value={text} onChange={(event) => setText(event.target.value)} placeholder={session.aiEnabled ? 'Reply to the client (the AI is on)' : 'Reply to the client (the AI is off)'} className="min-h-10 flex-1" />
                <Button type="submit" disabled={reply.isPending || (!text.trim() && !file)}>
                  <Send className="size-4" aria-hidden /> Send
                </Button>
              </div>
            </form>
          ) : (
            <p className="border-t border-border p-3 text-center text-sm text-muted-foreground">
              {finished ? 'This request is resolved. The history stays here.' : session.canAccept ? 'Accept this request to reply.' : 'Only the moderator handling this request can reply.'}
            </p>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">The client</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-xs text-muted-foreground">Workspace</dt><dd className="font-medium">{session.organizationName}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Name</dt><dd className="font-medium">{session.clientName ?? '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Phone number</dt><dd className="font-medium">{session.phoneNumber}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Opened</dt><dd className="font-medium">{formatWhen(session.createdAt)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Description</dt><dd className="whitespace-pre-wrap break-words text-muted-foreground">{session.description}</dd></div>
            </dl>
            {mine && !finished && perms.has('support.manage_assigned') && (
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button variant="outline" size="sm" disabled={setStatus.isPending || session.status === 'waiting_for_customer'} onClick={() => run(() => setStatus.mutateAsync({ id, status: 'waiting_for_customer' }))}>
                  Waiting for customer
                </Button>
                <Button variant="outline" size="sm" disabled={setStatus.isPending || session.status === 'human_active'} onClick={() => run(() => setStatus.mutateAsync({ id, status: 'human_active' }))}>
                  Human active
                </Button>
              </div>
            )}
          </Card>

          <Card className="space-y-3 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <StickyNote className="size-4" aria-hidden /> Internal notes
            </h3>
            <p className="text-xs text-muted-foreground">Only moderators see these. Never the client, never the AI.</p>
            {data.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.notes.map((entry) => (
                  <li key={entry.id} className="rounded-md bg-amber-50 p-2.5 text-sm dark:bg-amber-950/30">
                    <p className="whitespace-pre-wrap break-words">{entry.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{entry.adminName ?? 'Moderator'} · {formatWhen(entry.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
            {mine && perms.has('support.notes.create') && (
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!note.trim()) return;
                  void run(async () => {
                    await addNote.mutateAsync({ id, body: note.trim() });
                    setNote('');
                  });
                }}
              >
                <Textarea aria-label="New internal note" rows={2} maxLength={4000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note for the team" />
                <Button type="submit" size="sm" variant="outline" disabled={addNote.isPending || !note.trim()}>
                  Add note
                </Button>
              </form>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold">History</h3>
            <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              {data.events.map((event) => (
                <li key={event.id}>
                  <span className="font-medium text-foreground">{event.eventType.replace(/_/g, ' ')}</span>
                  {event.toStatus ? ` → ${event.toStatus.replace(/_/g, ' ')}` : ''} · {formatWhen(event.createdAt)}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmResolve}
        onOpenChange={setConfirmResolve}
        title="Resolve this request"
        description="The client sees it as resolved and can no longer write in it. Every message, attachment and note stays, and you can reopen it."
        confirmLabel="Resolve"
        isPending={resolve.isPending}
        onConfirm={async () => {
          await run(() => resolve.mutateAsync(id));
          setConfirmResolve(false);
        }}
      />
    </div>
  );
}
