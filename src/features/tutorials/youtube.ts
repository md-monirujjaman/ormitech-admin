const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be']);

/** The video id in a pasted YouTube link (watch, youtu.be, embed, shorts, live) or a bare 11-character id; null when it is neither. The API checks again. */
export function youtubeIdFrom(input: string): string | null {
  const text = input.trim();
  if (VIDEO_ID.test(text)) return text;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!HOSTS.has(host)) return null;
  let candidate: string | null | undefined;
  if (host === 'youtu.be') candidate = url.pathname.split('/')[1];
  else if (url.pathname === '/watch') candidate = url.searchParams.get('v');
  else {
    const [, kind, id] = url.pathname.split('/');
    if (kind === 'embed' || kind === 'shorts' || kind === 'live' || kind === 'v') candidate = id;
  }
  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

export const thumbnailUrl = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
