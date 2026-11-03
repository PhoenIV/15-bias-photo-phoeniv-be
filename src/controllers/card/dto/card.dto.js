import { z } from 'zod';

const GRADES = ['COMMON', 'RARE', 'SUPER_RARE', 'LEGENDARY'];

const GENRES = [
  'ALBUM',
  'SPECIAL',
  'FAN_SIGN',
  'SEASONS_GREETINGS',
  'FAN_MEETING',
  'CONCERT',
  'MD',
  'COLLAB',
  'FAN_CLUB',
  'OTHERS',
];

export const cardCreateSchema = z.object({
  name: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? '포토카드 이름을 입력해주세요.'
          : '포토카드 이름은 문자열이어야 합니다.',
    })
    .trim()
    .min(1, '포토카드 이름은 최소 1자 이상이어야 합니다.')
    .max(30, '포토카드 이름은 최대 30자까지 가능합니다.'),

  grade: z.enum(GRADES, {
    error: (issue) =>
      issue.input === undefined
        ? '포토카드 등급을 선택해주세요.'
        : '유효하지 않은 등급입니다.',
  }),

  genre: z.enum(GENRES, {
    error: (issue) =>
      issue.input === undefined
        ? '포토카드 장르를 선택해주세요.'
        : '유효하지 않은 장르입니다.',
  }),

  minPrice: z
    .string()
    .trim()
    .min(1, '기준 가격을 입력해주세요.')
    .pipe(
      z.coerce
        .number({ error: '기준 가격은 숫자여야 합니다.' })
        .int('가격은 정수여야 합니다.')
        .min(0, '최소 가격은 0원 이상이어야 합니다.')
        .max(100000, '가격은 100,000원 이하여야 합니다.'),
    ),

  totalCreated: z
    .string()
    .trim()
    .min(1, '발행 수량을 입력해주세요.')
    .pipe(
      z.coerce
        .number({ error: '발행 수량은 숫자여야 합니다.' })
        .int('발행 수량은 정수여야 합니다.')
        .min(1, '최소 1장 이상 발행해야 합니다.')
        .max(10, '최대 10장까지만 발행할 수 있습니다.'),
    ),

  description: z
    .string()
    .trim()
    .max(100, '상세 설명은 최대 100자까지 입력할 수 있습니다.')
    .optional(),
});
