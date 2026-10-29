export class HttpException extends Error {
  constructor(statusCode, message, { code, fieldErrors = {} } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
