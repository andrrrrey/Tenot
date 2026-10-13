import { HttpException, HttpStatus } from '@nestjs/common';

export class TooManyRequestsException extends HttpException {
  constructor(message: string, retryAfterSec: number) {
    super(
      { statusCode: HttpStatus.TOO_MANY_REQUESTS, message, retryAfter: Math.max(1, Math.ceil(retryAfterSec)) },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
