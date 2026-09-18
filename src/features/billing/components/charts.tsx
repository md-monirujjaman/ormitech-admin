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
import type { PaymentStatusPoint, PlanDistributionPoint, RevenuePoint, SubscriptionGrowthPoint } from '@/types/billing';

/**
 * Billing charts. Unlike the Phase 1 dashboard charts, these take their data as props — it comes from the
 * billing API (mock today), so the same components work unchanged once real figures arrive.
 *
 * Colors read the same CSS custom properties `index.css` defines, so every chart re-themes for dark mode with
 * no second palette to keep in sync.
 */
const axisTick = { fill: 'var(--muted-foreground)', fontSize: 12 };
const tooltipStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--popover-foreground)',
};

/** Categorical slots, assigned in fixed order so a series keeps its color when the data changes. */
const CATEGORICAL = ['var(--primary)', '#0ea5e9', '#71717a', '#d4d4d8', '#a1a1aa'];

const STATUS_COLOR: Record<string, string> = {
  PAID: 'var(--success)',
  PENDING: 'var(--warning)',
  FAILED: 'var(--destructive)',
  REFUNDED: '#71717a',
  CANCELLED: '#d4d4d8',
};

const shortMonth = (month: string) => {
  const [year, monthPart] = month.split('-');
  const date = new Date(Number(year), Number(monthPart) - 1, 1);
  return date.toLocaleDateString(undefined, { month: 'short' });
};

export function RevenueGrowthChart({ data, currency }: { data: RevenuePoint[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ left: -12, right: 8 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="month" tickFormatter={shortMonth} tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={56} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${currency} ${value.toLocaleString()}`, 'Revenue']} />
        <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} fill="url(#revenueFill)" name="Revenue" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SubscriptionGrowthChart({ data }: { data: SubscriptionGrowthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: -16, right: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="month" tickFormatter={shortMonth} tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="subscriptions" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} name="Subscriptions" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PlanDistributionChart({ data }: { data: PlanDistributionPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }} />
        <Pie data={data} dataKey="subscriptions" nameKey="planName" innerRadius={48} outerRadius={78} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.planId} fill={CATEGORICAL[index % CATEGORICAL.length]} stroke="var(--card)" strokeWidth={2} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PaymentStatusChart({ data }: { data: PaymentStatusPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: -16, right: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="status" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--accent)' }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Payments">
          {data.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLOR[entry.status] ?? 'var(--primary)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
