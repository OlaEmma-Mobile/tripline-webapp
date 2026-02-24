/**
 * Typed application error with HTTP status.
 */
export class AppError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
