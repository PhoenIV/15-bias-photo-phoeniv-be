import { MINUTE_IN_SECONDS, DAY_IN_SECONDS } from './time.js';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * MINUTE_IN_SECONDS;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * DAY_IN_SECONDS;

//로그인 시도 제한 상수
export const LOGIN_MAX_ATTEMPTS = 5; //-> 5번까지는 시도 가능, 6번째부터 차단
export const LOGIN_ATTEMPT_COUNT_SECONDS = DAY_IN_SECONDS; //-> 연속 실패를 세는 기간
export const LOGIN_BLOCK_SECONDS = 15 * MINUTE_IN_SECONDS; //-> 초과 시 차단 시간
