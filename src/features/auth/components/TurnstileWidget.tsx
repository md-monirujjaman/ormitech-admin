import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { env } from '@/lib/constants';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface TurnstileHandle {
  reset: () => void;
}

/** True once a site key is configured. Without one the widget shows a configuration error and sign-in stays disabled. */
const turnstileEnabled = Boolean(env.turnstileSiteKey);

let scriptPromise: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing')));
    script.onerror = () => {
      scriptPromise = undefined;
      script.remove();
      reject(new Error('Turnstile failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
}

/**
 * Cloudflare Turnstile ("Verifying…" → "Success!"). Calls `onToken` with the token once the check passes, and
 * with "" when it expires or fails. A token works once, so call `reset()` after a sign-in attempt.
 * The API verifies the token; this widget alone proves nothing. Without a site key it shows an error instead,
 * and since no token ever arrives, the Sign in button stays disabled.
 */
export const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(function TurnstileWidget(
  { onToken },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        onTokenRef.current('');
        if (widgetIdRef.current !== null) window.turnstile?.reset(widgetIdRef.current);
      },
    }),
    [],
  );

  useEffect(() => {
    if (!turnstileEnabled) return undefined;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: env.turnstileSiteKey,
          size: 'flexible',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => onTokenRef.current(''),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null) window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, []);

  if (!turnstileEnabled) {
    return (
      <p role="alert" className="text-xs text-destructive">
        Sign-in verification is not configured. Please contact support.
      </p>
    );
  }

  return (
    <div>
      <div ref={containerRef} />
      {failed && (
        <p role="alert" className="text-xs text-destructive">
          The human check could not load. Check your connection and refresh the page.
        </p>
      )}
    </div>
  );
});
