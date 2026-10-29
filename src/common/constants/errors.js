// 데이터베이스 에러 코드(SQLSTATE) 상수
export const DB_ERROR = {
  UNIQUE_VIOLATION: '23505',
};

// 에러 메시지 상수
export const ERROR_MESSAGE = {
  // 사용자 관련
  USER_NOT_FOUND: '사용자를 찾을 수 없습니다.',
  EMAIL_REQUIRED: '이메일을 입력해야 합니다.',
  EMAIL_ALREADY_EXISTS: '이미 사용 중인 이메일입니다.',
  NICKNAME_ALREADY_EXISTS: '이미 사용 중인 닉네임입니다.',
  FAILED_TO_FETCH_USERS: '사용자 목록을 조회하지 못했습니다.',
  FAILED_TO_FETCH_USER: '사용자를 조회하지 못했습니다.',
  FAILED_TO_CREATE_USER: '사용자를 생성하지 못했습니다.',
  FAILED_TO_UPDATE_USER: '사용자 정보를 수정하지 못했습니다.',
  FAILED_TO_DELETE_USER: '사용자를 삭제하지 못했습니다.',

  // 포토카드 기본정보 관련
  PHOTOCARD_NOT_FOUND: '카드 기본정보를 찾을 수 없습니다.',
  NAME_REQUIRED: '포토카드 이름을 입력해야 합니다.',
  PRICE_AND_QUANTITY_REQUIRED: '최소금액과 발급수량을 입력해야 합니다',
  IMAGE_SOURCE_REQUIRED: '이미지를 첨부해야 합니다.',
  IMAGE_ALREADY_EXISTS: '이미 발급한 적이 있는 이미지입니다.',
  FAILED_TO_FETCH_PHOTOCARD: '카드 기본정보를 불러오지 못했습니다.',
  FAILED_TO_CREATE_PHOTOCARD: '포토카드를 생성하지 못했습니다.',
  FAILED_TO_UPDATE_PHOTOCARD: '카드 기본정보를 수정하지 못했습니다.',
  FAILED_TO_DELETE_PHOTOCARD: '카드 기본정보를 삭제하지 못했습니다.',

  // 사용자 보유 포토카드 관련
  USERCARD_NOT_FOUND: '요청하신 보유 카드를 찾을 수 없습니다.',
  USERCARD_ALREADY_EXISTS: '해당 유저가 이미 보유중인 카드입니다.',
  FAILED_TO_FETCH_USERCARDS: '사용자 보유 카드 목록을 조회하지 못했습니다.',
  FAILED_TO_FETCH_USERCARD: '사용자 보유 카드 정보를 조회하지 못했습니다.',
  FAILED_TO_CREATE_USERCARD: '사용자 보유 카드를 생성하지 못했습니다.',
  FAILED_TO_UPDATE_USERCARD: '사용자 보유 카드 정보를 수정하지 못했습니다.',
  FAILED_TO_DELETE_USERCARD: '사용자 보유 카드를 삭제하지 못했습니다.',

  // 판매글 관련
  SALE_NOT_FOUND: '판매글 정보를 찾을 수 없습니다.',
  PRICE_REQUIRED: '판매 가격을 입력해야 합니다.',
  TOTAL_QUANTITY_REQUIRED: '판매할 수량을 입력해야 합니다.',
  SALE_ALREADY_CANCELLED: '이미 삭제된 판매글입니다.',
  FAILED_TO_FETCH_SALES: '판매글 목록을 조회하지 못했습니다.',
  FAILED_TO_FETCH_SALE: '판매글을 조회하지 못했습니다.',
  FAILED_TO_CREATE_SALE: '판매글을 생성하지 못했습니다.',
  FAILED_TO_UPDATE_SALE: '판매글을 수정하지 못했습니다.',
  FAILED_TO_DELETE_SALE: '판매글을 삭제하지 못했습니다.',

  // 구매 관련
  PURCHASE_NOT_FOUND: '구매이력 정보를 찾을 수 없습니다.',
  QUANTITY_REQUIRED: '구매할 장수를 입력해야 합니다.',
  FAILED_TO_FETCH_PURCHASES: '구매이력 목록을 조회하지 못했습니다.',
  FAILED_TO_FETCH_PURCHASE: '구매이력을 조회하지 못했습니다.',
  FAILED_TO_CREATE_PURCHASE: '구매이력을 생성하지 못했습니다.',
  FAILED_TO_UPDATE_PURCHASE: '구매이력을 수정하지 못했습니다.',
  FAILED_TO_DELETE_PURCHASE: '구매이력을 삭제하지 못했습니다',

  // 교환 신청 관련
  EXCHANGE_OFFER_NOT_FOUND: '교환 신청 정보를 찾을 수 없습니다.',
  EXCHANGE_OFFER_ALREADY_REJECTED: '이미 거절당했던 교환 신청입니다.',
  FAILED_TO_FETCH_EXCHANGE_OFFERS: '교환 신청 정보 목록을 조회하지 못했습니다',
  FAILED_TO_FETCH_EXCHANGE_OFFER: '교환 신청 정보를 조회하지 못했습니다',
  FAILED_TO_CREATE_EXCHANGE_OFFER: '교환 신청 정보를 생성하지 못했습니다',
  FAILED_TO_UPDATE_EXCHANGE_OFFER: '교환 신청 정보를 수정하지 못했습니다',
  FAILED_TO_DELETE_EXCHANGE_OFFER: '교환 신청 정보를 삭제하지 못했습니다',

  // 알림 관련
  NOTIFICATION_NOT_FOUND: '알림을 찾을 수 없습니다',
  NOTIFICATION_SINGLE_CAUSE_REQUIRED:
    '알림을 발생시키는 단일한 원인이 있어야 합니다.',
  FAILED_TO_FETCH_NOTIFICATIONS: '알림 목록을 조회하지 못했습니다',
  FAILED_TO_FETCH_NOTIFICATION: '알림을 조회하지 못했습니다.',
  FAILED_TO_CREATE_NOTIFICATION: '알림을 생성하지 못했습니다',
  FAILED_TO_UPDATE_NOTIFICATION: '알림을 수정하지 못했습니다',
  FAILED_TO_DELETE_NOTIFICATION: '알림을 삭제하지 못했습니다.',

  // 포인트 변동이력 관련
  POINT_HISTORY_NOT_FOUND: '포인트 변동이력을 찾을 수 없습니다.',
  POINT_HISTORY_ALREADY_CREATED: '이미 생성된 포인트 변동이력입니다.',
  POINT_HISTORY_SINGLE_CAUSE_REQUIRED:
    '포인트 변동을 발생시키는 단일한 원인이 있어야 합니다.',
  FAILED_TO_FETCH_POINT_HISTORIES:
    '포인트 변동이력 목록을 조회하지 못했습니다.',
  FAILED_TO_FETCH_POINT_HISTORY: '포인트 변동이력을 조회하지 못했습니다.',
  FAILED_TO_CREATE_POINT_HISTORY: '포인트 변동이력을 생성하지 못했습니다.',
  FAILED_TO_UPDATE_POINT_HISTORY: '포인트 변동이력을 수정하지 못했습니다.',
  FAILED_TO_DELETE_POINT_HISTORY: '포인트 변동이력을 삭제하지 못했습니다.',

  // 포인트 뽑기 이력 관련
  POINT_DRAW_NOT_FOUND: '포인트 뽑기 이력을 찾을 수 없습니다.',
  FAILED_TO_FETCH_POINT_DRAWS: '포인트 뽑기 이력 목록을 조회하지 못했습니다.',
  FAILED_TO_FETCH_POINT_DRAW: '포인트 뽑기 이력을 조회하지 못했습니다.',
  FAILED_TO_CREATE_POINT_DRAW: '포인트 뽑기 이력을 생성하지 못했습니다.',
  FAILED_TO_UPDATE_POINT_DRAW: '포인트 뽑기 이력을 수정하지 못했습니다.',
  FAILED_TO_DELETE_POINT_DRAW: '포인트 뽑기 이력을 삭제하지 못했습니다.',

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

// 에러 코드 상수 (클라이언트가 분기에 쓰는 영문 식별자, API 명세 기준)
export const ERROR_CODE = {
  // 공통
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',

  // 인증
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_DUPLICATE: 'EMAIL_DUPLICATE',
  NICKNAME_DUPLICATE: 'NICKNAME_DUPLICATE',
};
