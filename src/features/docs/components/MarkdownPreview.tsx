import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** The page content as the docs site will show it: GitHub-flavoured markdown. Raw HTML in the text is not rendered. */
export function MarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) return <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>;
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_img]:max-w-full [&_img]:rounded-lg [&_li]:ml-5 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
