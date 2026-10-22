// 데이터베이스 에러 코드(SQLSTATE) 상수
export const DB_ERROR = {
  UNIQUE_VIOLATION: '23505',
};

// 에러 메시지 상수 ---> 노션을 그대로 썼는데, 최애의 포토에 맞게 추가해야 합니다.
export const ERROR_MESSAGE = {
  // 사용자 관련
  USER_NOT_FOUND: '사용자를 찾을 수 없습니다.',
  EMAIL_REQUIRED: '이메일을 입력해야 합니다.',
  EMAIL_ALREADY_EXISTS: '이미 사용 중인 이메일입니다.',
  FAILED_TO_FETCH_USERS: '사용자 목록을 조회하지 못했습니다.',
  FAILED_TO_FETCH_USER: '사용자를 조회하지 못했습니다.',
  FAILED_TO_CREATE_USER: '사용자를 생성하지 못했습니다.',
  FAILED_TO_UPDATE_USER: '사용자 정보를 수정하지 못했습니다.',
  FAILED_TO_DELETE_USER: '사용자를 삭제하지 못했습니다.',

  // 인증 관련
  NO_AUTH_TOKEN: '인증 토큰이 없습니다.',
  INVALID_TOKEN: '유효하지 않거나 만료된 토큰입니다.',
  USER_NOT_FOUND_FROM_TOKEN: '토큰의 사용자를 찾을 수 없습니다.',
  AUTH_FAILED: '인증에 실패했습니다.',
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  FORBIDDEN: '접근 권한이 없습니다.',
  UNAUTHORIZED: '인증이 필요합니다.',

  // 입력 검증
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  VALIDATION_FAILED: '입력값 검증에 실패했습니다.',

  // 일반 에러 (Exception 기본값으로 사용)
  RESOURCE_NOT_FOUND: '리소스를 찾을 수 없습니다.',
  BAD_REQUEST: '잘못된 요청입니다.',
  RESOURCE_CONFLICT: '이미 존재하는 데이터입니다.',
  INTERNAL_SERVER_ERROR: '서버 내부 오류가 발생했습니다.',
};
