import { HttpException } from './http-exception.js';
import { ERROR_MESSAGE, HTTP_STATUS } from '#constants';

export class TooManyRequestsException extends HttpException {
  constructor(message = ERROR_MESSAGE.POINT_COOLDOWN_NOT_ENOUGH, options) {
    super(HTTP_STATUS.TOO_MANY_REQUESTS, message, options);
  }
}
