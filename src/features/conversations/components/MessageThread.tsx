import { Bot, Info, User, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminMessage } from '@/types/crm';

const SENDER = {
  customer: { icon: User, label: 'Customer', side: 'left' as const },
  agent: { icon: UserCog, label: 'Agent', side: 'right' as const },
  ai: { icon: Bot, label: 'AI', side: 'right' as const },
  system: { icon: Info, label: 'System', side: 'center' as const },
};

const formatTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/**
 * A conversation, read.
 *
 * The customer is on the left and whoever answered is on the right, which is the arrangement every messaging
 * client uses and therefore the one that needs no explaining. A system message sits in the middle because it
 * is nobody's turn — it is the product narrating a handover or a status change.
 *
 * There is no composer, and that is the design: the panel cannot send a message as a customer or as one of
 * the organization's agents, and the API has no endpoint that would let it. A text box here would be an
 * invitation to a capability that does not exist.
 *
 * `messageType` is shown for anything that is not text. The attachment itself is deliberately not reachable
 * from the panel — the endpoint does not return one — so a photo appears as "image", not as a link into the
 * customer's files.
 */
export function MessageThread({ messages }: { messages: AdminMessage[] }) {
  return (
    <ol className="space-y-3">
      {messages.map((message) => {
        const sender = SENDER[message.senderType as keyof typeof SENDER] ?? SENDER.system;
        const Icon = sender.icon;
        const isSystem = sender.side === 'center';

        return (
          <li
            key={message.id}
            className={cn(
              'flex',
              sender.side === 'right' && 'justify-end',
              sender.side === 'left' && 'justify-start',
              isSystem && 'justify-center',
            )}
          >
            <div className={cn('max-w-[min(32rem,85%)] min-w-0', isSystem && 'max-w-md')}>
              <div
                className={cn(
                  'flex items-center gap-1.5 text-xs text-muted-foreground',
                  sender.side === 'right' && 'justify-end',
                  isSystem && 'justify-center',
                )}
              >
                <Icon className="size-3" aria-hidden />
                <span className="truncate font-medium">{message.senderName ?? sender.label}</span>
                <span aria-hidden>·</span>
                <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
              </div>

              <div
                className={cn(
                  'mt-1 rounded-lg px-3 py-2 text-sm',
                  sender.side === 'left' && 'bg-muted text-foreground',
                  sender.side === 'right' && 'bg-primary text-primary-foreground',
                  isSystem && 'bg-transparent text-center text-xs italic text-muted-foreground',
                )}
              >
                {message.content ? (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                ) : (
                  <p className="italic opacity-80">No text content</p>
                )}

                {message.messageType !== 'text' && message.messageType !== 'system' && (
                  <p
                    className={cn(
                      'mt-1 text-xs',
                      sender.side === 'right' ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {message.messageType} · not viewable from the panel
                  </p>
                )}
              </div>

              {sender.side === 'right' && (
                <p className="mt-0.5 text-right text-[11px] text-muted-foreground">{message.status}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
