import { ImagePlus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiErrorMessage } from '@/lib/apiError';
import { useUploadDocImage } from '../hooks';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;
const isAddress = (value: string) => /^https?:\/\//i.test(value);

/**
 * The icon of a section or page: a picture uploaded here, or the address of one. No fixed list. (An older icon that
 * was picked from the former list shows by its name until it is replaced or removed.)
 */
export function IconField({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) {
  const upload = useUploadDocImage();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState('');

  const send = async (file: File) => {
    setError(null);
    if (!IMAGE_TYPES.includes(file.type)) return setError('Choose a JPEG, PNG, WebP or GIF image.');
    if (file.size > MAX_BYTES) return setError('Images can be up to 5 MB.');
    try {
      onChange((await upload.mutateAsync(file)).url);
    } catch (failure) {
      setError(apiErrorMessage(failure, 'The image could not be uploaded.'));
    }
  };

  const applyLink = () => {
    const address = link.trim();
    if (!isAddress(address)) return setError('Paste a link that starts with https://');
    setError(null);
    onChange(address);
    setLink('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 text-[10px] text-muted-foreground">
          {value && isAddress(value) ? <img src={value} alt="" className="size-full object-contain" /> : value ? value.slice(0, 6) : 'None'}
        </span>
        <Button type="button" variant="outline" size="sm" disabled={upload.isPending} onClick={() => input.current?.click()}>
          <ImagePlus className="size-4" aria-hidden />
          {upload.isPending ? 'Uploading…' : value ? 'Change icon' : 'Upload icon'}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X className="size-4" aria-hidden />
            Remove
          </Button>
        )}
        <input
          ref={input}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void send(file);
          }}
        />
      </div>
      <div className="flex gap-2">
        <Input
          value={link}
          placeholder="…or paste a picture link (https://)"
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyLink();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={!link.trim()} onClick={applyLink}>
          Use link
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
