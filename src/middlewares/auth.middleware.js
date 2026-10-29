import { UnauthorizedException } from '#exceptions';

// 이 미들웨어는 토큰이 유요하면 인증했다는 표시로 req.user = {id}를 붙여줍니다
// 토큰이 만료 되었을 때만 DB를 조회하여 req.user = {id}를 붙여줍니다
export class AuthMiddleware {
  #tokenProvider;
  #authService;
  #cookieProvider;

  constructor({ tokenProvider, authService, cookieProvider }) {
    this.#tokenProvider = tokenProvider;
    this.#authService = authService;
    this.#cookieProvider = cookieProvider;
  }

  authenticate = async (req, res, next) => {
    const { accessToken, refreshToken } = req.cookies;

    // 1. 두 토큰이 모두 없으면 비인증 요청으로 넘깁니다.
    if (!accessToken && !refreshToken) {
      // throw new UnauthorizedException(ERROR_MESSAGE.NO_AUTH_TOKEN);
      return next();
    }

    // 2. Access Token이 유효하지 않거나 만료가 가까우면 Refresh Token으로 새 토큰을 발급받습니다.
    const payload = accessToken
      ? this.#tokenProvider.verifyAccessToken(accessToken)
      : null;

    const isValidAccess = Boolean(payload?.userId);

    const needsRenewal =
      !isValidAccess || this.#tokenProvider.shouldRefreshToken(payload);

    const renewed =
      needsRenewal && refreshToken
        ? await this.#renewTokens(refreshToken)
        : null;

    if (renewed) {
      this.#cookieProvider.setAuthCookies(res, renewed.tokens);
      req.user = { id: renewed.user.id };
      return next();
    } //-> req.user = { id: renewed.user.id };
    //요청에 회원 권한을 부여하여 이후에 인가 로직을 만들때
    //user.id 를 꺼내 게시물 등의 userId와 비교할 수 있다.

    // 3. 새 토큰을 받지 못했어도 Access Token이 유효하면 그대로 통과시킵니다.
    if (payload) {
      req.user = { id: payload.userId };
      return next();
    }

    // 4. 인증할 수 없으면 쿠키를 지우고 비인증 요청으로 넘깁니다.
    this.#cookieProvider.clearAuthCookies(res);
    // throw new UnauthorizedException(ERROR_MESSAGE.INVALID_TOKEN);
    return next();
  };

  async #renewTokens(refreshToken) {
    try {
      return await this.#authService.refreshTokens(refreshToken);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return null;
      }
      throw error;
    }
  }
}
