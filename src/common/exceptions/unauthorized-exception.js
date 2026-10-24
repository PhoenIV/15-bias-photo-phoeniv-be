import { HttpException } from './http-exception.js';
import { ERROR_MESSAGE, HTTP_STATUS } from '#constants';

export class UnauthorizedException extends HttpException {
  constructor(message = ERROR_MESSAGE.UNAUTHORIZED, details = null) {
    super(HTTP_STATUS.UNAUTHORIZED, message, details);
  }
}
