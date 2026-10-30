import z from 'zod';

export const signUpSchema = z
  .object({
    email: z
      .email('유효한 이메일 형식이 아닙니다.')
      .toLowerCase()
      .max(255, '최대 255자 이내로 입력하세요.'),
    password: z
      .string({ error: '비밀번호는 필수입니다.' })
      .min(8, '비밀번호는 8자 이상이어야 합니다.')
      .max(12, '비밀번호는 12자 이하여야 합니다.')
      .regex(/[A-Za-z]/, '비밀번호는 영문을 1자 이상 포함해야 합니다.')
      .regex(/\d/, '비밀번호는 숫자를 1자 이상 포함해야 합니다.'),
    passwordConfirm: z.string({ error: '비밀번호 확인은 필수입니다.' }),
    nickname: z
      .string({ error: '닉네임은 필수입니다.' })
      .trim()
      .min(2, '닉네임은 2자 이상이어야 합니다.')
      .max(10, '닉네임은 10자 이내이어야 합니다.'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  });
//z.object({})안에 있는 값을 비교하려면 object() 뒤에 .refine()을 붙이면 된다.

export const loginSchema = z.object({
  email: z.email('유효한 이메일 형식이 아닙니다.').toLowerCase(),
  password: z
    .string({ error: '비밀번호는 필수입니다.' })
    .min(1, '비밀번호를 입력해주세요.'),
});
