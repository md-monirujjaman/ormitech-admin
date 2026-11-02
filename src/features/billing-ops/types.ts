/** What ormitech-api returns for the billing writes (super admins only). Amounts are text: the API owns the arithmetic. */
export interface PlanAllowance {
  decided: boolean;
  credits: string | null;
  expiresAfterDays: number | null;
  note: string | null;
  updatedAt: string | null;
}

export interface SetAllowanceInput {
  credits: string;
  expiresAfterDays: number | null;
  note?: string;
}

export interface Allocation {
  subscriptionId: string;
  periodStart: string;
  credits: string;
  expiresAt: string | null;
  bucketId: string;
  replay: boolean;
}

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitAmount: string;
}

export interface CreateInvoiceInput {
  organizationId: string;
  subscriptionId?: string;
  currency: string;
  taxRate?: string;
  discountAmount?: string;
  lines: InvoiceLineInput[];
  reason: string;
}

export interface InvoiceRecord {
  id: string;
  number: string;
  status: string;
  currency: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
  replay?: boolean;
}

export interface RecordPaymentInput {
  amount: string;
  currency: string;
  reference: string;
  idempotencyKey: string;
}

export interface SubscriptionRecord {
  id: string;
  planSlug: string;
  planName: string;
  status: string;
  organizationPlan: string;
  planMatchesOrganization: boolean;
}

export interface Consistency {
  planMismatches: Array<{ organizationId: string; organizationPlan: string; subscriptionPlan: string; subscriptionStatus: string }>;
  workspacesWithoutSubscription: number;
  unbalancedInvoices: Array<{ invoiceId: string; number: string; status: string; total: string; paid: string }>;
}
