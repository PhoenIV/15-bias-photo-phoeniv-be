import { HttpException } from './http-exception.js';
import { ERROR_MESSAGE, HTTP_STATUS } from '#constants';

export class BadRequestException extends HttpException {
  constructor(message = ERROR_MESSAGE.BAD_REQUEST, details = null) {
    super(HTTP_STATUS.BAD_REQUEST, message, details);
  }
}
