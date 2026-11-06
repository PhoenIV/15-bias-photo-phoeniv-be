import z from 'zod';

const EXCHANGE_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

// 주소의 :saleId ("1" → 1)
export const saleIdParamSchema = z.object({
  saleId: z.coerce.number().int().positive(),
});

// 주소의 :exchangeId
export const exchangeIdParamSchema = z.object({
  exchangeId: z.coerce.number().int().positive(),
});

// 교환 제시 body
export const createExchangeSchema = z.object({
  offeredUserCardId: z.number().int().positive(),
  description: z.string().max(200).nullable().optional(),
});

// 승인·거절·취소 body
export const updateExchangeSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED'], {
    error: 'APPROVED, REJECTED, CANCELLED 중 하나여야 합니다.',
  }),
});

// 목록 조회 query
export const exchangeListQuerySchema = z.object({
  status: z.enum(EXCHANGE_STATUS).default('PENDING'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
