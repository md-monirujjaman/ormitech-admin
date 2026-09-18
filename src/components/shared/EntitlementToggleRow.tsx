import { RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ResolvedToggle } from '@/types/entitlements';

/**
 * One feature or channel entitlement. Shows what the plan grants, whether this organization overrides it, and
 * lets the admin drop back to the plan default — so an override is always visible as a deliberate exception
 * rather than silently baked in.
 */
export function EntitlementToggleRow({
  name,
  description,
  resolved,
  onToggle,
  onReset,
  disabled = false,
  meta,
}: {
  name: string;
  description: string;
  resolved: ResolvedToggle;
  onToggle: (enabled: boolean) => void;
  onReset?: () => void;
  disabled?: boolean;
  meta?: React.ReactNode;
}) {
  const overridden = resolved.source === 'override';

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{name}</p>
          {overridden && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-primary">
                  Overridden
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Plan default: {resolved.planValue ? 'Enabled' : 'Disabled'}</TooltipContent>
            </Tooltip>
          )}
          {meta}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {overridden && onReset && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onReset} disabled={disabled} aria-label={`Reset ${name} to plan default`}>
                <RotateCcw className="size-3.5" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset to plan default</TooltipContent>
          </Tooltip>
        )}
        <Switch checked={resolved.enabled} onCheckedChange={onToggle} disabled={disabled} aria-label={name} />
      </div>
    </div>
  );
}
