export interface ApiResponse<T> {
  hasError: boolean;
  data: T | null;
  message: string;
  description: string;
  errors: Record<string, string[]>;
}
