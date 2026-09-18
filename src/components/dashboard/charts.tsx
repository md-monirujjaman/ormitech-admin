import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { API_USAGE, AI_USAGE, MESSAGES_VOLUME, ORGANIZATIONS_GROWTH, SUBSCRIPTION_DISTRIBUTION } from '@/lib/mockDashboardData';

/**
 * Recharts accepts raw CSS custom properties as SVG color values, so these read the same `--primary` /
 * `--border` / `--muted-foreground` tokens `index.css` defines — every chart re-colors itself for dark mode
 * automatically, with no separate dark palette to keep in sync.
 */
const axisTick = { fill: 'var(--muted-foreground)', fontSize: 12 };
const tooltipStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--popover-foreground)',
};

const PIE_COLORS = ['var(--primary)', '#0ea5e9', '#71717a', '#d4d4d8'];

export function OrganizationsGrowthChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={ORGANIZATIONS_GROWTH} margin={{ left: -16, right: 8 }}>
        <defs>
          <linearGradient id="organizationsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="organizations" stroke="var(--primary)" strokeWidth={2} fill="url(#organizationsFill)" name="Organizations" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MessagesVolumeChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={MESSAGES_VOLUME} margin={{ left: -16, right: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--accent)' }} />
        <Bar dataKey="messages" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Messages" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AiUsageChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={AI_USAGE} margin={{ left: -16, right: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="conversations" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} name="AI conversations" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SubscriptionDistributionChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }} />
        <Pie data={SUBSCRIPTION_DISTRIBUTION} dataKey="value" nameKey="plan" innerRadius={48} outerRadius={78} paddingAngle={2}>
          {SUBSCRIPTION_DISTRIBUTION.map((entry, index) => (
            <Cell key={entry.plan} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="var(--card)" strokeWidth={2} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ApiUsageChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={API_USAGE} margin={{ left: -16, right: 8 }}>
        <defs>
          <linearGradient id="apiUsageFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="hour" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="requests" stroke="var(--primary)" strokeWidth={2} fill="url(#apiUsageFill)" name="API requests" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
