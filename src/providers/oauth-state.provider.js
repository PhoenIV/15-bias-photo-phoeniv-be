import { MINUTE_IN_MS } from '#constants';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';

//사용자를 구글 인증 서버로 보내기 전에 쪽지(state)를 만들고 비밀키로 서명을 찍는 과정
//위조 검사와 10분이 경과되지 않았는지 확인 (방어코드)

const STATE_TTL_MS = 10 * MINUTE_IN_MS; //-> state의 유효기간 10분

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
};

export class OAuthStateProvider {
  #secret;
  #clientBaseUrl;
  #now;
  #randomBytes;

  constructor(
    { oauthStateSecret, clientBaseUrl },
    { now = Date.now, randomBytesFn = randomBytes } = {},
  ) {
    this.#secret = oauthStateSecret;
    this.#clientBaseUrl = clientBaseUrl;
    this.#now = now;
    this.#randomBytes = randomBytesFn;
  }

  //state(쪽지)만들기
  createState({ provider, next }) {
    const codeVerifier = this.#randomBytes(32).toString('base64url'); //-> 무작위 비밀값
    const codeChallenge = createHash('sha256') //-> 비밀값을 해시해버림 (sha256방식)
      .update(codeVerifier)
      .digest('base64url');

    //쪽지 내용
    const payload = {
      provider,
      next: this.normalizeNextPath(next), //-> normalizeNextPath는 구글로 갔다가 돌아올때 이동할 경로인 next가 안전한 경로인지 걸러주는 역할
      transactionNonce: this.#randomBytes(32).toString('base64url'), //-> 일회용 무작위 번호 state안에 하나 넣고, 하나는 브라우저 쿠키가 갖고있는다
      codeChallenge,
      issuedAt: this.#now(), //-> 발급 시각 (10분 제한에 쓰임)
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );

    //state, codeChallenge → 구글로 보내는 주소에 넣음
    //transactionNonce, codeVerifier → 쿠키에 저장(CookieProvider가 담당)
    return {
      state: `${encodedPayload}.${this.#sign(encodedPayload)}`, //->내용, 도장 형태 , 도장은#sign이 만듦
      transactionNonce: payload.transactionNonce,
      codeVerifier, //-> 비밀값
      codeChallenge, //-> 비밀값을 해시한거
    };
  }

  //보낸 요청이 구글로 갔다가 돌아왔을 때 state 검사
  verifyState({ state, provider, transactionNonce, codeVerifier }) {
    //4개중에 하나라도 없으면 null
    if (!state || !provider || !transactionNonce || !codeVerifier) {
      return null;
    }

    const [encodedPayload, signature, ...extraParts] = state.split('.');
    if (!encodedPayload || !signature || extraParts.length > 0) {
      return null;
    }

    if (!safeEqual(signature, this.#sign(encodedPayload))) {
      return null;
    }

    try {
      //구글에서 돌아온 요청값을 객체로 바꾸고 검사
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf-8'),
      );
      const age = this.#now() - payload.issuedAt;
      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');

      if (
        payload.provider !== provider ||
        !safeEqual(payload.transactionNonce, transactionNonce) ||
        !safeEqual(payload.codeChallenge, codeChallenge) ||
        !Number.isFinite(age) ||
        age < 0 ||
        age > STATE_TTL_MS
      ) {
        return null;
      }

      return {
        provider: payload.provider,
        next: this.normalizeNextPath(payload.next), //구글 로그인 후 이동하는 경로
      };
    } catch {
      return null;
    }
  }

  //구글 로그인 후 이동할 경로 필터링하기 (이상한 경로 예외처리하기)
  normalizeNextPath(next) {
    if (typeof next !== 'string') {
      return '/';
    }

    //화면에 보이지 않는 제어문자를 걸러내기 위해서 필요한 검사 로직 (줄바꿈, 탭 등)
    //next 경로를 some 메소드에 문자 하나하나 넣어서 하나라도 true가 나오면 걸러낸다
    const trimmedNext = next.trim();
    const hasControlCharacter = [...trimmedNext].some((character) => {
      const code = character.codePointAt(0); //-> 경로 글자 하나하나에 해당하는 번호를 알아냄
      //-> 경로 글자 하나하나가 0x1f(16진수, 31번) 이하이거나, 0x7f(DEL 127번)이면 true를 넘김
      return code <= 0x1f || code === 0x7f;
    });

    if (
      !trimmedNext.startsWith('/') || //-> 이동할 진짜 경로가 없거나
      trimmedNext.startsWith('//') || //-> 외부 주소로 이동하려고 하거나
      trimmedNext.includes('\\') || //-> 우회하려고 하거나
      hasControlCharacter //-> 제어문자 포함하거나
    ) {
      return '/'; //-> 경로 글자에 위 조건 중 하나라도 true면 (제어문자가 섞여 있으면) /로 대체함
    }

    //clientBaseUrl
    try {
      const baseUrl = new URL(this.#clientBaseUrl);
      const targetUrl = new URL(trimmedNext, baseUrl);

      if (targetUrl.origin !== baseUrl.origin) {
        return '/';
      }

      return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
    } catch {
      return '/';
    }
  }

  #sign(encodedPayload) {
    return createHmac('sha256', this.#secret) //-> secret을 알고 있는 사람만 만들 수 있는 지문
      .update(encodedPayload)
      .digest('base64url');
  }
}
