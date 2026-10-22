import { HttpException } from './http-exception.js';
import { ERROR_MESSAGE, HTTP_STATUS } from '#constants';

export class ForbiddenException extends HttpException {
  constructor(message = ERROR_MESSAGE.FORBIDDEN, details = null) {
    super(HTTP_STATUS.FORBIDDEN, message, details);
  }
}
