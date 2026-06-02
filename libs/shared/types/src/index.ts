export interface ApiResponse<T> {
  data: T;
  status: 'ok' | 'error';
}
