import { z } from 'zod';
import { config } from '#config';
import { DB_ERROR, ERROR_CODE, ERROR_MESSAGE } from '#constants';
import { ConflictException, UnauthorizedException } from '#exceptions';

//구글에서 온 응답 검사용 스키마
const accessTokenResponseSchema = z.object({
  access_token: z.string().min(1),
});

const googleProfileSchema = z.object({
  sub: z.string().min(1), //->구글 고유 사용자 번호
  email: z.email().nullable().optional(),
  email_verified: z.boolean().optional(), //-> 구글이 인증하고 보내는 응답에 이 값이 표준 처럼 들어가있음
  name: z.string().min(1).optional(),
});

export class SocialAuthService {
  #userRepository;
  #tokenProvider;

  constructor({ userRepository, tokenProvider }) {
    this.#userRepository = userRepository;
    this.#tokenProvider = tokenProvider;
  }

  //구글로 인증을 위한 데이터를 담아서 요청을 보내고 출입증과 유저 정보를 받는다 (tokenResponse, profileResponse)
  async getGoogleProfile({ code, codeVerifier }) {
    const tokenResponse = this.#parseSocialResponse(
      accessTokenResponseSchema,
      await this.#requestSocialJson('https://oauth2.googleapis.com/token', {
        //-> 구글 인증 주소
        method: 'POST', //-> 구글 인증 코드를 받기 위한 데이터
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.GOOGLE_CLIENT_ID,
          client_secret: config.GOOGLE_CLIENT_SECRET,
          redirect_uri: config.GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code', //-> 구글 인증 코드를 달라는 고정문구
          code_verifier: codeVerifier,
        }),
      }),
    );

    //위에서 받은 출입증의 accesstoken을 갖고 있는 유저의 정보를 받음
    const profileResponse = this.#parseSocialResponse(
      googleProfileSchema,
      await this.#requestSocialJson(
        'https://openidconnect.googleapis.com/v1/userinfo',
        {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        },
      ),
    );

    //구글 응답의 양식(sub, email_verified)을 우리 서비스 양식으로 바꿔서 반환
    return {
      id: String(profileResponse.sub),
      email: profileResponse.email ?? null,
      emailVerified: profileResponse.email_verified === true,
      name: profileResponse.name ?? null,
    };
  }

  async loginOrSignUp(profile) {
    const user = await this.#resolveUser(profile);
    const tokens = this.#tokenProvider.generateTokens(user);
    return { user, tokens };
  }

  async #resolveUser(profile) {
    //구글로 이미 로그인 한 사람인지 확인하고 맞으면 그대로 로그인
    const googleUser = await this.#userRepository.findByProvider(
      'GOOGLE',
      profile.id,
    );
    if (googleUser) return googleUser;

    //구글에서 받은 유저 프로필에 이메일이 인증되지 않을 경우
    if (!profile.email || !profile.emailVerified) {
      throw new UnauthorizedException(ERROR_MESSAGE.SOCIAL_AUTH_FAILED, {
        code: ERROR_CODE.SOCIAL_AUTH_FAILED,
      });
    }

    //구글에서 받은 이메일이 우리 서버에도 있는 경우 (중복)
    const email = profile.email.toLowerCase();
    const existingUser = await this.#userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(ERROR_MESSAGE.SOCIAL_ACCOUNT_LINK_REQUIRED, {
        code: ERROR_CODE.SOCIAL_ACCOUNT_LINK_REQUIRED,
      });
    }

    //새로 가입하는 사람은 닉네임 만들고 가입 진행
    const nickname = await this.#generateNickname(profile.name);
    try {
      return await this.#userRepository.createWithGoogle({
        email,
        nickname,
        providerId: profile.id,
      });
    } catch (error) {
      if (error.sqlState === DB_ERROR.UNIQUE_VIOLATION) {
        throw new ConflictException(ERROR_MESSAGE.RESOURCE_CONFLICT);
      }
      throw error;
    }
  }

  //구글에서 들어온 name값을 nickname 검증 로직으로 검사
  async #generateNickname(name) {
    const chars = [...(name ?? '').trim()];
    const base = chars.length >= 2 ? chars : [...'구글유저'];

    let candidate = base.slice(0, 10).join('');
    if (!(await this.#userRepository.findByNickname(candidate))) {
      return candidate;
    }

    //구글에서 온 유저의  name이 최애의 포토 회원 중 nickname과 겹칠 경우
    for (let i = 0; i < 5; i++) {
      const randomNumber = String(Math.floor(Math.random() * 10000)).padStart(
        4,
        '0',
      ); //-> padStart(만들 글자수, 앞에부터 채울 숫자) 4자리 수 아래의 랜덤 숫자가 나올 경우 앞에서부터 0으로 채운다는 뜻
      candidate =
        base.slice(0, 10 - randomNumber.length).join('') + randomNumber;
      if (!(await this.#userRepository.findByNickname(candidate))) {
        return candidate;
      }
    }
    throw new ConflictException(ERROR_MESSAGE.RESOURCE_CONFLICT);
  }

  //구글 응답을 받고 스키마로 필요한 값만 필터링
  #parseSocialResponse(schema, payload) {
    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new UnauthorizedException(ERROR_MESSAGE.SOCIAL_AUTH_FAILED, {
        code: ERROR_CODE.SOCIAL_AUTH_FAILED,
      });
    }
    return result.data;
  }

  async #requestSocialJson(url, options) {
    let response;
    try {
      response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000), //-> 10초 안에 응답이 없으면 요청을 중단
        //구글 서버가 오류가 났을 때 무한 대기를 막아줌
      });
    } catch {
      throw new UnauthorizedException(ERROR_MESSAGE.SOCIAL_AUTH_FAILED, {
        code: ERROR_CODE.SOCIAL_AUTH_FAILED,
      });
    }

    if (!response.ok) {
      throw new UnauthorizedException(ERROR_MESSAGE.SOCIAL_AUTH_FAILED, {
        code: ERROR_CODE.SOCIAL_AUTH_FAILED,
      });
    }

    try {
      return await response.json();
    } catch {
      throw new UnauthorizedException(ERROR_MESSAGE.SOCIAL_AUTH_FAILED, {
        code: ERROR_CODE.SOCIAL_AUTH_FAILED,
      });
    }
  }
}
