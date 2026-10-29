import { DB_ERROR, ERROR_MESSAGE, HTTP_STATUS } from '#constants';
import { HttpException } from '#exceptions';

export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof HttpException) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        fieldErrors: err.fieldErrors,
      },
    });
  }

  //4xx 에러 처리 -> 예외처리로 들어가지 않는 400번대 에러
  //라이브러리가 자동으로 던지는 에러를 의미함 ex. 413...
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      error: {
        code: 'BAD_REQUEST',
        message: ERROR_MESSAGE.BAD_REQUEST,
        fieldErrors: {},
      },
    });
  }

  //DB 제약 위반 (충돌에러)
  if (err.sqlState === DB_ERROR.UNIQUE_VIOLATION) {
    return res.status(HTTP_STATUS.CONFLICT).json({
      error: {
        code: 'RESOURCE_CONFLICT',
        message: ERROR_MESSAGE.RESOURCE_CONFLICT,
        fieldErrors: {},
      },
    });
  }

  //나머지 에러 처리
  console.error(err.stack);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      fieldErrors: {},
    },
  });
};
