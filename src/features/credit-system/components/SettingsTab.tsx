import { useCallback } from 'react';
import { ModelVerificationCard } from './ModelVerificationCard';
import { FinancialCard } from './FinancialCard';
import { ModeCard } from './ModeCard';
import { PilotCard } from './PilotCard';

/** The credit system's settings in the order a decision is made: the money rules, whether the provider's cost can be trusted as USD, the mode, and who is in the pilot. */
export function SettingsTab({ canWrite, onDirtyChange }: { canWrite: boolean; onDirtyChange: (source: string, dirty: boolean) => void }) {
  // Stable functions: each card reports its unsaved state in an effect, and a new function every render would re-run it.
  const financial = useCallback((dirty: boolean) => onDirtyChange('financial', dirty), [onDirtyChange]);
  const mode = useCallback((dirty: boolean) => onDirtyChange('mode', dirty), [onDirtyChange]);
  const pilot = useCallback((dirty: boolean) => onDirtyChange('pilot', dirty), [onDirtyChange]);
  return (
    <div className="space-y-6">
      <FinancialCard canWrite={canWrite} onDirtyChange={financial} />
      <ModelVerificationCard canWrite={canWrite} />
      <ModeCard canWrite={canWrite} onDirtyChange={mode} />
      <PilotCard canWrite={canWrite} onDirtyChange={pilot} />
    </div>
  );
}
