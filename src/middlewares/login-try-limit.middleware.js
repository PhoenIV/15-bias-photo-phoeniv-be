import { ERROR_CODE, ERROR_MESSAGE, MINUTE_IN_MS } from '#constants';
import { TooManyRequestsException } from '#exceptions';
import rateLimit from 'express-rate-limit';

export const loginTryLimit = rateLimit({
  windowMs: 15 * MINUTE_IN_MS, //-> 15분 제한
  limit: 5, //-> 시도 횟수
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.email,
  handler: (_req, _res, next) =>
    next(
      new TooManyRequestsException(ERROR_MESSAGE.TOO_MANY_LOGIN_ATTEMPTS, {
        code: ERROR_CODE.TOO_MANY_LOGIN_ATTEMPTS,
      }),
    ),
});
