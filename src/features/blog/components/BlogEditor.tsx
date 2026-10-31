import Image from '@tiptap/extension-image';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Code,
  Code2,
  Heading2,
  Heading3,
  Heading4,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import type { BlogDoc } from '../types';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Only these may be a link: the same schemes the website and the API accept. Anything else (javascript:, data:) is refused. */
const SAFE_LINK = /^(https?:\/\/|mailto:|\/|#)/i;

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('size-8', active && 'bg-primary/15 text-primary hover:bg-primary/20')}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      // Keeps the text selection, so a button acts on what is selected.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-border" aria-hidden />;

function Toolbar({ editor, canWrite, uploading, onPickImage, onLink }: { editor: Editor; canWrite: boolean; uploading: boolean; onPickImage: () => void; onLink: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      strike: current.isActive('strike'),
      h2: current.isActive('heading', { level: 2 }),
      h3: current.isActive('heading', { level: 3 }),
      h4: current.isActive('heading', { level: 4 }),
      bullet: current.isActive('bulletList'),
      ordered: current.isActive('orderedList'),
      quote: current.isActive('blockquote'),
      code: current.isActive('code'),
      codeBlock: current.isActive('codeBlock'),
      link: current.isActive('link'),
      table: current.isActive('table'),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });
  const run = () => editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 p-1.5">
      <ToolButton label="Undo" disabled={!canWrite || !state.canUndo} onClick={() => run().undo().run()}>
        <Undo2 className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton label="Redo" disabled={!canWrite || !state.canRedo} onClick={() => run().redo().run()}>
        <Redo2 className="size-4" aria-hidden />
      </ToolButton>
      <Divider />
      <ToolButton label="Heading 2" active={state.h2} disabled={!canWrite} onClick={() => run().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton label="Heading 3" active={state.h3} disabled={!canWrite} onClick={() => run().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton label="Heading 4" active={state.h4} disabled={!canWrite} onClick={() => run().toggleHeading({ level: 4 }).run()}>
        <Heading4 className="size-4" aria-hidden />
      </ToolButton>
      <Divider />
      <ToolButton label="Bold" active={state.bold} disabled={!canWrite} onClick={() => run().toggleBold().run()}>
        <Bold className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton label="Italic" active={state.italic} disabled={!canWrite} onClick={() => run().toggleItalic().run()}>
        <Italic className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton label="Underline" active={state.underline} disabled={!canWrite} onClick={() => run().toggleUnderline().run()}>
        <UnderlineIcon className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton label="Strikethrough" active={state.strike} disabled={!canWrite} onClick={() => run().toggleStrike().run()}>
        <Strikethrough className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton label="Inline code" active={state.code} disabled={!canWrite} onClick={() => run().toggleCode().run()}>
        <Code className="size-4" aria-hidden />
      </ToolButton>
      <Divider />
      <ToolButton label="Bullet list" active={state.bullet} disabled={!canWrite} onClick={() => run().toggleBulletList().run()}>
        <List className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton label="Numbered list" active={state.ordered} disabled={!canWrite} onClick={() => run().toggleOrderedList().run()}>
        <ListOrdered className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton label="Quote" active={state.quote} disabled={!canWrite} onClick={() => run().toggleBlockquote().run()}>
        <Quote className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton label="Code block" active={state.codeBlock} disabled={!canWrite} onClick={() => run().toggleCodeBlock().run()}>
        <Code2 className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton label="Divider" disabled={!canWrite} onClick={() => run().setHorizontalRule().run()}>
        <Minus className="size-4" aria-hidden />
      </ToolButton>
      <Divider />
      <ToolButton label="Link" active={state.link} disabled={!canWrite} onClick={onLink}>
        <Link2 className="size-4" aria-hidden />
      </ToolButton>
      {state.link && (
        <ToolButton label="Remove link" disabled={!canWrite} onClick={() => run().extendMarkRange('link').unsetLink().run()}>
          <Unlink className="size-4" aria-hidden />
        </ToolButton>
      )}
      <ToolButton label="Insert table" disabled={!canWrite || state.table} onClick={() => run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <Table2 className="size-4" aria-hidden />
      </ToolButton>
      <Button type="button" variant="outline" size="sm" className="ml-1" disabled={!canWrite || uploading} onMouseDown={(event) => event.preventDefault()} onClick={onPickImage}>
        <ImagePlus className="size-4" aria-hidden />
        {uploading ? 'Uploading…' : 'Add picture'}
      </Button>
    </div>
  );
}

/** Shown while the cursor is in a table: add and remove rows and columns. */
function TableBar({ editor, canWrite }: { editor: Editor; canWrite: boolean }) {
  const inTable = useEditorState({ editor, selector: ({ editor: current }) => current.isActive('table') });
  if (!inTable || !canWrite) return null;
  const run = () => editor.chain().focus();
  const items: Array<[string, () => void]> = [
    ['Row above', () => run().addRowBefore().run()],
    ['Row below', () => run().addRowAfter().run()],
    ['Delete row', () => run().deleteRow().run()],
    ['Column left', () => run().addColumnBefore().run()],
    ['Column right', () => run().addColumnAfter().run()],
    ['Delete column', () => run().deleteColumn().run()],
    ['Header row', () => run().toggleHeaderRow().run()],
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/20 px-2 py-1.5 text-xs">
      <span className="mr-1 font-medium text-muted-foreground">Table</span>
      {items.map(([label, action]) => (
        <Button key={label} type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onMouseDown={(event) => event.preventDefault()} onClick={action}>
          {label}
        </Button>
      ))}
      <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs text-destructive" onMouseDown={(event) => event.preventDefault()} onClick={() => run().deleteTable().run()}>
        <Trash2 className="size-3.5" aria-hidden />
        Delete table
      </Button>
    </div>
  );
}

/** Shown while a picture is selected: its alt text, which search engines and screen readers rely on. */
function ImageBar({ editor, canWrite }: { editor: Editor; canWrite: boolean }) {
  const image = useEditorState({
    editor,
    selector: ({ editor: current }) => (current.isActive('image') ? { alt: String(current.getAttributes('image').alt ?? '') } : null),
  });
  if (!image || !canWrite) return null;
  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-2 py-1.5">
      <label htmlFor="blog-image-alt" className="shrink-0 text-xs font-medium text-muted-foreground">
        Picture description (alt text)
      </label>
      <Input id="blog-image-alt" className="h-8" value={image.alt} placeholder="Describe what the picture shows" maxLength={300} onChange={(event) => editor.chain().updateAttributes('image', { alt: event.target.value }).run()} />
    </div>
  );
}

/**
 * The visual article editor (TipTap). The article is read and written as the editor's own JSON document, which the
 * API checks against an allow-list and the website renders with its own components: no HTML is stored.
 *
 * It is mounted fresh each time an article is opened (keyed by the article id), so `value` is only the starting
 * document; after that the editor owns the content and reports every change through `onChange`.
 */
export function BlogEditor({
  value,
  onChange,
  canWrite,
  onUploadImage,
}: {
  value: BlogDoc;
  onChange: (doc: BlogDoc) => void;
  canWrite: boolean;
  /** Stores a picture and returns the address to show it from. */
  onUploadImage: (file: File) => Promise<string>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  // `useEditor` captures the first handlers it is given; they are read through refs so later ones still count.
  const upload = useRef(onUploadImage);
  upload.current = onUploadImage;
  const report = useRef(onChange);
  report.current = onChange;
  const editorRef = useRef<Editor | null>(null);

  const insertImage = async (file: File) => {
    setError(null);
    if (!IMAGE_TYPES.includes(file.type)) return setError('Choose a JPEG, PNG, WebP or GIF image.');
    if (file.size > MAX_IMAGE_BYTES) return setError('Images can be up to 5 MB.');
    setUploading(true);
    try {
      const src = await upload.current(file);
      editorRef.current?.chain().focus().setImage({ src, alt: '' }).run();
    } catch (failure) {
      setError(apiErrorMessage(failure, 'The image could not be uploaded.'));
    } finally {
      setUploading(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noreferrer noopener', target: '_blank' }, isAllowedUri: (url) => SAFE_LINK.test(url) },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
      Placeholder.configure({ placeholder: 'Write the article here. Use the toolbar for headings, lists, tables, links and pictures.' }),
    ],
    content: value,
    editable: canWrite,
    editorProps: {
      attributes: { class: 'rte min-h-[32rem] px-5 py-4 focus:outline-none', 'aria-label': 'Article content' },
      handlePaste: (_view, event) => {
        const file = Array.from(event.clipboardData?.files ?? []).find((candidate) => candidate.type.startsWith('image/'));
        if (!file || !canWrite) return false;
        event.preventDefault();
        void insertImage(file);
        return true;
      },
      handleDrop: (_view, event) => {
        const file = Array.from((event as DragEvent).dataTransfer?.files ?? []).find((candidate) => candidate.type.startsWith('image/'));
        if (!file || !canWrite) return false;
        event.preventDefault();
        void insertImage(file);
        return true;
      },
    },
    onUpdate: ({ editor: current }) => report.current(current.getJSON() as BlogDoc),
  });
  editorRef.current = editor;

  const openLink = () => {
    if (!editor) return;
    setLinkValue((editor.getAttributes('link').href as string | undefined) ?? '');
    setLinkOpen(true);
  };
  const applyLink = () => {
    if (!editor) return;
    const address = linkValue.trim();
    if (address === '') editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else if (SAFE_LINK.test(address)) editor.chain().focus().extendMarkRange('link').setLink({ href: address }).run();
    else return setError('A link must start with https://, mailto:, / or #');
    setError(null);
    setLinkOpen(false);
  };

  if (!editor) return <div className="min-h-[32rem] rounded-lg border border-border" />;

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-background">
      <Toolbar editor={editor} canWrite={canWrite} uploading={uploading} onPickImage={() => fileInput.current?.click()} onLink={openLink} />
      <TableBar editor={editor} canWrite={canWrite} />
      <ImageBar editor={editor} canWrite={canWrite} />
      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/20 p-2">
          <Input
            autoFocus
            value={linkValue}
            placeholder="https://example.com or /pricing  (empty removes the link)"
            aria-label="Link address"
            onChange={(event) => setLinkValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyLink();
              } else if (event.key === 'Escape') setLinkOpen(false);
            }}
          />
          <Button type="button" size="sm" onClick={applyLink}>
            Apply
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setLinkOpen(false)}>
            Cancel
          </Button>
        </div>
      )}
      <EditorContent editor={editor} />
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void insertImage(file);
        }}
      />
      {error && <p className="border-t border-border bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
        <span>{editor.storage.characterCount.words()} words</span>
        <span>About {Math.max(1, Math.ceil(editor.storage.characterCount.words() / 200))} min read</span>
      </div>
    </div>
  );
}
