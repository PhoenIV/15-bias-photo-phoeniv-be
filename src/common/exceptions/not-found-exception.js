import { HttpException } from './http-exception.js';
import { ERROR_MESSAGE, HTTP_STATUS } from '#constants';

export class NotFoundException extends HttpException {
  constructor(message = ERROR_MESSAGE.RESOURCE_NOT_FOUND, details = null) {
    super(HTTP_STATUS.NOT_FOUND, message, details);
  }
}
