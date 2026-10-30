import { DB_ERROR, ERROR_CODE, ERROR_MESSAGE } from '#constants';
import { ConflictException, UnauthorizedException } from '#exceptions';

export class AuthService {
  #userRepository;
  #passwordProvider;
  #tokenProvider;

  constructor({ userRepository, passwordProvider, tokenProvider }) {
    this.#userRepository = userRepository;
    this.#passwordProvider = passwordProvider;
    this.#tokenProvider = tokenProvider;
  }

  //회원가입 비즈니스 로직
  async signUp({ email, password, nickname }) {
    //이메일 중복 검증
    const existingUser = await this.#userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(ERROR_MESSAGE.EMAIL_ALREADY_EXISTS, {
        code: ERROR_CODE.EMAIL_DUPLICATE,
        fieldErrors: { email: [ERROR_MESSAGE.EMAIL_ALREADY_EXISTS] },
      });
    }

    //닉네임 중복 검증
    const existNickname = await this.#userRepository.findByNickname(nickname);
    if (existNickname) {
      throw new ConflictException(ERROR_MESSAGE.NICKNAME_ALREADY_EXISTS, {
        code: ERROR_CODE.NICKNAME_DUPLICATE,
        fieldErrors: { nickname: [ERROR_MESSAGE.NICKNAME_ALREADY_EXISTS] },
      });
    }

    //패스워드 해시 진행 (회원가입이니까)
    const hashedPassword = await this.#passwordProvider.hash(password);

    //회원 등록
    try {
      const user = await this.#userRepository.create({
        email,
        password: hashedPassword,
        nickname,
      });

      //토큰 2개 발급
      const tokens = this.#tokenProvider.generateTokens(user);

      return { user, tokens };
    } catch (error) {
      if (error.sqlState === DB_ERROR.UNIQUE_VIOLATION) {
        throw new ConflictException(ERROR_MESSAGE.RESOURCE_CONFLICT);
      }
      throw error;
    }
  }

  //로그인 비즈니스 로직
  async logIn({ email, password }) {
    //유저가 존재하는지 이메일로 확인
    const user = await this.#userRepository.findByEmail(email, {
      includePassword: true,
    });
    if (!user || !user.password) {
      throw new UnauthorizedException(ERROR_MESSAGE.INVALID_CREDENTIALS, {
        code: ERROR_CODE.INVALID_CREDENTIALS,
      });
    }

    //패스워드 검증
    const isPasswordValid = await this.#passwordProvider.compare(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(ERROR_MESSAGE.INVALID_CREDENTIALS, {
        code: ERROR_CODE.INVALID_CREDENTIALS,
      });
    }

    //토큰 2개 발급
    const tokens = this.#tokenProvider.generateTokens(user);
    const { password: _password, ...rest } = user;

    return { user: rest, tokens };
  }

  //새 토큰 발급
  async refreshTokens(refreshToken) {
    const payload = this.#tokenProvider.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedException(ERROR_MESSAGE.INVALID_TOKEN);
    }

    const user = await this.#userRepository.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGE.USER_NOT_FOUND_FROM_TOKEN);
    }

    const tokens = this.#tokenProvider.generateTokens(user);

    return { user, tokens };
  }
}
