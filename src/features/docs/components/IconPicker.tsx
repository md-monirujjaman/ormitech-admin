import { DOC_ICONS } from '@/features/docs/docIconMap';
import { cn } from '@/lib/utils';

/** A grid of the icons a section or page may use. Clicking the chosen one again clears it. */
export function IconPicker({ value, onChange, label = 'Icon' }: { value: string | null; onChange: (value: string | null) => void; label?: string }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-9 gap-1.5 rounded-lg border border-border p-2">
      {Object.entries(DOC_ICONS).map(([name, Icon]) => (
        <button
          key={name}
          type="button"
          title={name}
          aria-label={name}
          aria-pressed={value === name}
          onClick={() => onChange(value === name ? null : name)}
          className={cn(
            'flex size-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            value === name && 'border-primary bg-primary/10 text-primary',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
