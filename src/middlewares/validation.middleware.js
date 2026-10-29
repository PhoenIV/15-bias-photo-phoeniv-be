import { flattenError } from 'zod';
import { ERROR_MESSAGE, ERROR_CODE } from '#constants';
import { BadRequestException } from '#exceptions';

/**
 * 범용 검증 미들웨어
 * @param {string} target - 검증할 대상 ('body', 'params', 'query')
 * @param {ZodSchema} schema - Zod 스키마
 */
export const validate = (target, schema) => {
  //서버가 시작할 때 라우터 등록시 오타를 검증하는 로직이다.
  if (!['body', 'query', 'params'].includes(target)) {
    throw new Error(
      `[validate middleware] Invalid target: "${target}". Expected "body", "query", or "params".`,
    );
  }

  //여기가 실제 미들웨어,
  //validate = (target, schema)에서 schema로 끼워지는 부분이
  //밑에 return문 코드이다.
  return (req, _res, next) => {
    try {
      const result = schema.safeParse(req[target]);
      //safeParse를 쓰는 이유: 실패해도 에러를 바로 안던지고 결과를 {객체}로 반환
      //파라미터로 받은 schema로 검사하고 결과를 result에 담는다.

      if (!result.success) {
        const { fieldErrors } = flattenError(result.error);

        throw new BadRequestException(ERROR_MESSAGE.VALIDATION_FAILED, {
          code: ERROR_CODE.VALIDATION_FAILED,
          fieldErrors,
        });
      }

      // 검증을 통과한 값만 남기려고 원래 값을 검증 결과로 바꾸며, Express 5의 req.query는 getter라 대입할 수 없으므로 속성을 다시 정의합니다.
      Object.defineProperty(req, target, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      //Object.defineProperty(): 객체의 속성을 만들고 바꿀 수 있고 속성의 성질까지 직접 정하는 함수
      //Object.defineProperty(객체, 속성이름, 속성설정)
      //.defineProperty()를 사용하게 되면 기본 속성으 성질이 모두 false로 초기화되서 true로 바꿔줘야된다.
      next();
    } catch (error) {
      next(error);
    }
  };
};
