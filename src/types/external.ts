export type ExtensionExternalRequest<T> = {
  traceId: string;
  action: string;
  data: T;
};

export interface ExtensionExternalResponse<T> {
  traceId: string;
  action: string;
  data: T;
}
