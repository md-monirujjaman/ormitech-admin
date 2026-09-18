import { apiDataSource } from './apiDataSource';
import { mockDataSource } from '@/mocks/mockDataSource';
import { adminDataSourceMode } from '@/lib/constants';
import type { AdminDataSource } from './adminDataSource';

/**
 * Picks the active data source. `mock` is the default because none of the admin endpoints exist on
 * ormitech-api yet; switching to `api` is one environment variable and no component changes.
 */
export const dataSource: AdminDataSource = adminDataSourceMode === 'api' ? apiDataSource : mockDataSource;

export const isMockDataSource = dataSource.id === 'mock';
