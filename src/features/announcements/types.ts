export type AnnouncementKind = 'banner' | 'popup';
export type AnnouncementTone = 'info' | 'success' | 'warning';
export type AnnouncementSurface = 'dashboard' | 'website';
/** off: switched off. scheduled: not started. live: showing now. ended: past its end. */
export type AnnouncementPhase = 'off' | 'scheduled' | 'live' | 'ended';

export interface AnnouncementButton {
  label: string;
  href: string;
}

export interface Announcement {
  id: string;
  kind: AnnouncementKind;
  title: string;
  body: string;
  imageUrl: string | null;
  buttons: AnnouncementButton[];
  tone: AnnouncementTone;
  targets: AnnouncementSurface[];
  enabled: boolean;
  startsAt: string;
  endsAt: string;
  phase: AnnouncementPhase;
  createdAt: string;
  version: string;
}

export interface AnnouncementInput {
  kind: AnnouncementKind;
  title: string;
  body: string;
  imageUrl: string | null;
  buttons: AnnouncementButton[];
  tone: AnnouncementTone;
  targets: AnnouncementSurface[];
  enabled: boolean;
  startsAt: string;
  endsAt: string;
}
