export interface StorageLimit {
  kind: 'limited' | 'unlimited' | 'disabled';
  value: number | null;
  source: 'override' | 'plan' | 'default';
}

export interface StorageOrganizationRow {
  organizationId: string;
  organizationName: string;
  plan: string;
  usedBytes: number;
  fileCount: number;
  limit: StorageLimit;
  percentUsed: number | null;
  nearLimit: boolean;
  overLimit: boolean;
}

export interface StorageOrganizationsPage {
  items: StorageOrganizationRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface StorageOverview {
  totalBytes: number;
  totalFiles: number;
  organizationsWithFiles: number;
  organizationsNearLimit: number;
  organizationsOverLimit: number;
  failedKnowledgeSources: number;
  r2Configured: boolean;
  byCategory: Array<{ category: string; bytes: number; count: number }>;
}

export interface StorageRecentFile {
  id: string;
  organizationId: string;
  organizationName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  createdAt: string;
}

export interface StorageFailedSource {
  id: string;
  organizationId: string;
  organizationName: string;
  title: string;
  failureReason: string | null;
  updatedAt: string;
}

export interface StoragePolicy {
  maxBytesByKind: Record<string, number>;
  knowledgeMaxBytes: number;
  maxUploadBytes: number;
  allowedMimeTypes: string[];
  knowledgeMimeTypes: string[];
  planQuotas: Record<string, StorageLimit>;
}

export interface StorageOrganizationsParams {
  search?: string;
  nearLimit?: boolean;
  page: number;
  limit: number;
}
