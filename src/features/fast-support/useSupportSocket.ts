import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { env } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { KEYS } from './hooks';

/** What the moderators' socket tells the screens. Names are the API's (RealtimeEvent). */
export type SupportSocketEvent = { type: 'created' | 'assigned'; sessionId: string; subject?: string; category?: string; moderatorName?: string };

const EVENTS = ['support.session.created', 'support.session.assigned', 'support.session.status_changed', 'support.session.resolved', 'support.ai.status_changed', 'support.message.created', 'support.notification.created'] as const;

/**
 * The live connection for moderators. It never carries a message to someone who may not read it (the server decides who joins a
 * chat), and the screens treat every event as "something changed, ask again": the database answers, not the event.
 */
export function useSupportSocket(enabled: boolean, onEvent?: (event: SupportSocketEvent) => void) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);
  const callback = useRef(onEvent);
  callback.current = onEvent;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !token) return undefined;
    const socket = io(`${env.apiUrl.replace(/\/+$/, '')}/admin-support`, { path: '/socket.io', transports: ['websocket'], auth: { token }, reconnectionDelayMax: 10_000 });
    socketRef.current = socket;
    const refresh = () => void queryClient.invalidateQueries({ queryKey: KEYS.all });
    for (const event of EVENTS) socket.on(event, refresh);
    socket.on('support.session.created', (payload: { sessionId: string; subject?: string; category?: string }) => callback.current?.({ type: 'created', ...payload }));
    socket.on('support.session.assigned', (payload: { sessionId: string; moderatorName?: string }) => callback.current?.({ type: 'assigned', ...payload }));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, token, queryClient]);

  /** Joins one chat's message room. Resolves false when the server refuses (not yours to read). */
  const join = useCallback(async (sessionId: string): Promise<boolean> => {
    const socket = socketRef.current;
    if (!socket) return false;
    const answer = (await socket.timeout(5000).emitWithAck('join_session', { sessionId }).catch(() => ({ ok: false }))) as { ok: boolean };
    return answer.ok;
  }, []);
  return { join };
}
