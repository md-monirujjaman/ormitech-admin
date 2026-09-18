import type { LucideIcon } from 'lucide-react';
import type { Permission } from './auth';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hidden from the sidebar (not just disabled) when the admin lacks this permission. */
  permission?: Permission;
  badge?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}
