import { z } from 'zod';

// 알림 목록 조회 Query 검증 스키마
export const notificationQuerySchema = z.object({
  page: z.coerce
    .number({ error: '페이지 번호는 숫자여야 합니다.' })
    .int('페이지 번호는 정수여야 합니다.')
    .min(1, '페이지 번호는 1 이상이어야 합니다.')
    .default(1),

  limit: z.coerce
    .number({ error: '페이지당 개수는 숫자여야 합니다.' })
    .int('페이지당 개수는 정수여야 합니다.')
    .min(1, '페이지당 개수는 최소 1개여야 합니다.')
    .max(30, '페이지당 개수는 최대 30개까지 가능합니다.')
    .default(12),

  unreadOnly: z
    .enum(['true', 'false'], {
      error: '읽음 여부 필터는 true 또는 false여야 합니다.',
    })
    .default('false')
    .transform((value) => value === 'true'),
});
