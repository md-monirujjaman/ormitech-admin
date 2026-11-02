import { Badge } from '@/components/ui/badge';
import { HEALTH_LABEL, formatWhen } from '../format';
import type { AiModel, AiProvider } from '../types';

const VARIANT = { unknown: 'outline', healthy: 'success', unhealthy: 'warning', unauthorized: 'destructive' } as const;

export function HealthBadge({ health }: { health: AiProvider['health'] }) {
  return (
    <Badge variant={VARIANT[health.status]} title={health.checkedAt ? `Checked ${formatWhen(health.checkedAt)}` : 'Never checked'}>
      {HEALTH_LABEL[health.status]}
    </Badge>
  );
}

export function VerifiedBadge({ model }: { model: Pick<AiModel, 'availabilityVerifiedAt'> }) {
  return model.availabilityVerifiedAt ? (
    <Badge variant="success" title={`Confirmed by the provider ${formatWhen(model.availabilityVerifiedAt)}`}>
      Verified
    </Badge>
  ) : (
    <Badge variant="outline">Not verified</Badge>
  );
}
