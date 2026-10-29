import { ERROR_MESSAGE, ERROR_CODE } from '#constants';
import { NotFoundException } from '#exceptions';

export const notFound = (_req, _res, next) => {
  next(
    new NotFoundException(ERROR_MESSAGE.RESOURCE_NOT_FOUND, {
      code: ERROR_CODE.NOT_FOUND,
    }),
  );
};
