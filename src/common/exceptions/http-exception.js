import { ERROR_CODE, HTTP_STATUS } from '#constants';

const DEFAULT_CODE_BY_STATUS = {
  [HTTP_STATUS.BAD_REQUEST]: ERROR_CODE.BAD_REQUEST,
  [HTTP_STATUS.UNAUTHORIZED]: ERROR_CODE.UNAUTHENTICATED,
  [HTTP_STATUS.FORBIDDEN]: ERROR_CODE.FORBIDDEN,
  [HTTP_STATUS.NOT_FOUND]: ERROR_CODE.NOT_FOUND,
  [HTTP_STATUS.CONFLICT]: ERROR_CODE.RESOURCE_CONFLICT,
};

export class HttpException extends Error {
  constructor(statusCode, message, { code, fieldErrors = {} } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code ?? DEFAULT_CODE_BY_STATUS[statusCode];
    this.fieldErrors = fieldErrors;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
