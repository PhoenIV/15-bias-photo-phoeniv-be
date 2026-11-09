import { URL } from 'node:url';
import { config } from '#config';
import { ERROR_CODE, ERROR_MESSAGE } from '#constants';
import { BadRequestException, UnauthorizedException } from '#exceptions';
import { validate } from '#middlewares';
import { BaseController } from '../base.controller.js';
import {
  socialCallbackQuerySchema,
  socialLoginQuerySchema,
} from './dto/social.dto.js';

const REDIRECTABLE_ERROR_CODE = [
  ERROR_CODE.INVALID_SOCIAL_AUTH_STATE,
  ERROR_CODE.SOCIAL_ACCOUNT_LINK_REQUIRED,
  ERROR_CODE.SOCIAL_AUTH_FAILED,
];

export class SocialAuthController extends BaseController {
  #socialAuthService;
  #cookieProvider;
  #oauthStateProvider;

  constructor({ socialAuthService, cookieProvider, oauthStateProvider }) {
    super();
    this.#socialAuthService = socialAuthService;
    this.#cookieProvider = cookieProvider;
    this.#oauthStateProvider = oauthStateProvider;
  }

  routes() {
    //구글 로그인 화면으로 리다이렉트
    this.router.get(
      '/google/login',
      validate('query', socialLoginQuerySchema),
      (req, res) => this.googleLogin(req, res),
    );

    //구글에서 다시 FE 주소로 리다이렉트
    this.router.get(
      '/google/callback',
      validate('query', socialCallbackQuerySchema),
      (req, res) => this.googleCallback(req, res),
    );

    return this.router;
  }

  googleLogin(req, res) {
    const { next } = req.query; //->구글 로그인이 끝나고 사용자가 보게될 FE 화면 경로
    const { state, transactionNonce, codeVerifier, codeChallenge } =
      this.#oauthStateProvider.createState({ provider: 'google', next });

    this.#cookieProvider.setOAuthTransactionCookies(res, {
      transactionNonce, //-> 일회용 무작위 번호 state안에 하나 넣고, 하나는 브라우저 쿠키가 갖고있는다
      codeVerifier, //-> 무작위 비밀값
    });

    //구글 로그인 인증 할 때 필요한 데이터들
    const params = new URLSearchParams({
      client_id: config.GOOGLE_CLIENT_ID,
      redirect_uri: config.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge, //-> codeVerifier를 해시한 값
      code_challenge_method: 'S256',
    });

    //위에서 정의한 데이터를 갖고 구글 로그인 주소로 브라우저를 리다이렉트 시킴
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  //구글에서 사용자가 구글 로그인을 하고 사용자 브라우저를 우리 서버로 리다이렉트 시킴
  async googleCallback(req, res) {
    //쿠키 두개를 읽는다
    const nonce = this.#cookieProvider.getOAuthTransactionNonce(req);
    const codeVerifier = this.#cookieProvider.getOAuthCodeVerifier(req);
    //쿠키 삭제 : 하는 이유는 중간에 에러가 나도 사용된 쿠키가 안남게 하려고
    this.#cookieProvider.clearOAuthTransactionCookies(res);

    try {
      const { code, state, error } = req.query;
      const transaction = this.#oauthStateProvider.verifyState({
        state,
        provider: 'google',
        transactionNonce: nonce,
        codeVerifier,
      });
      if (!transaction) {
        throw new BadRequestException(ERROR_MESSAGE.INVALID_SOCIAL_AUTH_STATE, {
          code: ERROR_CODE.INVALID_SOCIAL_AUTH_STATE,
        });
      }
      if (error) {
        throw new UnauthorizedException(ERROR_MESSAGE.SOCIAL_AUTH_FAILED, {
          code: ERROR_CODE.SOCIAL_AUTH_FAILED,
        });
      }

      //서버가 구글로 code, codeVerifier를 보내고 getGoogleProfile을 통해서 유저의 profile을 받음
      //token도 받아오는데 그건 구글의 access-token이라 profile을 받기 위해 getGoogleProfile 함수안에서만 사용함
      const profile = await this.#socialAuthService.getGoogleProfile({
        code,
        codeVerifier,
      });
      //구글이 준 profile을 사용해서 우리가 새로 발급한 토큰
      const { tokens } = await this.#socialAuthService.loginOrSignUp(profile);

      this.#cookieProvider.setAuthCookies(res, tokens);

      //위에서 받은 token, profile을 갖고 FRONTEND_URL + next로 사용자를 리다이렉트 (유저가 로그인 시작한 시점의 화면 페이지)
      res.redirect(new URL(transaction.next, config.FRONTEND_URL).toString());
    } catch (error) {
      const code = REDIRECTABLE_ERROR_CODE.includes(error.code)
        ? error.code
        : ERROR_CODE.SOCIAL_AUTH_FAILED;
      return res.redirect(
        new URL(`/login?error=${code}`, config.FRONTEND_URL).toString(),
      );
    }
  }
}
