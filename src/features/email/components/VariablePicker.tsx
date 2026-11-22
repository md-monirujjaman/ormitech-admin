import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TemplateVariable } from '../types';
import { placeholder } from '../lib/variables';

/** The variables this template declares, as buttons that put `{{name}}` where the cursor is. Anything else is refused by the API. */
export function VariablePicker({ variables, onInsert, disabled }: { variables: TemplateVariable[]; onInsert: (name: string) => void; disabled?: boolean }) {
  if (variables.length === 0) return <p className="text-xs text-muted-foreground">This template has no variables.</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Click to insert at the cursor. Only these variables can be used.</p>
      <ul className="flex flex-wrap gap-2">
        {variables.map((variable) => (
          <li key={variable.name}>
            <Button type="button" size="sm" variant="outline" disabled={disabled} title={variable.description} aria-label={`Insert ${placeholder(variable.name)}`} onClick={() => onInsert(variable.name)}>
              <code className="text-xs">{placeholder(variable.name)}</code>
              <Badge variant="secondary">{variable.kind}</Badge>
              {variable.required ? null : <span className="text-[10px] text-muted-foreground">optional</span>}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
