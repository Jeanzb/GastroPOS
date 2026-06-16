/** Standard error envelope returned by the API (AGENTS.md §10). */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
