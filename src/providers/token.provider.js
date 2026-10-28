import {
  ACCESS_TOKEN_TTL_SECONDS,
  MINUTE_IN_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from '#constants';
import jwt from 'jsonwebtoken';

export class TokenProvider {
  #accessSecret;
  #refreshSecret;

  constructor({ config }) {
    this.#accessSecret = config.JWT_ACCESS_SECRET;
    this.#refreshSecret = config.JWT_REFRESH_SECRET;
  }

  // Access Token 생성 (15분 유효)
  generateAccessToken(user) {
    return jwt.sign({ userId: user.id }, this.#accessSecret, {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  //Refresh Token 생성(7일 유효)
  generateRefreshToken(user) {
    return jwt.sign({ userId: user.id }, this.#refreshSecret, {
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });
  }

  //둘다 동시 생성
  generateTokens(user) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    return { accessToken, refreshToken };
  }

  //토큰 검증
  verifyAccessToken(token) {
    return this.#verifyToken(token, this.#accessSecret);
  }

  verifyRefreshToken(token) {
    return this.#verifyToken(token, this.#refreshSecret);
  }

  #verifyToken(token, secret) {
    try {
      return jwt.verify(token, secret, { algorithms: ['HS256'] });
    } catch {
      return null;
    }
  }

  //토큰 갱신해야되는지 검증 -> payload의 만기일을 검사
  shouldRefreshToken(payload) {
    if (!payload || !payload.exp) {
      return false;
    }

    const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
    return expiresIn < MINUTE_IN_SECONDS * 5 && expiresIn > 0;
    //반환값을 참 거짓으로 전달 (5분 이내 참 / 5분 이상 거짓)
  }
}
