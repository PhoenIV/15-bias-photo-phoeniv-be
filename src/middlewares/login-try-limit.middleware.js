import {
  ERROR_CODE,
  ERROR_MESSAGE,
  LOGIN_ATTEMPT_COUNT_SECONDS,
  LOGIN_BLOCK_SECONDS,
  LOGIN_MAX_ATTEMPTS,
} from '#constants';
import { TooManyRequestsException } from '#exceptions';
import rateLimiter from 'rate-limiter-flexible';

const { RateLimiterMemory, RateLimiterRes } = rateLimiter;

const limiter = new RateLimiterMemory({
  points: LOGIN_MAX_ATTEMPTS,
  duration: LOGIN_ATTEMPT_COUNT_SECONDS,
  blockDuration: LOGIN_BLOCK_SECONDS,
});

export const loginTryLimit = async (req, res, next) => {
  const key = req.body.email;

  try {
    //consume(key): key를 기준으로 입력 시도 횟수를 1회 올린다. 5회 다음 부터 차단 시작
    await limiter.consume(key);
  } catch (error) {
    //로그인 연속 시도로 인한 에러가 아닌 예상 외의 에러는 next로 전달
    if (!(error instanceof RateLimiterRes)) {
      return next(error);
    }
    //로그인 연속 시도로 인한 제한 응답(RateLimiterRes) : 응답 헤더에 제한시간을 넘겨줘서 FE에서 이를 UI에 표현할 수 있다.
    res.set('Retry-After', String(Math.ceil(error.msBeforeNext / 1000)));
    return next(
      new TooManyRequestsException(ERROR_MESSAGE.TOO_MANY_LOGIN_ATTEMPTS, {
        code: ERROR_CODE.TOO_MANY_LOGIN_ATTEMPTS,
      }),
    );
  }

  //응답이 끝났을 때 로그인에 성공(400 미만)했으면 횟수를 초기화
  res.on('finish', () => {
    if (res.statusCode < 400) {
      void limiter.delete(key);
    }
  });

  next();
};
