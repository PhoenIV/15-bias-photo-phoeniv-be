import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  SECOND_IN_MS,
} from '#constants';

export class CookieProvider {
  #isProduction;
  #baseCookieOptions; //쿠키를 생성하고 지울때 옵션이 동일해야되는데 한 곳에서 처리 가능

  constructor({ config }) {
    this.#isProduction = config.NODE_ENV === 'PRODUCTION';
    this.#baseCookieOptions = {
      httpOnly: true,
      secure: this.#isProduction, //개발에서는 false 상태가 맞음
      sameSite: 'lax',
      path: '/',
    };
  }

  //res에 쿠키 담기, 쿠키 옵션 설정
  setAuthCookies(res, tokens) {
    const { accessToken, refreshToken } = tokens;

    //AccessToken 쿠키 옵션
    res.cookie('accessToken', accessToken, {
      ...this.#baseCookieOptions,
      maxAge: ACCESS_TOKEN_TTL_SECONDS * SECOND_IN_MS, //15분
    });

    //RefreshToken 쿠키 옵션
    res.cookie('refreshToken', refreshToken, {
      ...this.#baseCookieOptions,
      maxAge: REFRESH_TOKEN_TTL_SECONDS * SECOND_IN_MS, // 7일
    });
  }

  //인증 쿠키 삭제 (로그아웃 시)
  clearAuthCookies(res) {
    res.clearCookie('accessToken', this.#baseCookieOptions);
    res.clearCookie('refreshToken', this.#baseCookieOptions);
    //clearCookie(토큰이름, 옵션): 옵션은 해당 경로로 들어오는 요청의 쿠키를 지워라 라는 의미로
    //요청의 경로를 적는 자리이다
  }
}
