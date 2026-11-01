import z from 'zod';

const cursorObjectSchema = z.union([
  z
    .object({
      createdAt: z.string(),
      id: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      price: z.number().int().nonnegative(),
      id: z.number().int().positive(),
    })
    .strict(),
]);

// cursor는 요청 쿼리를 통해 객체처럼 생긴 문자열을 받는다. 이를 제이슨 형태로 파싱해서 cursorObjectSchema로 전달한다.
// 처음 들어온 값이 문자열이 아니거나 JSON 파싱에 실패시에는 값을 그대로 전달하면 cursorObjectSchema에서 걸린다.
const cursorSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, cursorObjectSchema);

const excludeSoldOutSchema = {
  enum: ['exclude', 'include'],
  transform: (excludeSoldOut) => {
    switch (excludeSoldOut) {
      case 'exclude':
        return true;
      case 'include':
        return false;
    }
  },
};

const SORT_ENUM = ['latest', 'oldest', 'priceAsc', 'priceDesc'];
const GRADE_ENUM = ['COMMON', 'RARE', 'SUPER_RARE', 'LEGENDARY'];
const GENRE_ENUM = [
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

// 판매글 목록 조회시 - target: "query"
export const getSalesSchema = z.object({
  sort: z.enum(SORT_ENUM).optional(),
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  keyword: z.string().max(50).optional(),
  grade: z.enum(GRADE_ENUM).optional(),
  genre: z.enum(GENRE_ENUM).optional(),
  excludeSoldOut: z
    .enum(excludeSoldOutSchema.enum)
    .pipe(z.transform((e) => excludeSoldOutSchema.transform(e)))
    .optional(),
});

// 판매글 상세 조회, 수정, 삭제 및 구매시 - target: "params"
export const saleIdSchema = z.object({
  saleId: z.coerce.number().int().positive(),
});

// 판매글 생성시 - target: "body"
export const postSaleSchema = z.object({
  userCardId: z.number().int().positive(),
  price: z.number().int().min(0).max(100000),
  totalQuantity: z.number().int().positive().max(10),
  exchangeGrade: z.enum(GRADE_ENUM).nullable().optional(),
  exchangeGenre: z.enum(GENRE_ENUM).nullable().optional(),
  exchangeDescription: z.string().max(200).nullable().optional(),
});

// 판매글 수정시 - target: "body"
export const updateSaleSchema = z
  .object({
    price: z.number().int().min(0).max(100000),
    totalQuantity: z.number().int().positive().max(10),
    exchangeGrade: z.enum(GRADE_ENUM).nullable(),
    exchangeGenre: z.enum(GENRE_ENUM).nullable(),
    exchangeDescription: z.string().max(200).nullable(),
  })
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    '변경 사항을 하나 이상 입력해야 합니다.',
  );

// 구매시 - target: "body"
export const purchaseSchema = z.object({
  expectedPrice: z.number().int().min(0).max(100000),
  quantity: z.number().int().positive().max(10),
});
