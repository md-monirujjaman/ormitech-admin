import type { ReactNode } from 'react';

/**
 * A small, safe markdown preview for the editor. It builds React elements (never HTML strings), allows only
 * http(s), mailto and relative links, and only http(s) images. It covers what the docs use: headings, paragraphs,
 * bold, italic, inline code, links, images, bullet and numbered lists, quotes, rules and fenced code. The public
 * docs site is the final renderer, so small differences there are possible.
 */
const SAFE_LINK = /^(https?:\/\/|mailto:|\/|#)/i;
const SAFE_IMAGE = /^https?:\/\//i;

const INLINE = /(!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*)/g;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(INLINE)) {
    const at = match.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const key = `${keyPrefix}-${index++}`;
    if (match[3] !== undefined) {
      out.push(
        SAFE_IMAGE.test(match[3]) ? (
          <img key={key} src={match[3]} alt={match[2]} className="my-2 max-h-96 max-w-full rounded-md border border-border" />
        ) : (
          `[image: ${match[2]}]`
        ),
      );
    } else if (match[5] !== undefined) {
      out.push(
        SAFE_LINK.test(match[5]) ? (
          <a key={key} href={match[5]} target="_blank" rel="noreferrer noopener" className="text-primary underline underline-offset-2">
            {match[4]}
          </a>
        ) : (
          match[4]
        ),
      );
    } else if (match[6] !== undefined) {
      out.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {match[6]}
        </code>,
      );
    } else if (match[7] !== undefined) {
      out.push(<strong key={key}>{match[7]}</strong>);
    } else if (match[8] !== undefined) {
      out.push(<em key={key}>{match[8]}</em>);
    }
    last = at + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const HEADING_CLASS: Record<number, string> = {
  1: 'mt-6 text-2xl font-semibold',
  2: 'mt-6 text-xl font-semibold',
  3: 'mt-5 text-lg font-semibold',
  4: 'mt-4 text-base font-semibold',
};

export function MarkdownPreview({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const at = (n: number) => lines[n] ?? '';
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const startsBlock = (line: string) => /^(#{1,4}\s|```|>\s?|[-*]\s|\d+\.\s|---+\s*$)/.test(line);

  while (i < lines.length) {
    const line = at(i);
    if (line.trim() === '') {
      i++;
      continue;
    }

    if (line.startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !at(i).startsWith('```')) body.push(at(i++));
      i++;
      blocks.push(
        <pre key={key++} className="my-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
          <code>{body.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = (heading[1] ?? '#').length;
      const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
      blocks.push(
        <Tag key={key++} className={`${HEADING_CLASS[level]} mb-2 text-foreground`}>
          {inline(heading[2] ?? '', `h${key}`)}
        </Tag>,
      );
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="my-4 border-border" />);
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^>\s?/.test(at(i))) body.push(at(i++).replace(/^>\s?/, ''));
      blocks.push(
        <blockquote key={key++} className="my-3 border-l-4 border-border pl-3 text-muted-foreground">
          {inline(body.join(' '), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    const bullet = /^[-*]\s+/.test(line);
    if (bullet || /^\d+\.\s+/.test(line)) {
      const pattern = bullet ? /^[-*]\s+/ : /^\d+\.\s+/;
      const items: string[] = [];
      while (i < lines.length && pattern.test(at(i))) items.push(at(i++).replace(pattern, ''));
      const List = bullet ? 'ul' : 'ol';
      blocks.push(
        <List key={key++} className={`my-3 space-y-1 pl-6 ${bullet ? 'list-disc' : 'list-decimal'}`}>
          {items.map((item, n) => (
            <li key={n}>{inline(item, `l${key}-${n}`)}</li>
          ))}
        </List>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && at(i).trim() !== '' && (paragraph.length === 0 || !startsBlock(at(i)))) paragraph.push(at(i++));
    blocks.push(
      <p key={key++} className="my-3 leading-relaxed">
        {inline(paragraph.join(' '), `p${key}`)}
      </p>,
    );
  }

  if (blocks.length === 0) return <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>;
  return <div className="text-sm text-foreground">{blocks}</div>;
}
