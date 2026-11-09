import { z } from 'zod';

export const socialLoginQuerySchema = z.object({
  next: z.string().optional().default('/'),
});

export const socialCallbackQuerySchema = z
  .object({
    code: z.string().min(1, '인가 코드가 필요합니다.').optional(),
    state: z.string().min(1, 'state가 필요합니다.'),
    error: z.string().min(1).optional(),
    // error_description: z.string().optional(),
  })
  .refine(({ code, error }) => code || error, {
    message: '인가 코드 또는 공급자 오류가 필요합니다.',
  });
