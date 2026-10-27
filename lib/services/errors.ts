export class ServiceError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

export function errorMessage(error: unknown): string {
  if (isServiceError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
