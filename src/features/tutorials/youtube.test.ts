import { describe, expect, it } from 'vitest';
import { thumbnailUrl, youtubeIdFrom } from './youtube';

const ID = 'dQw4w9WgXcQ';

describe('youtubeIdFrom', () => {
  it.each([`https://www.youtube.com/watch?v=${ID}&t=9s`, `https://youtu.be/${ID}?si=x`, `https://www.youtube.com/embed/${ID}`, `https://www.youtube.com/shorts/${ID}`, `youtube.com/watch?v=${ID}`, ` ${ID} `])('reads the id from %s', (input) => {
    expect(youtubeIdFrom(input)).toBe(ID);
  });

  it.each(['', 'https://vimeo.com/12345678901', 'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/playlist?list=PL1234567890A', 'javascript:alert(1)'])('refuses %s', (input) => {
    expect(youtubeIdFrom(input)).toBeNull();
  });

  it('builds the thumbnail address from the id only', () => {
    expect(thumbnailUrl(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
  });
});
