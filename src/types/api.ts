export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** The envelope `ormitech-api` wraps every response in. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}
