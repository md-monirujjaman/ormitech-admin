import { Fragment, type ReactNode } from 'react';
import { headingsOf } from '../seo';
import type { BlogDoc, BlogNode } from '../types';

const SAFE_LINK = /^(https?:\/\/|mailto:|\/|#)/i;
const SAFE_IMAGE = /^(https?:\/\/|\/)/i;

function marked(node: BlogNode, key: string): ReactNode {
  let out: ReactNode = node.text;
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') out = <strong className="font-semibold text-foreground">{out}</strong>;
    else if (mark.type === 'italic') out = <em>{out}</em>;
    else if (mark.type === 'underline') out = <u>{out}</u>;
    else if (mark.type === 'strike') out = <s>{out}</s>;
    else if (mark.type === 'code') out = <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{out}</code>;
    else if (mark.type === 'link') {
      const href = String(mark.attrs?.href ?? '');
      out = SAFE_LINK.test(href) ? (
        <a href={href} className="font-medium text-primary underline underline-offset-4" target="_blank" rel="noreferrer noopener">
          {out}
        </a>
      ) : (
        out
      );
    }
  }
  return <Fragment key={key}>{out}</Fragment>;
}

/**
 * Draws an article body from its editor document, with the look the website gives it. Built from React elements,
 * never HTML strings, and only known node types: this is the same safety rule the API applies when saving.
 */
export function DocView({ doc }: { doc: BlogDoc }) {
  const headings = headingsOf(doc);
  let seen = 0;

  const children = (node: BlogNode, key: string): ReactNode[] => (node.content ?? []).map((child, index) => render(child, `${key}.${index}`));

  function render(node: BlogNode, key: string): ReactNode {
    switch (node.type) {
      case 'text':
        return marked(node, key);
      case 'hardBreak':
        return <br key={key} />;
      case 'paragraph':
        return (
          <p key={key} className="mt-4 min-h-[1em]">
            {children(node, key)}
          </p>
        );
      case 'heading': {
        const level = Number(node.attrs?.level ?? 2);
        const hasText = (node.content ?? []).some((child) => child.text?.trim());
        const id = level <= 3 && hasText ? headings[seen++]?.id : undefined;
        if (level === 2) return <h2 key={key} id={id} className="mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight text-foreground">{children(node, key)}</h2>;
        if (level === 3) return <h3 key={key} id={id} className="mt-8 scroll-mt-24 text-xl font-semibold tracking-tight text-foreground">{children(node, key)}</h3>;
        return <h4 key={key} className="mt-6 text-lg font-semibold text-foreground">{children(node, key)}</h4>;
      }
      case 'bulletList':
        return <ul key={key} className="mt-4 list-disc space-y-2 pl-6 marker:text-primary">{children(node, key)}</ul>;
      case 'orderedList':
        return <ol key={key} start={Number(node.attrs?.start ?? 1)} className="mt-4 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-primary">{children(node, key)}</ol>;
      case 'listItem':
        return <li key={key} className="[&>p]:mt-0">{children(node, key)}</li>;
      case 'blockquote':
        return <blockquote key={key} className="mt-6 border-l-4 border-primary/40 pl-4 italic text-muted-foreground">{children(node, key)}</blockquote>;
      case 'codeBlock':
        return <pre key={key} className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm"><code>{(node.content ?? []).map((child) => child.text).join('')}</code></pre>;
      case 'horizontalRule':
        return <hr key={key} className="my-8 border-border" />;
      case 'image': {
        const src = String(node.attrs?.src ?? '');
        if (!SAFE_IMAGE.test(src)) return null;
        return (
          <figure key={key} className="my-8">
            <img src={src} alt={String(node.attrs?.alt ?? '')} className="h-auto w-full rounded-xl border border-border" loading="lazy" />
          </figure>
        );
      }
      case 'table':
        return (
          <div key={key} className="my-6 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[340px] border-collapse text-left text-sm">
              <tbody className="divide-y divide-border">{children(node, key)}</tbody>
            </table>
          </div>
        );
      case 'tableRow':
        return <tr key={key}>{children(node, key)}</tr>;
      case 'tableHeader':
        return <th key={key} scope="col" className="bg-muted/50 px-3 py-2.5 font-semibold text-foreground">{children(node, key)}</th>;
      case 'tableCell':
        return <td key={key} className="px-3 py-2.5 [&>p]:mt-0">{children(node, key)}</td>;
      default:
        return null;
    }
  }

  return <>{(doc.content ?? []).map((node, index) => render(node, String(index)))}</>;
}
