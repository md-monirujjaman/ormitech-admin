import { CheckCircle2, Clock, Info, Megaphone, TriangleAlert, X } from 'lucide-react';
import { formatWhen, timeLeft } from '../schedule';
import type { AnnouncementButton, AnnouncementTone } from '../types';

const BRAND = '#E10032';

const TONES: Record<AnnouncementTone, { bg: string; border: string; text: string; icon: typeof Info }> = {
  info: { bg: '#f0f9ff', border: '#bae6fd', text: '#0c4a6e', icon: Megaphone },
  success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#064e3b', icon: CheckCircle2 },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#78350f', icon: TriangleAlert },
};

/**
 * The banner as it appears under the greeting on the client dashboard: the message, an optional button, and when it
 * ends with the time left. It stays light in the dark admin theme on purpose: the dashboard is light.
 */
export function BannerPreview({ title, body, tone, button, endsAt }: { title: string; body: string; tone: AnnouncementTone; button?: AnnouncementButton; endsAt: string | null }) {
  const style = TONES[tone];
  const Icon = style.icon;
  const left = endsAt ? timeLeft(endsAt) : '';

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3" style={{ backgroundColor: style.bg, borderColor: style.border, color: style.text }}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/70">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title || 'Headline'}</p>
        {body && <p className="mt-0.5 text-[13px] opacity-90">{body}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {endsAt && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium" title={`Until ${formatWhen(endsAt)}`}>
            <Clock className="size-3.5" aria-hidden />
            {left ? `Ends in ${left}` : 'Ended'}
          </span>
        )}
        {button && (
          <span className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: BRAND }}>
            {button.label || 'Button'}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The pop-up as a visitor sees it: the picture, a close (x) at its corner, and up to two buttons below it. Clicking
 * the dimmed area around it closes it too.
 */
export function PopupPreview({ imageUrl, title, buttons }: { imageUrl: string | null; title: string; buttons: AnnouncementButton[] }) {
  const shown = buttons.filter((button) => button.label.trim());
  return (
    <div className="flex items-center justify-center rounded-xl bg-black/60 p-5">
      <div className="relative w-full max-w-xs">
        <span className="absolute -right-2 -top-2 z-10 flex size-7 items-center justify-center rounded-full bg-white text-neutral-700 shadow-md" aria-hidden>
          <X className="size-4" />
        </span>
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="max-h-64 w-full object-cover" />
          ) : (
            <div className="flex h-40 items-center justify-center bg-neutral-100 text-xs text-neutral-500">Upload a picture</div>
          )}
          {shown.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3">
              {shown.map((button, index) => (
                <span
                  key={`${button.label}-${index}`}
                  className="flex-1 rounded-lg px-3 py-2 text-center text-xs font-semibold"
                  style={index === 0 ? { backgroundColor: BRAND, color: '#fff' } : { border: '1px solid #d4d4d4', color: '#262626' }}
                >
                  {button.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
