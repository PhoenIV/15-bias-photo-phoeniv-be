import z from 'zod';

export const pointDrawSchema = z.object({
  selectedBox: z.literal([1, 2, 3], '상자 번호는 1, 2, 3 중 하나여야 합니다.'),
});
