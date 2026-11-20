import { Badge } from '@/components/ui/badge';
import { GATEWAY_LABEL, formatWhen } from '../format';
import type { AiModel, GatewayHealth } from '../types';

const VARIANT = { unchecked: 'outline', healthy: 'success', unhealthy: 'warning', unauthorized: 'destructive', no_key: 'destructive' } as const;

export function GatewayBadge({ status }: { status: GatewayHealth | 'unchecked' }) {
  return <Badge variant={VARIANT[status]}>{GATEWAY_LABEL[status]}</Badge>;
}

export function VerifiedBadge({ model }: { model: Pick<AiModel, 'availabilityVerifiedAt'> }) {
  return model.availabilityVerifiedAt ? (
    <Badge variant="success" title={`Confirmed with OpenRouter ${formatWhen(model.availabilityVerifiedAt)}`}>
      Verified
    </Badge>
  ) : (
    <Badge variant="outline">Not verified</Badge>
  );
}
