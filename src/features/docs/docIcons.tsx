import { FileText } from 'lucide-react';
import { DOC_ICONS } from '@/features/docs/docIconMap';

export function DocIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = name ? DOC_ICONS[name] : undefined;
  return Icon ? <Icon className={className} aria-hidden /> : <FileText className={className} aria-hidden />;
}
