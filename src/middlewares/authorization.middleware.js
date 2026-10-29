import { ERROR_MESSAGE, ERROR_CODE } from '#constants';
import { UnauthorizedException } from '#exceptions';

const createAuthorizationMiddleware = (predicate) => (req, _res, next) => {
  if (!predicate(req)) {
    throw new UnauthorizedException(ERROR_MESSAGE.UNAUTHORIZED, {
      code: ERROR_CODE.UNAUTHENTICATED,
    });
    //인가 검증 에러는 401이다. 로그인의 여부만 확인하기 때문에 에러난 위치가 없다.
    //따라서 에러 응답 양식의 fieldErrors는 없고 errorHandler로 필요한 재료만 넘겨준다.
  }
  next();
};

const hasLoginUser = (req) => Boolean(req.user);
export const needsLogin = createAuthorizationMiddleware(hasLoginUser);
