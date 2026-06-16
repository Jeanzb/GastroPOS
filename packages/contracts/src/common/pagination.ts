/** Query parameters for paginated list endpoints. */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Standard envelope for paginated list responses. */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
