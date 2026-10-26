import { HttpException } from './http-exception.js';
import { ERROR_MESSAGE, HTTP_STATUS } from '#constants';

export class ConflictException extends HttpException {
  constructor(message = ERROR_MESSAGE.RESOURCE_CONFLICT, details = null) {
    super(HTTP_STATUS.CONFLICT, message, details);
  }
}
